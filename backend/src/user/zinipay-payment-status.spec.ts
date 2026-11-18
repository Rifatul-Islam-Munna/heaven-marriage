import { BadRequestException } from '@nestjs/common';
import { PlatformService } from './platform.service';

describe('ZiniPay authenticated payment status', () => {
  const actor = '507f1f77bcf86cd799439011';
  const pendingOrder = {
    id: 'order-123',
    userId: actor,
    paymentId: 'invoice-123',
    status: 'pending',
  };

  function setup(
    options: {
      firstOrder?: any;
      finalOrder?: any;
      modifiedCount?: number;
    } = {},
  ) {
    const orders = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(options.firstOrder ?? pendingOrder)
        .mockResolvedValueOnce(options.finalOrder ?? pendingOrder),
      updateOne: jest.fn().mockResolvedValue({
        modifiedCount: options.modifiedCount ?? 1,
      }),
    };
    const db = { collection: jest.fn(() => orders) };
    const service = Object.create(PlatformService.prototype) as PlatformService;
    const executePayment = jest.fn().mockResolvedValue({ success: false });
    const executePremiumPayment = jest
      .fn()
      .mockResolvedValue({ success: false });
    Object.assign(service, { db, executePayment, executePremiumPayment });
    return { service, db, orders, executePayment, executePremiumPayment };
  }

  it('retries connection verification for the authenticated owner and returns the settled invoice', async () => {
    const paidOrder = {
      ...pendingOrder,
      status: 'paid',
      paidAt: new Date('2026-11-18T12:00:00Z'),
    };
    const ctx = setup({ finalOrder: paidOrder });

    const result = await ctx.service.paymentStatus(
      actor,
      pendingOrder.id,
      'connections',
    );

    expect(ctx.db.collection).toHaveBeenCalledWith('connection_orders');
    expect(ctx.orders.findOne).toHaveBeenNthCalledWith(
      1,
      { userId: actor, id: pendingOrder.id },
      expect.objectContaining({ projection: expect.any(Object) }),
    );
    expect(ctx.orders.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: actor,
        id: pendingOrder.id,
        status: 'pending',
        paymentId: pendingOrder.paymentId,
      }),
      { $set: { lastVerificationAt: expect.any(Date) } },
    );
    expect(ctx.executePayment).toHaveBeenCalledWith(pendingOrder.paymentId);
    expect(result).toMatchObject({
      orderId: pendingOrder.id,
      purpose: 'connections',
      status: 'paid',
      paymentId: pendingOrder.paymentId,
    });
  });

  it('uses the premium order collection and premium verifier', async () => {
    const paidOrder = { ...pendingOrder, status: 'paid' };
    const ctx = setup({ finalOrder: paidOrder });

    const result = await ctx.service.paymentStatus(
      actor,
      pendingOrder.id,
      'premium',
    );

    expect(ctx.db.collection).toHaveBeenCalledWith('premium_orders');
    expect(ctx.executePremiumPayment).toHaveBeenCalledWith(
      pendingOrder.paymentId,
    );
    expect(ctx.executePayment).not.toHaveBeenCalled();
    expect(result).toMatchObject({ purpose: 'premium', status: 'paid' });
  });

  it('does not repeatedly call ZiniPay while the verification cooldown is active', async () => {
    const ctx = setup({ modifiedCount: 0 });

    const result = await ctx.service.paymentStatus(
      actor,
      pendingOrder.id,
      'connections',
    );

    expect(ctx.executePayment).not.toHaveBeenCalled();
    expect(result.status).toBe('pending');
  });

  it('does not verify an order that is already paid', async () => {
    const paidOrder = { ...pendingOrder, status: 'paid' };
    const ctx = setup({ firstOrder: paidOrder, finalOrder: paidOrder });

    const result = await ctx.service.paymentStatus(
      actor,
      pendingOrder.id,
      'connections',
    );

    expect(ctx.orders.updateOne).not.toHaveBeenCalled();
    expect(ctx.executePayment).not.toHaveBeenCalled();
    expect(result.status).toBe('paid');
  });

  it('rejects malformed order references and unsupported purposes', async () => {
    const ctx = setup();
    await expect(
      ctx.service.paymentStatus(actor, '', 'connections'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      ctx.service.paymentStatus(actor, pendingOrder.id, 'other'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
