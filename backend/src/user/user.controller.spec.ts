import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UserController } from './user.controller';

describe('UserController ZiniPay webhook', () => {
  const userService = {
    executePremiumPayment: jest.fn(),
    executePayment: jest.fn(),
  };
  let controller: UserController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UserController(userService as any);
  });

  it('verifies a premium invoice before acknowledging it as paid', async () => {
    userService.executePremiumPayment.mockResolvedValue({ success: true });

    await expect(
      controller.zinipayPaymentWebhook(
        { invoice_id: 'invoice-premium', status: 'true' },
        {},
      ),
    ).resolves.toEqual({
      received: true,
      verified: true,
      purpose: 'premium',
    });

    expect(userService.executePremiumPayment).toHaveBeenCalledWith(
      'invoice-premium',
    );
    expect(userService.executePayment).not.toHaveBeenCalled();
  });

  it('checks the connection order when the invoice is not a premium order', async () => {
    userService.executePremiumPayment.mockResolvedValue({ success: false });
    userService.executePayment.mockResolvedValue({ success: true });

    await expect(
      controller.zinipayPaymentWebhook(
        { invoice_id: 'invoice-connection', status: true },
        {},
      ),
    ).resolves.toEqual({
      received: true,
      verified: true,
      purpose: 'connections',
    });

    expect(userService.executePremiumPayment).toHaveBeenCalledWith(
      'invoice-connection',
    );
    expect(userService.executePayment).toHaveBeenCalledWith(
      'invoice-connection',
    );
  });

  it('supports the documented query-parameter callback format', async () => {
    userService.executePremiumPayment.mockResolvedValue({ success: false });
    userService.executePayment.mockResolvedValue({ success: true });

    await expect(
      controller.zinipayPaymentWebhookQuery({
        invoice_id: 'invoice-query',
        status: 'true',
      }),
    ).resolves.toMatchObject({ received: true, verified: true });
  });

  it('asks ZiniPay to retry a webhook while verification is pending', async () => {
    userService.executePremiumPayment.mockResolvedValue({
      success: false,
      retryable: true,
    });

    await expect(
      controller.zinipayPaymentWebhook(
        { invoice_id: 'invoice-temporary', status: 'true' },
        {},
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(userService.executePayment).not.toHaveBeenCalled();
  });

  it('does not trust a callback that does not report a successful payment', async () => {
    await expect(
      controller.zinipayPaymentWebhook(
        { invoice_id: 'invoice-pending', status: 'false' },
        {},
      ),
    ).resolves.toEqual({ received: true, verified: false });

    expect(userService.executePremiumPayment).not.toHaveBeenCalled();
    expect(userService.executePayment).not.toHaveBeenCalled();
  });

  it('rejects callbacks without a valid invoice reference', async () => {
    await expect(
      controller.zinipayPaymentWebhook({ invoice_id: '', status: 'true' }, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
