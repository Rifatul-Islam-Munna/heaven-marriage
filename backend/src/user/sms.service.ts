import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// Only BulkSMSBD handles SMS. Never place credentials or OTPs in URL query strings or logs.
const SMS_URL = 'https://bulksmsbd.net/api/smsapi';
const BALANCE_URL = 'https://bulksmsbd.net/api/getBalanceApi';

// Only trusted, static provider explanations are used in API errors and logs.
const BULKSMSBD_ERRORS: Record<number, string> = {
  1001: 'Invalid Bangladesh mobile number.',
  1002: 'Sender ID is incorrect, disabled, or not approved. Check BULKSMSBD_SENDER_ID.',
  1003: 'BulkSMSBD requires a valid API key, approved sender ID, number, and message.',
  1005: 'BulkSMSBD reported an internal error. Retry later.',
  1006: 'SMS balance validity is unavailable. Contact BulkSMSBD.',
  1007: 'Insufficient SMS balance. Recharge the BulkSMSBD account.',
  1011: 'BulkSMSBD account or API key was not found. Check BULKSMSBD_API_KEY.',
  1012: 'The selected masking sender ID requires Bengali SMS content.',
  1013: 'BulkSMSBD has no gateway configured for this sender ID and API key.',
  1014: 'Sender type is not available for this API key.',
  1015: 'BulkSMSBD has no active gateway for this sender ID.',
  1016: 'Sender ID has no active SMS pricing. Contact BulkSMSBD.',
  1017: 'Sender ID pricing is missing. Contact BulkSMSBD.',
  1018: 'The BulkSMSBD account is disabled.',
  1019: 'The BulkSMSBD sender pricing is disabled.',
  1020: 'The parent SMS account is missing.',
  1021: 'The parent SMS account has no active sender pricing.',
  1031: 'The BulkSMSBD account is not verified.',
  1032: 'The backend server IP is not whitelisted in BulkSMSBD.',
};

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly senderId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey =
      this.configService.get<string>('BULKSMSBD_API_KEY')?.trim() || '';
    this.senderId =
      this.configService.get<string>('BULKSMSBD_SENDER_ID')?.trim() || '';

    if (!this.apiKey || !this.senderId) {
      this.logger.warn(
        'BulkSMSBD is not configured: BULKSMSBD_API_KEY and BULKSMSBD_SENDER_ID are required.',
      );
    }
  }

  private ensureConfigured() {
    if (!this.apiKey || !this.senderId) {
      throw new ServiceUnavailableException(
        'BulkSMSBD is not configured. Set BULKSMSBD_API_KEY and BULKSMSBD_SENDER_ID on the backend.',
      );
    }
  }

  private formatPhoneNumber(value: string): string {
    const cleaned = String(value || '')
      .replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)))
      .replace(/[\s()-]/g, '');
    let local = cleaned;
    if (/^\+8801[3-9]\d{8}$/.test(cleaned)) local = '0' + cleaned.slice(4);
    else if (/^8801[3-9]\d{8}$/.test(cleaned)) local = '0' + cleaned.slice(3);
    else if (/^1[3-9]\d{8}$/.test(cleaned)) local = '0' + cleaned;

    if (!/^01[3-9]\d{8}$/.test(local)) {
      throw new BadRequestException(
        'Enter a valid Bangladesh mobile number (for example, 01712345678).',
      );
    }
    return '88' + local;
  }

  private responseCode(payload: unknown): number | null {
    let decoded = payload;
    if (typeof decoded === 'string') {
      try {
        decoded = JSON.parse(decoded);
      } catch {
        return null;
      }
    }
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
      return null;
    }
    const value = (decoded as { response_code?: unknown }).response_code;
    const code =
      typeof value === 'number' || typeof value === 'string'
        ? Number(value)
        : NaN;
    return Number.isInteger(code) ? code : null;
  }

  private providerRejected(code: number): never {
    this.logger.warn('BulkSMSBD rejected SMS: response_code=' + code);
    throw new ServiceUnavailableException(
      'BulkSMSBD rejected SMS (code ' + code + '): ' +
        (BULKSMSBD_ERRORS[code] ||
          'Check your sender ID, API permissions, balance, and IP whitelist.'),
    );
  }

  private requestFailed(error: unknown): never {
    if (error instanceof HttpException) throw error;

    const failure = error as {
      response?: { status?: number; data?: unknown };
      code?: string;
    };
    const providerCode = this.responseCode(failure?.response?.data);
    if (providerCode !== null && providerCode !== 202) {
      this.providerRejected(providerCode);
    }
    const httpStatus = Number(failure?.response?.status) || 0;
    const transport = String(failure?.code || '');
    const timeout = transport === 'ECONNABORTED' || transport === 'ETIMEDOUT';
    const category = timeout
      ? 'timeout'
      : ['ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED'].includes(transport)
        ? 'network'
        : 'other';
    // Never log the raw Axios error: it contains the request body and API key.
    this.logger.warn(
      'BulkSMSBD request failed: http_status=' +
        (httpStatus || 'none') +
        '; category=' +
        category,
    );
    if (timeout) {
      throw new ServiceUnavailableException(
        'BulkSMSBD timed out. Please retry later; delivery status is unknown.',
      );
    }
    if (httpStatus === 401 || httpStatus === 403) {
      throw new ServiceUnavailableException(
        'BulkSMSBD denied the request (HTTP ' +
          httpStatus +
          '). Check the API key, sender approval, and backend IP whitelist.',
      );
    }
    throw new ServiceUnavailableException(
      'BulkSMSBD could not accept the SMS request' +
        (httpStatus ? ' (HTTP ' + httpStatus + ')' : '') +
        '. Check backend SMS logs and the BulkSMSBD dashboard.',
    );
  }

  /** Submit a single SMS through BulkSMSBD only. Code 202 confirms submission, not delivery. */
  async sendSms(sendSmsDto: { number: string; message: string }) {
    this.ensureConfigured();
    const number = this.formatPhoneNumber(sendSmsDto.number);
    const message = sendSmsDto.message;
    if (typeof message !== 'string' || !message.trim()) {
      throw new BadRequestException('SMS message is required.');
    }

    const body = new URLSearchParams({
      api_key: this.apiKey,
      senderid: this.senderId,
      number,
      message,
    });

    let payload: unknown;
    try {
      const response = await firstValueFrom(
        this.httpService.post(SMS_URL, body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
        }),
      );
      payload = response.data;
    } catch (error) {
      this.requestFailed(error);
    }

    const code = this.responseCode(payload);
    if (code !== 202) {
      if (code !== null) this.providerRejected(code);
      this.logger.warn('BulkSMSBD returned an unrecognized response format.');
      throw new ServiceUnavailableException(
        'BulkSMSBD returned an invalid response. Check backend SMS logs.',
      );
    }
    this.logger.log('BulkSMSBD accepted SMS submission: response_code=202');
    return { success: true, message: 'SMS submitted to BulkSMSBD successfully' };
  }

  async sendOtpSms(number: string, otp: string) {
    return this.sendSms({
      number,
      message:
        'আপনার Niqaha OTP: ' +
        otp +
        '। ১০ মিনিটের মধ্যে ব্যবহার করুন। কারও সঙ্গে শেয়ার করবেন না।',
    });
  }

  /** Read-only provider balance check; does not send or charge any SMS. */
  async checkBalance() {
    this.ensureConfigured();
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          BALANCE_URL,
          new URLSearchParams({ api_key: this.apiKey }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000,
          },
        ),
      );
      const payload =
        typeof response.data === 'string'
          ? JSON.parse(response.data)
          : response.data;
      const code = this.responseCode(payload);
      if (code !== null && code !== 202) this.providerRejected(code);
      const balance = Number(payload?.balance);
      if (!Number.isFinite(balance)) {
        throw new ServiceUnavailableException(
          'BulkSMSBD did not return a valid balance.',
        );
      }
      return { success: true, balance };
    } catch (error) {
      this.requestFailed(error);
    }
  }
}
