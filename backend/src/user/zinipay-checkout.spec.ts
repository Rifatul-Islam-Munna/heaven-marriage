import { BadRequestException } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { UserType } from './entities/user.entity';

describe('ZiniPay checkout errors', () => {
  const actor = '507f1f77bcf86cd799439011';
  const packageId = '507f1f77bcf86cd799439012';

  function setup(error: Error) {
    const collections = Object.fromEntries(
      ['platform_settings', 'service_cases', 'pricings', 'premium_orders', 'connection_orders'].map(
        (name) => [name, {
          findOne: jest.fn().mockResolvedValue(
            name === 'service_cases' ? { id: 'case-123' } :
            name === 'pricings' ? { title: 'Connections', numberOfConnections: 2, originalPrice: 200 } : null,
          ),
          insertOne: jest.fn().mockResolvedValue({ acknowledged: true }),
          updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
        }],
      ),
    );
    const memberQuery = {
      lean: jest.fn().mockResolvedValue({ name: 'Member', role: UserType.USER }),
      select: jest.fn().mockReturnThis(),
    };
    const service = Object.create(PlatformService.prototype) as PlatformService;
    Object.assign(service, {
      db: { collection: jest.fn((name: string) => collections[name]) },
      users: { findById: jest.fn(() => memberQuery) },
      ziniPay: {
        isConfigured: jest.fn(() => true),
        createInvoice: jest.fn().mockRejectedValue(error),
      },
      logger: { error: jest.fn() },
    });
    return { service, collections };
  }

  it.each(['connections', 'premium'] as const)(
    'returns input errors for %s checkout and marks the order failed',
    async (purpose) => {
      const error = new BadRequestException(
        'Invalid checkout details',
      );
      const ctx = setup(error);
      const checkout = purpose === 'premium'
        ? ctx.service.createPremiumPayment(actor)
        : ctx.service.createPayment(actor, packageId);

      await expect(checkout).rejects.toBe(error);
      const orders = ctx.collections[purpose === 'premium' ? 'premium_orders' : 'connection_orders'];
      expect(orders.updateOne).toHaveBeenCalledWith(
        { id: expect.any(String) },
        { $set: expect.objectContaining({ status: 'failed' }) },
      );
    },
  );

  it.each(['connections', 'premium'] as const)(
    'keeps internal provider errors out of the %s checkout response',
    async (purpose) => {
      const ctx = setup(new Error('Internal provider failure'));
      const checkout = purpose === 'premium'
        ? ctx.service.createPremiumPayment(actor)
        : ctx.service.createPayment(actor, packageId);
      await expect(checkout).rejects.toThrow(
        purpose === 'premium' ? 'Unable to start ZiniPay premium checkout' : 'Unable to create payment',
      );
    },
  );
});
