import { PlatformService } from './platform.service';
import { UserType } from './entities/user.entity';

describe('Premium ZiniPay payment security', () => {
  const paymentId = 'payment-123';
  const order = {
    id: 'order-123',
    userId: '507f1f77bcf86cd799439011',
    caseId: 'case-123',
    amount: 1250,
    currency: 'BDT',
    paymentId,
    status: 'pending',
  };
  const result = {
    invoice_id: paymentId,
    status: 'COMPLETED',
    amount: '1250',
    transaction_id: 'TRX001',
  };

  function setup(payment: any = result, savedOrder: any = order) {
    const orders = {
      findOne: jest.fn().mockResolvedValue(savedOrder),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    const cases = {
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    const userCollection = {
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      findOne: jest.fn().mockResolvedValue({ creditedPaymentIds: [paymentId] }),
    };
    const users = { collection: userCollection };
    const db = {
      collection: jest.fn((name: string) =>
        name === 'premium_orders' ? orders : cases,
      ),
    };
    const ziniPay = {
      verifyInvoice: jest.fn().mockResolvedValue(payment),
    };
    const service = Object.create(PlatformService.prototype) as PlatformService;
    Object.assign(service, { db, users, ziniPay, audit: jest.fn() });
    return { service, orders, cases, userCollection, ziniPay };
  }

  it('does not activate premium for an unknown order', async () => {
    const ctx = setup(result, null);
    expect(await ctx.service.executePremiumPayment(paymentId)).toEqual({
      success: false,
    });
    expect(ctx.ziniPay.verifyInvoice).not.toHaveBeenCalled();
    expect(ctx.userCollection.updateOne).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...result, invoice_id: 'another-invoice' }, 'wrong invoice'],
    [{ ...result, amount: '1000' }, 'incorrect amount'],
    [{ ...result, status: 'PENDING' }, 'pending payment'],
    [{ ...result, status: 'UNKNOWN' }, 'unknown status'],
  ])('rejects an unverified invoice (%s: %s)', async (response) => {
    const ctx = setup(response);
    expect(await ctx.service.executePremiumPayment(paymentId)).toMatchObject({
      success: false,
    });
    expect(ctx.userCollection.updateOne).not.toHaveBeenCalled();
    expect(ctx.orders.updateOne).not.toHaveBeenCalled();
    expect(ctx.cases.updateOne).not.toHaveBeenCalled();
  });

  it('marks a provider-confirmed failed invoice as failed without activating premium', async () => {
    const ctx = setup({ ...result, status: 'FAILED' });
    expect(await ctx.service.executePremiumPayment(paymentId)).toEqual({
      success: false,
    });
    expect(ctx.orders.updateOne).toHaveBeenCalledWith(
      { paymentId, status: 'pending' },
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'failed' }),
      }),
    );
    expect(ctx.userCollection.updateOne).not.toHaveBeenCalled();
    expect(ctx.cases.updateOne).not.toHaveBeenCalled();
  });

  it('returns a retryable result when ZiniPay verification is temporarily unavailable', async () => {
    const ctx = setup();
    ctx.ziniPay.verifyInvoice.mockRejectedValue(
      new Error('temporary provider outage'),
    );
    await expect(ctx.service.executePremiumPayment(paymentId)).resolves.toEqual(
      { success: false, retryable: true },
    );
    expect(ctx.userCollection.updateOne).not.toHaveBeenCalled();
  });

  it('activates only the verified paid member, retaining the package snapshot', async () => {
    const ctx = setup();
    expect(await ctx.service.executePremiumPayment(paymentId)).toEqual({
      success: true,
    });
    const [filter, update] = ctx.userCollection.updateOne.mock.calls[0];
    expect(filter.role).toBe(UserType.USER);
    expect(filter.creditedPaymentIds).toEqual({ $ne: paymentId });
    expect(update.$set).toMatchObject({
      isSubscriber: true,
      premiumService: expect.objectContaining({
        source: 'zinipay',
        stage: 'onboarding',
        assistedAllowance: 3,
        includedConnections: 0,
      }),
    });
    expect(update.$inc).toBeUndefined();
    expect(ctx.orders.updateOne).toHaveBeenCalledWith(
      { paymentId, status: 'pending' },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'paid',
          transactionId: 'TRX001',
        }),
      }),
    );
    expect(ctx.cases.updateOne).toHaveBeenCalledTimes(1);
  });

  it('grants included wallet credits once when the saved package specifies them', async () => {
    const ctx = setup(result, {
      ...order,
      premiumSnapshot: {
        includedConnections: 2,
        assistedConnections: 4,
        durationDays: 60,
      },
    });
    expect(await ctx.service.executePremiumPayment(paymentId)).toEqual({
      success: true,
    });
    const [filter, update] = ctx.userCollection.updateOne.mock.calls[0];
    expect(filter.creditedPaymentIds).toEqual({ $ne: paymentId });
    expect(update.$inc).toEqual({ numberOfConnections: 2 });
    expect(update.$push.connectionGrants).toMatchObject({
      source: 'premium',
      quantity: 2,
    });
    expect(update.$set.premiumService.assistedAllowance).toBe(4);
  });

  it('does not re-credit a previously completed order', async () => {
    const ctx = setup(result, { ...order, status: 'paid' });
    expect(await ctx.service.executePremiumPayment(paymentId)).toEqual({
      success: true,
    });
    expect(ctx.ziniPay.verifyInvoice).not.toHaveBeenCalled();
    expect(ctx.userCollection.updateOne).not.toHaveBeenCalled();
  });

  it('does not verify or activate an order already marked failed', async () => {
    const ctx = setup(result, { ...order, status: 'failed' });
    expect(await ctx.service.executePremiumPayment(paymentId)).toEqual({
      success: false,
    });
    expect(ctx.ziniPay.verifyInvoice).not.toHaveBeenCalled();
    expect(ctx.userCollection.updateOne).not.toHaveBeenCalled();
    expect(ctx.orders.updateOne).not.toHaveBeenCalled();
  });
});
