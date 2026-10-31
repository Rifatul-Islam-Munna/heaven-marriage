import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { SmsService } from './sms.service';

export function normalizePhone(value: string) {
  const v = String(value || '')
    .replace(/[০-৯]/g, (n) => String('০১২৩৪৫৬৭৮৯'.indexOf(n)))
    .replace(/[\s()-]/g, '');
  if (/^01[3-9]\d{8}$/.test(v)) return v;
  if (/^\+8801[3-9]\d{8}$/.test(v)) return '0' + v.slice(4);
  if (!/^\+[1-9]\d{6,14}$/.test(v))
    throw new BadRequestException(
      'সঠিক আন্তর্জাতিক নম্বর (+country code) লিখুন',
    );
  return v;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private config: ConfigService,
    private sms: SmsService,
  ) {}

  /**
   * The Resend SDK returns { data, error } rather than throwing for provider
   * rejections. Report safe, actionable error categories without ever exposing
   * the API key, request headers, recipient, or OTP in application logs.
   */
  private resendFailure(error: {
    name?: string;
    statusCode?: number | null;
  }): ServiceUnavailableException {
    const name = String(error.name || 'unknown');
    const status = Number(error.statusCode || 0);
    const type = name.toLowerCase();
    this.logger.warn(
      'Resend rejected an email: code=' +
        name.slice(0, 60) +
        '; status=' +
        (status || 'unknown'),
    );
    if (status === 401 || type.includes('api_key')) {
      return new ServiceUnavailableException(
        'Resend rejected the API key. Check RESEND_API_KEY and its permissions.',
      );
    }
    if (
      status === 403 ||
      type.includes('not_verified') ||
      type.includes('permission')
    ) {
      return new ServiceUnavailableException(
        'Resend blocked the sender. EMAIL_FROM must use a domain verified for sending in Resend, and the API key must have permission for it.',
      );
    }
    if (status === 422 || type.includes('validation')) {
      return new ServiceUnavailableException(
        'Resend rejected an email address. Check EMAIL_FROM and the recipient address.',
      );
    }
    if (
      status === 429 ||
      type.includes('rate_limit') ||
      type.includes('quota')
    ) {
      return new ServiceUnavailableException(
        'Resend sending limit reached. Check the Resend dashboard and retry later.',
      );
    }
    return new ServiceUnavailableException(
      'Resend rejected this email (' +
        name.slice(0, 60) +
        '). Check Resend > Logs.',
    );
  }

  async send(subject: string, text: string, title = 'Niqaha.com verification') {
    if (subject.includes('@')) {
      const key = this.config.get<string>('RESEND_API_KEY')?.trim();
      const from = this.config.get<string>('EMAIL_FROM')?.trim();
      if (!key || !from)
        throw new ServiceUnavailableException(
          'Email service is not configured. Check RESEND_API_KEY and EMAIL_FROM.',
        );
      try {
        const { data, error } = await new Resend(key).emails.send({
          from,
          to: [subject],
          subject: title,
          text,
        });
        if (error) throw this.resendFailure(error);
        if (!data?.id) {
          this.logger.warn('Resend did not confirm email submission');
          throw new ServiceUnavailableException(
            'Resend did not confirm email submission. Check Resend > Logs.',
          );
        }
        return;
      } catch (error) {
        if (error instanceof HttpException) throw error;
        this.logger.warn('Could not contact Resend');
        throw new ServiceUnavailableException(
          'Cannot connect to Resend. Check the backend network and try again.',
        );
      }
    }

    const phone = normalizePhone(subject);
    if (phone.startsWith('01')) {
      await this.sms.sendSms({ number: phone, message: text });
      return;
    }
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID'),
      token = this.config.get<string>('TWILIO_AUTH_TOKEN'),
      from = this.config.get<string>('TWILIO_FROM');
    if (!sid || !token || !from)
      throw new ServiceUnavailableException(
        'International SMS is not configured. Please use email verification.',
      );
    const r = await fetch(
      'https://api.twilio.com/2010-04-01/Accounts/' +
        encodeURIComponent(sid) +
        '/Messages.json',
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' + Buffer.from(sid + ':' + token).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, From: from, Body: text }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!r.ok)
      throw new ServiceUnavailableException(
        'SMS delivery failed. Please retry.',
      );
  }
}
