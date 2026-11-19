import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse, isAxiosError } from 'axios';
import { lastValueFrom } from 'rxjs';

export type ZiniPayPurpose = 'connections' | 'premium';

export type ZiniPayCustomer = {
  name?: string | null;
  email?: string | null;
};

export type ZiniPayInvoice = {
  paymentUrl: string;
  paymentId: string;
};

export type ZiniPayVerification = {
  invoice_id?: string;
  amount?: number | string;
  status?: string;
  transaction_id?: string;
};

type ZiniPayCreateResponse = {
  status?: boolean | string;
  payment_url?: string;
  invoice_id?: string;
  invoiceId?: string;
  val_id?: string;
};

@Injectable()
export class ZiniPayService {
  private readonly logger = new Logger(ZiniPayService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly frontendUrl: string;
  private readonly backendUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('ZINIPAY_API_KEY') || '';
    const configuredBaseUrl =
      this.configService.get<string>('ZINIPAY_API_BASE_URL') ||
      'https://api.zinipay.com';
    const hasUrlScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(configuredBaseUrl);
    if (hasUrlScheme && !/^https:\/\//i.test(configuredBaseUrl)) {
      throw new Error('ZiniPay API base URL must be a valid HTTPS URL');
    }
    const normalizedBaseUrl = hasUrlScheme
      ? configuredBaseUrl
      : `https://${configuredBaseUrl}`;
    let parsedBaseUrl: URL;
    try {
      parsedBaseUrl = new URL(normalizedBaseUrl);
    } catch {
      throw new Error('ZiniPay API base URL must be a valid HTTPS URL');
    }
    if (
      parsedBaseUrl.protocol !== 'https:' ||
      parsedBaseUrl.username ||
      parsedBaseUrl.password
    ) {
      throw new Error('ZiniPay API base URL must be a valid HTTPS URL');
    }
    this.baseUrl = parsedBaseUrl.toString().replace(/\/+$/, '');
    // Reuse the application's existing URL configuration. Local development
    // URLs cannot be sent to ZiniPay, so map localhost to this project's public
    // brand/API origins without adding duplicate environment variables.
    const configuredFrontend =
      this.configService.get<string>('FRONTEND_URL') || '';
    const configuredBackend =
      this.configService.get<string>('BACKEND_URL') || '';
    this.frontendUrl = this.isLocalUrl(configuredFrontend)
      ? 'https://niqaha.com'
      : configuredFrontend;
    this.backendUrl = this.isLocalUrl(configuredBackend)
      ? 'https://api.niqaha.com'
      : configuredBackend;
  }

  private isLocalUrl(value: string): boolean {
    try {
      const parsed = new URL(value.split(',')[0].trim());
      return (
        ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(
          parsed.hostname,
        ) || parsed.hostname.endsWith('.localhost')
      );
    } catch {
      return false;
    }
  }

  private isPublicHttpsUrl(value: string): boolean {
    try {
      const parsed = new URL(value.split(',')[0].trim());
      return (
        parsed.protocol === 'https:' &&
        !parsed.username &&
        !parsed.password &&
        !['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(
          parsed.hostname,
        ) &&
        !parsed.hostname.endsWith('.localhost')
      );
    } catch {
      return false;
    }
  }

  configurationStatus() {
    return {
      apiKeyConfigured: Boolean(this.apiKey),
      frontendUrlConfigured: this.isPublicHttpsUrl(this.frontendUrl),
      backendUrlConfigured: this.isPublicHttpsUrl(this.backendUrl),
      apiBaseUrlConfigured: Boolean(this.baseUrl),
    };
  }

  isConfigured(): boolean {
    const status = this.configurationStatus();
    return (
      status.apiKeyConfigured &&
      status.frontendUrlConfigured &&
      status.apiBaseUrlConfigured
    );
  }

