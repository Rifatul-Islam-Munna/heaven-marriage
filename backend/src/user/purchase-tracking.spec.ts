import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlatformService } from './platform.service';

describe('Purchase tracking receipts', () => {
  const actor = '507f1f77bcf86cd799439011';
  const order = {
    id: 'invoice-1',
    userId: actor,
    paymentId: 'zinipay-1',
    gateway: 'zinipay',
    status: 'paid',
    amount: 1250,
    currency: 'BDT',
    packageId: 'package-1',
    packageName: 'Ten connections',
    quantity: 10,
  };
  function setup(saved: any = order) {
    const collection = {
      findOne: jest.fn(async (filter) =>
        saved &&
        Object.entries(filter).every(([key, value]) => saved[key] === value)
          ? saved
          : null,
      ),
    };
    const db = { collection: jest.fn(() => collection) };
    const service = Object.create(PlatformService.prototype) as PlatformService;
    Object.assign(service, { db });
    return { service, db, collection };
  }
  it.each(['premium', 'connections'])(
    'returns only a paid owned %s receipt',
    async (purpose) => {
      const { service, db, collection } = setup();
      const receipt = await service.trackingPurchase(
        actor,
        order.paymentId,
        purpose,
      );
      expect(db.collection).toHaveBeenCalledWith(
        purpose === 'premium' ? 'premium_orders' : 'connection_orders',
      );
      expect(collection.findOne).toHaveBeenCalledWith(
        { userId: actor, paymentId: order.paymentId, status: 'paid' },
        expect.anything(),
      );
      expect(receipt).toMatchObject({
        order_id: order.id,
        event_id: order.id,
        user_id: actor,
        status: 'paid',
        ecommerce: {
          transaction_id: order.id,
          currency: 'BDT',
          value: 1250,
          tax: 0,
          shipping: 0,
        },
      });
      expect(receipt.ecommerce.items).toEqual([
        expect.objectContaining({
          price: 1250,
          quantity: 1,
          item_category: purpose === 'premium' ? 'Premium' : 'Connections',
        }),
      ]);
      expect(receipt.ecommerce.items[0].connection_credits).toBe(
        purpose === 'connections' ? 10 : undefined,
      );
      expect(receipt).not.toHaveProperty('paymentId');
      expect(
        await service.trackingPurchase(actor, order.paymentId, purpose),
      ).toEqual(receipt);
    },
  );
  it.each(['pending', 'failed', 'refunded'])(
    'rejects %s orders',
    async (status) => {
      await expect(
        setup({ ...order, status }).service.trackingPurchase(
          actor,
          order.paymentId,
          'connections',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );
  it('rejects another member, missing orders, malformed references, and invalid totals', async () => {
    await expect(
      setup().service.trackingPurchase(
        'another-member',
        order.paymentId,
        'premium',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      setup(null).service.trackingPurchase(actor, order.paymentId, 'premium'),
    ).rejects.toBeInstanceOf(NotFoundException);
    for (const [payment, purpose] of [
      ['', 'premium'],
      ['x'.repeat(151), 'premium'],
      [order.paymentId, 'other'],
    ]) {
      await expect(
        setup().service.trackingPurchase(actor, payment, purpose),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    for (const patch of [
      { amount: -1 },
      { amount: NaN },
      { currency: 'USD' },
    ]) {
      await expect(
        setup({ ...order, ...patch }).service.trackingPurchase(
          actor,
          order.paymentId,
          'premium',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    }
  });
  it('projects only the authenticated customer fields', async () => {
    const profile = {
      _id: actor,
      name: 'Own name',
      email: 'own@example.test',
      phoneNumber: '01712345678',
      residenceCountry: 'Bangladesh',
      address: {
        presentAddress: 'Own address',
        district: 'Sylhet',
        guardianPhone: 'private-guardian',
      },
      password: 'secret-password',
      dynamicAnswers: { health: 'private' },
    };
    const users = {
      findById: jest.fn(() => ({
        select: jest.fn(() => ({ lean: async () => profile })),
      })),
    };
    const service = Object.create(PlatformService.prototype) as PlatformService;
    Object.assign(service, { users });
    const customer = await service.trackingUser(actor);
    expect(users.findById).toHaveBeenCalledWith(actor);
    expect(customer).toMatchObject({
      _id: actor,
      name: profile.name,
      email: profile.email,
    });
    expect(JSON.stringify(customer)).not.toMatch(
      /password|guardian|dynamicAnswers|health/,
    );
  });
});
