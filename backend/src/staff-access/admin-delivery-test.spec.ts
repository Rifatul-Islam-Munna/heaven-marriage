import { BadRequestException, ForbiddenException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createConnection, type Connection } from 'mongoose';
import { AdminDeliveryTestService } from './admin-delivery-test.service';
import { AdminDeliveryTestController } from './admin-delivery-test.controller';
import { MessagingService } from '../user/messaging.service';
import { RolesGuard } from '../lib/roles.guard';

describe('Admin delivery diagnostic security and test OTP', () => {
  let mongo: MongoMemoryServer;
  let db: Connection;
  let service: AdminDeliveryTestService;
  const messages = { send: jest.fn<Promise<void>, [string, string, string?]>() };
  const actor = 'administrator-1';
  const config = new ConfigService({
    ACCESS_TOKEN: 'testing-only-signed-digest-secret',
    RESEND_API_KEY: 'testing-key',
    EMAIL_FROM: 'Niqaha <test@example.com>',
    BULKSMSBD_API_KEY: 'testing-bangladesh-key',
    BULKSMSBD_SENDER_ID: 'testing-sender',
    BULKSMSBD_API_URL: 'https://sms.example.test',
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    TWILIO_FROM: '',
  });

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    db = await createConnection(mongo.getUri(), { dbName: 'delivery_test' }).asPromise();
    service = new AdminDeliveryTestService(db, config, messages as unknown as MessagingService);
    await service.onModuleInit();
  }, 120000);
  afterAll(async () => {
    await db?.close();
    await mongo?.stop();
  });
  beforeEach(async () => {
    messages.send.mockReset();
    messages.send.mockResolvedValue(undefined);
    await db.collection('admin_delivery_test_limits').deleteMany({});
    await db.collection('admin_delivery_test_challenges').deleteMany({});
  });

  it('exposes only provider setup and sender (never keys or OTPs)', () => {
    const response = service.status();
    expect(response.email).toEqual({
      provider: 'Resend', configured: true, sender: 'Niqaha <test@example.com>',
    });
    expect(response.bangladeshSms.configured).toBe(true);
    expect(response.internationalSms.configured).toBe(false);
    expect(JSON.stringify(response)).not.toContain('testing-key');
    expect(JSON.stringify(response)).not.toContain('testing-only');
  });

  it('validates email, submits through the real messaging interface, and limits repeat sends', async () => {
    await expect(service.sendEmail(actor, { to: 'bad address' })).rejects.toThrow(BadRequestException);
    const sent = await service.sendEmail(actor, { to: ' Admin@Test.Example ' });
    expect(sent.accepted).toBe(true);
    expect(messages.send).toHaveBeenCalledWith(
      'admin@test.example', expect.stringContaining('test email'), expect.stringContaining('Test email'),
    );
    await expect(service.sendEmail(actor, { to: 'admin@test.example' })).rejects.toThrow(HttpException);
    expect(messages.send).toHaveBeenCalledTimes(1);
  });

  it('releases a send lock when the email provider rejects the submission', async () => {
    messages.send.mockRejectedValueOnce(new Error('provider rejected'));
    await expect(service.sendEmail(actor, { to: 'test@example.com' })).rejects.toThrow('provider rejected');
    expect((await service.sendEmail(actor, { to: 'test@example.com' })).accepted).toBe(true);
  });

  it('sends a hashed ten-minute challenge and confirms only the original admin once', async () => {
    const sent = await service.sendOtp(actor, { channel: 'email', to: 'test@example.com' });
    expect(sent.accepted).toBe(true);
    expect(sent.challengeId).toBeTruthy();
    const deliveredText: string = messages.send.mock.calls[0][1];
    const code = deliveredText.match(/OTP: (\d{6})/)?.[1];
    expect(code).toMatch(/^\d{6}$/);
    const row = await db.collection('admin_delivery_test_challenges').findOne({ challengeId: sent.challengeId });
    expect(row?.hash).toBeTruthy();
    expect(row?.hash).not.toBe(code);
    expect(row?.code).toBeUndefined();
    await expect(service.verifyOtp('some-other-admin', { challengeId: sent.challengeId, code })).rejects.toThrow(BadRequestException);
    await expect(service.verifyOtp(actor, { challengeId: sent.challengeId, code: '000000' })).rejects.toThrow(BadRequestException);
    expect((await service.verifyOtp(actor, { challengeId: sent.challengeId, code })).verified).toBe(true);
    await expect(service.verifyOtp(actor, { challengeId: sent.challengeId, code })).rejects.toThrow(BadRequestException);
  });

  it('locks failed codes after five attempts, and rejects expired OTPs', async () => {
    const first = await service.sendOtp(actor, { channel: 'email', to: 'test@example.com' });
    for (let i = 0; i < 5; i++) {
      await expect(service.verifyOtp(actor, { challengeId: first.challengeId, code: '000000' })).rejects.toThrow(BadRequestException);
    }
    const realCode = messages.send.mock.calls[0][1].match(/OTP: (\d{6})/)![1];
    await expect(service.verifyOtp(actor, { challengeId: first.challengeId, code: realCode })).rejects.toThrow(BadRequestException);
    const second = await service.sendOtp('another-admin', { channel: 'email', to: 'test@example.com' });
    await db.collection('admin_delivery_test_challenges').updateOne(
      { challengeId: second.challengeId }, { $set: { expiresAt: new Date(0) } },
    );
    await expect(service.verifyOtp('another-admin', {
      challengeId: second.challengeId, code: messages.send.mock.calls[1][1].match(/OTP: (\d{6})/)![1],
    })).rejects.toThrow(BadRequestException);
  });

  it('uses the same SMS dispatch route, and blocks unconfigured international SMS', async () => {
    await service.sendOtp(actor, { channel: 'sms', to: '01712345678' });
    expect(messages.send.mock.calls[0][0]).toBe('01712345678');
    await expect(service.sendOtp('another-admin', {
      channel: 'sms', to: '+447123456789',
    })).rejects.toThrow('SMS settings');
  });

  it('requires an admin role, never grants access to a manager', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);
    const controller = AdminDeliveryTestController;
    const ctx = (role: string) => ({
      getClass: () => controller,
      getHandler: () => controller.prototype.otp,
      switchToHttp: () => ({ getRequest: () => ({ user: { role, dashboardPermissions: ['settings'] } }) }),
    }) as any;
    expect(() => guard.canActivate(ctx('manager'))).toThrow(ForbiddenException);
    expect(guard.canActivate(ctx('admin'))).toBe(true);
  });
});
