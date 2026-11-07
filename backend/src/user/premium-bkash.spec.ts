import { BadRequestException } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { UserType } from './entities/user.entity';

describe('Premium bKash payment security', () => {
  const paymentId = 'payment-123';
  const order = {
    id: 'invoice-123', userId: '507f1f77bcf86cd799439011',
    caseId: 'case-123', amount: 1250, currency: 'BDT', paymentId,
    status: 'pending',
  };
  const result = {
    paymentID: paymentId, transactionStatus: 'Completed', amount: '1250',
    currency: 'BDT', payerReference: order.id, trxID: 'TRX001',
  };
  function setup(payment = result, savedOrder: any = order) {
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
    const db = { collection: jest.fn((name: string) =>
      name === 'premium_orders' ? orders : cases) };
    const bkash = {
      executePayment: jest.fn().mockResolvedValue(payment),
      queryPayment: jest.fn().mockResolvedValue(payment),
    };
    const service = Object.create(PlatformService.prototype) as PlatformService;
    Object.assign(service, { db, users, bkash, audit: jest.fn() });
    return { service, orders, cases, userCollection, bkash };
  }

  it('does not activate premium for an unknown order', async () => {
    const ctx = setup(result, null);
    expect(await ctx.service.executePremiumPayment(paymentId)).toEqual({ success: false });
    expect(ctx.userCollection.updateOne).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...result, amount: '1000' }, 'incorrect amount'],
    [{ ...result, currency: 'USD' }, 'incorrect currency'],
    [{ ...result, payerReference: 'other', merchantInvoiceNumber: 'other' }, 'incorrect order'],
    [{ ...result, transactionStatus: 'Pending' }, 'incomplete payment'],
  ])('rejects %s (%s)', async (response, _reason) => {
    const ctx = setup(response);
    expect(await ctx.service.executePremiumPayment(paymentId)).toEqual({ success: false });
    expect(ctx.userCollection.updateOne).not.toHaveBeenCalled();
    expect(ctx.orders.updateOne).not.toHaveBeenCalled();
  });

  it('activates only the paid member, without connection credits', async () => {
    const ctx = setup();
    expect(await ctx.service.executePremiumPayment(paymentId)).toEqual({ success: true });
    const [filter, update] = ctx.userCollection.updateOne.mock.calls[0];
    expect(filter.role).toBe(UserType.USER);
    expect(filter.creditedPaymentIds).toEqual({ $ne: paymentId });
    expect(update.$set).toEqual({ isSubscriber: true });
    expect(update.$inc).toBeUndefined();
    expect(ctx.orders.updateOne).toHaveBeenCalledWith(
      { paymentId, status: 'pending' }, expect.anything(),
    );
    expect(ctx.cases.updateOne).toHaveBeenCalledTimes(1);
  });

  it('does not re-credit a previously completed order', async () => {
    const ctx = setup(result, { ...order, status: 'paid' });
    expect(await ctx.service.executePremiumPayment(paymentId)).toEqual({ success: true });
    expect(ctx.userCollection.updateOne).not.toHaveBeenCalled();
  });
});
