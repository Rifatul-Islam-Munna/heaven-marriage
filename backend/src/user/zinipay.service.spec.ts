import type { HttpService } from '@nestjs/axios';
import type { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { ZiniPayService } from './zinipay.service';

describe('ZiniPayService', () => {
  const values: Record<string, string> = {
    ZINIPAY_API_KEY: 'sandbox_test_8f4c9a2e7b31',
    ZINIPAY_API_BASE_URL: 'https://api.zinipay.com',
    FRONTEND_URL: 'https://niqaha.com',
    BACKEND_URL: 'https://api.niqaha.com',
  };

  function setup(
    data: Record<string, unknown> = {
      status: true,
      payment_url: 'https://secure.zinipay.com/payment/invoice-123',
    },
    overrides: Record<string, string> = {},
  ) {
    const config = {
      get: jest.fn((key: string) => ({ ...values, ...overrides })[key]),
    };
    const http = { post: jest.fn().mockReturnValue(of({ data })) };
    return {
      service: new ZiniPayService(
        http as unknown as HttpService,
        config as unknown as ConfigService,
      ),
      http,
      config,
    };
  }

  it('creates a hosted invoice with the documented API key header and safe return/webhook URLs', async () => {
    const ctx = setup();
    const invoice = await ctx.service.createInvoice(
      1250,
      'order-123',
      'premium',
      {
        name: 'Member Name',
        email: 'member@example.test',
        customerId: 'customer-123',
      },
    );

    expect(invoice).toEqual({
      paymentUrl: 'https://secure.zinipay.com/payment/invoice-123',
      paymentId: 'invoice-123',
    });
    const [url, payload, options] = ctx.http.post.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
      { headers: Record<string, string>; timeout: number },
    ];
    expect(url).toBe('https://api.zinipay.com/v1/payment/create');
    expect(payload).toMatchObject({
      cus_name: 'Member Name',
      cus_email: 'member@example.test',
      amount: 1250,
      metadata: {
        order_id: 'order-123',
        customer_id: 'customer-123',
        purpose: 'premium',
      },
      redirect_url:
        'https://niqaha.com/payment/successfull?purpose=premium&order_id=order-123',
      cancel_url:
        'https://niqaha.com/payment/failed?purpose=premium&order_id=order-123',
      webhook_url: 'https://api.niqaha.com/user/zinipay-payment-webhook',
    });
    expect(options.headers['zini-api-key']).toBe('sandbox_test_8f4c9a2e7b31');
    expect(options.timeout).toBe(15000);
  });

  it('uses the documented val_id invoice reference when the checkout URL does not expose one', async () => {
    const ctx = setup({
      status: true,
      payment_url: 'https://secure.zinipay.com/checkout/session',
      val_id: 'invoice-from-val-id',
    });
    await expect(
      ctx.service.createInvoice(500, 'order-val-id', 'connections'),
    ).resolves.toMatchObject({ paymentId: 'invoice-from-val-id' });
  });

  it('normalizes a host-only API base URL to HTTPS', async () => {
    const ctx = setup(undefined, { ZINIPAY_API_BASE_URL: 'api.zinipay.com' });
    await ctx.service.createInvoice(500, 'order-base-url', 'connections');
    const [url] = ctx.http.post.mock.calls[0] as unknown as [string];
    expect(url).toBe('https://api.zinipay.com/v1/payment/create');
  });

  it('rejects an insecure HTTP API base URL', () => {
    expect(() =>
      setup(undefined, {
        ZINIPAY_API_BASE_URL: 'http://api.zinipay.com',
      }),
    ).toThrow('ZiniPay API base URL must be a valid HTTPS URL');
  });

  it('uses the existing public FRONTEND_URL and BACKEND_URL for payment callbacks', async () => {
    const ctx = setup(undefined, {
      FRONTEND_URL: 'https://staging.niqaha.com',
      BACKEND_URL: 'https://api-staging.niqaha.com',
    });
    await ctx.service.createInvoice(500, 'order-staging', 'connections');
    const [, payload] = ctx.http.post.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];
    expect(payload.redirect_url).toContain('https://staging.niqaha.com/');
    expect(payload.webhook_url).toBe(
      'https://api-staging.niqaha.com/user/zinipay-payment-webhook',
    );
  });

  it('reports exactly which public callback configuration values are missing', async () => {
    const ctx = setup(undefined, {
      FRONTEND_URL: '',
      BACKEND_URL: '',
    });
    expect(ctx.service.configurationStatus()).toMatchObject({
      apiKeyConfigured: true,
      frontendUrlConfigured: false,
      backendUrlConfigured: false,
    });
    await expect(
      ctx.service.createInvoice(500, 'order-missing-callbacks', 'connections'),
    ).rejects.toThrow('frontendUrlConfigured, backendUrlConfigured');
  });

  it("uses the project's public Niqaha URLs when local FRONTEND_URL and BACKEND_URL are localhost", async () => {
    const ctx = setup(undefined, {
      FRONTEND_URL: 'http://localhost:3000',
      BACKEND_URL: 'http://localhost:4000',
    });
    expect(ctx.service.isConfigured()).toBe(true);
    await ctx.service.createInvoice(500, 'order-local', 'connections');
    const [, payload] = ctx.http.post.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];
    expect(payload.redirect_url).toContain('https://niqaha.com/');
    expect(payload.webhook_url).toBe(
      'https://api.niqaha.com/user/zinipay-payment-webhook',
    );
  });

  it('verifies an invoice through the backend-only verify endpoint', async () => {
    const result = {
      invoice_id: 'invoice-123',
      status: 'COMPLETED',
      amount: 1250,
    };
    const ctx = setup(result);
    await expect(ctx.service.verifyInvoice('invoice-123')).resolves.toEqual(
      result,
    );
    const [url, payload, options] = ctx.http.post.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
      { headers: Record<string, string> },
    ];
    expect(url).toBe('https://api.zinipay.com/v1/payment/verify');
    expect(payload).toEqual({ invoice_id: 'invoice-123' });
    expect(options.headers['zini-api-key']).toBe('sandbox_test_8f4c9a2e7b31');
  });

  it('rejects checkout URLs outside ZiniPay HTTPS domains', async () => {
    const ctx = setup({
      status: true,
      payment_url: 'https://not-zinipay.example/payment/invoice-123',
    });
    await expect(
      ctx.service.createInvoice(500, 'order-1', 'connections'),
    ).rejects.toThrow('untrusted checkout URL');
  });

  it('requires the server API key and configured return/webhook URLs', () => {
    expect(
      setup(undefined, { ZINIPAY_API_KEY: '' }).service.isConfigured(),
    ).toBe(false);
    expect(setup(undefined, { BACKEND_URL: '' }).service.isConfigured()).toBe(
      false,
    );
    expect(setup(undefined, { FRONTEND_URL: '' }).service.isConfigured()).toBe(
      false,
    );
  });
});
