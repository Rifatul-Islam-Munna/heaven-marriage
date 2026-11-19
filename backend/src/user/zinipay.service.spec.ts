import type { HttpService } from '@nestjs/axios';
import type { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ZiniPayService } from './zinipay.service';

describe('ZiniPayService', () => {
  const customer = { email: 'member@example.test' };
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

  it('creates a hosted invoice using only the documented headers and selected fields without metadata', async () => {
    const ctx = setup();
    const invoice = await ctx.service.createInvoice(
      1250,
      'order-123',
      'premium',
      {
        name: 'Member Name',
        email: 'member@example.test',
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
    expect(payload).toEqual({
      cus_name: 'Member Name',
      cus_email: 'member@example.test',
      amount: 1250,
      redirect_url:
        'https://niqaha.com/payment/successfull?purpose=premium&order_id=order-123',
      cancel_url:
        'https://niqaha.com/payment/failed?purpose=premium&order_id=order-123',
      webhook_url: 'https://api.niqaha.com/user/zinipay-payment-webhook',
    });
    expect(options.headers).toEqual({
      'Content-Type': 'application/json',
      'zini-api-key': 'sandbox_test_8f4c9a2e7b31',
    });
    expect(options.timeout).toBe(15000);
  });

  it.each(['connections', 'premium'] as const)(
    'keeps %s order references in return URLs without metadata or absent customer name',
    async (purpose) => {
      const ctx = setup();
      await ctx.service.createInvoice(600, 'order-123', purpose, customer);
      const [, payload] = ctx.http.post.mock.calls[0] as unknown as [
        string,
        Record<string, unknown>,
      ];
      expect(payload).toEqual({
        cus_email: customer.email,
        amount: 600,
        redirect_url:
          `https://niqaha.com/payment/successfull?purpose=${purpose}&order_id=order-123`,
        cancel_url:
          `https://niqaha.com/payment/failed?purpose=${purpose}&order_id=order-123`,
        webhook_url: 'https://api.niqaha.com/user/zinipay-payment-webhook',
      });
    },
  );

  it.each([
    { label: 'missing', input: {}, expected: {} },
    { label: 'empty', input: { name: '', email: '' }, expected: {} },
    { label: 'blank', input: { name: '   ', email: '   ' }, expected: {} },
    { label: 'name only', input: { name: ' Member ' }, expected: { cus_name: 'Member' } },
    { label: 'email only', input: { email: ' member@example.test ' }, expected: { cus_email: 'member@example.test' } },
  ])(
    'omits absent customer fields for $label details without blocking checkout',
    async ({ input, expected }) => {
      const ctx = setup();
      await expect(
        ctx.service.createInvoice(200, 'order-optional', 'connections', input),
      ).resolves.toMatchObject({ paymentId: 'invoice-123' });
      expect(ctx.http.post.mock.calls[0][1]).toEqual({
        ...expected,
        amount: 200,
        redirect_url:
          'https://niqaha.com/payment/successfull?purpose=connections&order_id=order-optional',
        cancel_url:
          'https://niqaha.com/payment/failed?purpose=connections&order_id=order-optional',
        webhook_url: 'https://api.niqaha.com/user/zinipay-payment-webhook',
      });
    },
  );

  it('trims customer email before sending it to the API', async () => {
    const ctx = setup();
    await ctx.service.createInvoice(200, 'order-email', 'connections', {
      email: ' member@example.test ',
    });
    expect(ctx.http.post.mock.calls[0][1]).toMatchObject({
      cus_email: 'member@example.test',
    });
  });

  it('logs provider validation fields without logging the submitted values or API key', async () => {
    const ctx = setup();
    const failure = {
      isAxiosError: true,
      code: 'ERR_BAD_REQUEST',
      response: {
        status: 400,
        data: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          errors: [{ field: 'body.cus_email', message: 'Invalid email format', value: customer.email }],
        },
      },
    };
    ctx.http.post.mockReturnValue(throwError(() => failure));
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    try {
      await expect(
        ctx.service.createInvoice(200, 'order-email', 'connections', customer),
      ).rejects.toBe(failure);
      const output = JSON.stringify(log.mock.calls);
      expect(output).toContain('body.cus_email');
      expect(output).toContain('Invalid email format');
      expect(output).not.toContain(customer.email);
      expect(output).not.toContain(values.ZINIPAY_API_KEY);
    } finally {
      log.mockRestore();
    }
  });

  it('uses the documented val_id invoice reference when the checkout URL does not expose one', async () => {
    const ctx = setup({
      status: true,
      payment_url: 'https://secure.zinipay.com/checkout/session',
      val_id: 'invoice-from-val-id',
    });
    await expect(
      ctx.service.createInvoice(500, 'order-val-id', 'connections', customer),
    ).resolves.toMatchObject({ paymentId: 'invoice-from-val-id' });
  });

  it('normalizes a host-only API base URL to HTTPS', async () => {
    const ctx = setup(undefined, { ZINIPAY_API_BASE_URL: 'api.zinipay.com' });
    await ctx.service.createInvoice(500, 'order-base-url', 'connections', customer);
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
    await ctx.service.createInvoice(500, 'order-staging', 'connections', customer);
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
    await ctx.service.createInvoice(500, 'order-local', 'connections', customer);
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
      ctx.service.createInvoice(500, 'order-1', 'connections', customer),
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
