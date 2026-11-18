import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse, isAxiosError } from 'axios';
import { lastValueFrom } from 'rxjs';

export type ZiniPayPurpose = 'connections' | 'premium';

export type ZiniPayCustomer = {
  name?: string;
  email?: string;
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
    this.frontendUrl =
      this.configService.get<string>('ZINIPAY_FRONTEND_URL') ||
      this.configService.get<string>('FRONTEND_URL') ||
      '';
    this.backendUrl =
      this.configService.get<string>('ZINIPAY_BACKEND_URL') ||
      this.configService.get<string>('BACKEND_URL') ||
      '';
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

  isConfigured(): boolean {
    return Boolean(
      this.apiKey &&
      this.isPublicHttpsUrl(this.frontendUrl) &&
      this.isPublicHttpsUrl(this.backendUrl),
    );
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
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
      throw new Error('ZiniPay API key and frontend/backend URLs are required');
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

    const payload = {
      ...(customer.name ? { cus_name: customer.name.slice(0, 120) } : {}),
      ...(customer.email ? { cus_email: customer.email.slice(0, 254) } : {}),
      amount,
      metadata: { order_id: orderId, purpose },
      redirect_url: redirectUrl.toString(),
      cancel_url: cancelUrl.toString(),
      webhook_url: backendBase + '/user/zinipay-payment-webhook',
    };

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
        throw new Error('ZiniPay did not confirm invoice creation');
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
      const status = isAxiosError(error) ? error.response?.status : undefined;
      this.logger.error(
        'ZiniPay invoice creation failed',
        status ? 'HTTP ' + status : undefined,
      );
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