  private gatewayResponseSummary(data: unknown): string {
    if (typeof data === 'string') return data.slice(0, 400);
    if (data === null || data === undefined) return 'empty response';
    if (typeof data === 'number' || typeof data === 'boolean')
      return String(data);
    if (typeof data !== 'object') return 'unrecognized response type';
    const source = data as Record<string, unknown>;
    const summary: Record<string, unknown> = {};
    for (const key of [
      'message',
      'error',
      'code',
      'status',
      'details',
      'reason',
    ]) {
      const value = source[key];
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      )
        summary[key] = String(value).slice(0, 250);
    }
    if (Array.isArray(source.errors)) {
      summary.errors = source.errors.slice(0, 10).flatMap((error: unknown) => {
        if (!error || typeof error !== 'object') return [];
        const item = error as Record<string, unknown>;
        if (typeof item.field !== 'string' || typeof item.message !== 'string')
          return [];
        return [{ field: item.field.slice(0, 150), message: item.message.slice(0, 250) }];
      });
    }
    return Object.keys(summary).length
      ? JSON.stringify(summary)
      : 'Gateway returned an unrecognized error response';
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      'zini-api-key': this.apiKey,
    };
  }

  async createInvoice(
    amount: number,
    orderId: string,
    purpose: ZiniPayPurpose,
    customer: ZiniPayCustomer = {},
  ): Promise<ZiniPayInvoice> {
    if (!this.isConfigured()) {
      const status = this.configurationStatus();
      const missing = Object.entries(status)
        .filter(([key, configured]) => key !== 'backendUrlConfigured' && !configured)
        .map(([key]) => key);
      this.logger.error(
        'ZiniPay configuration incomplete: ' + missing.join(', '),
      );
      throw new Error(
        'ZiniPay configuration incomplete: ' + missing.join(', '),
      );
    }
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !orderId ||
      orderId.length > 150
    ) {
      throw new Error('Invalid ZiniPay invoice details');
    }

    const frontendBase = this.frontendUrl
      .split(',')[0]
      .trim()
      .replace(/\/+$/, '');
    const backendBase = this.backendUrl
      .split(',')[0]
      .trim()
      .replace(/\/+$/, '');
    const redirectUrl = new URL('/payment/successfull', frontendBase);
    redirectUrl.searchParams.set('purpose', purpose);
    redirectUrl.searchParams.set('order_id', orderId);

    const cancelUrl = new URL('/payment/failed', frontendBase);
    cancelUrl.searchParams.set('purpose', purpose);
    cancelUrl.searchParams.set('order_id', orderId);

    const webhookUrl = this.isPublicHttpsUrl(backendBase)
      ? backendBase + '/user/zinipay-payment-webhook'
      : undefined;
    const optionalFields = Object.fromEntries(
      Object.entries({
        cus_name: customer.name,
        cus_email: customer.email,
        cancel_url: cancelUrl.toString(),
        webhook_url: webhookUrl,
      }).flatMap(([field, value]) => {
        const text = typeof value === 'string' ? value.trim() : '';
        if (!text) return [];
        return [[field, field === 'cus_name' ? text.slice(0, 120) : text]];
      }),
    );
    const payload = {
      amount,
      redirect_url: redirectUrl.toString(),
      ...optionalFields,
    };

    // Log request shape only (never customer PII or API credentials) to make
    // provider-side VALIDATION_ERROR responses diagnosable in production.
    this.logger.log(
      `Creating ZiniPay invoice orderId=${orderId} purpose=${purpose} amount=${amount} ` +
        `fields=${Object.keys(payload).join(',')} ` +
        `redirectHost=${redirectUrl.hostname} webhookHost=${webhookUrl ? new URL(webhookUrl).hostname : 'omitted'}`,
    );

    try {
      const response: AxiosResponse<ZiniPayCreateResponse> =
        await lastValueFrom(
          this.httpService.post<ZiniPayCreateResponse>(
            this.baseUrl + '/v1/payment/create',
            payload,
            { headers: this.headers(), timeout: 15000 },
          ),
        );

      const data = response.data;
      if (data?.status !== true && data?.status !== 'true') {
        const summary = this.gatewayResponseSummary(data);
        this.logger.error('ZiniPay rejected invoice creation: ' + summary);
        throw new Error('ZiniPay rejected invoice creation: ' + summary);
      }

      const paymentUrl =
        typeof data.payment_url === 'string' ? data.payment_url : '';
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(paymentUrl);
      } catch {
        throw new Error('ZiniPay returned an invalid checkout URL');
      }

      const trustedHost =
        parsedUrl.hostname === 'secure.zinipay.com' && !parsedUrl.port;
      if (
        parsedUrl.protocol !== 'https:' ||
        !trustedHost ||
        parsedUrl.username ||
        parsedUrl.password
      ) {
        throw new Error('ZiniPay returned an untrusted checkout URL');
      }

      const pathInvoiceId =
        parsedUrl.pathname.split('/').filter(Boolean).at(-1) || '';
      const paymentId = String(
        data.invoice_id || data.invoiceId || data.val_id || pathInvoiceId,
      );
      if (!paymentId || paymentId.length > 150) {
        throw new Error('ZiniPay response did not include a valid invoice ID');
      }

      return { paymentUrl, paymentId };
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        const code = error.code || 'UNKNOWN';
        const summary =
          error.response?.data !== undefined
            ? this.gatewayResponseSummary(error.response.data)
            : (error.message || 'No response body').slice(0, 400);
        this.logger.error(
          `ZiniPay invoice creation failed: HTTP ${status ?? 'NO_RESPONSE'} code=${code} response=${summary}`,
        );
      } else {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          'ZiniPay invoice creation failed: ' + message.slice(0, 600),
        );
      }
      throw error;
    }
  }

  async verifyInvoice(invoiceId: string): Promise<ZiniPayVerification> {
    if (!this.apiKey) throw new Error('ZiniPay API key is not configured');
    if (!invoiceId || invoiceId.length > 150)
      throw new Error('Invalid ZiniPay invoice ID');

    const response: AxiosResponse<ZiniPayVerification> = await lastValueFrom(
      this.httpService.post<ZiniPayVerification>(
        this.baseUrl + '/v1/payment/verify',
        { invoice_id: invoiceId },
        { headers: this.headers(), timeout: 15000 },
      ),
    );
    return response.data;
  }
}
