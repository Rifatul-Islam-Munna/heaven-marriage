import { BadRequestException, HttpException, HttpStatus, Injectable, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { MessagingService, normalizePhone } from '../user/messaging.service';

/** Isolated administrator diagnostics: never creates a user or verifies a real account. */
@Injectable()
export class AdminDeliveryTestService implements OnModuleInit {
  constructor(
    @InjectConnection() private readonly db: Connection,
    private readonly config: ConfigService,
    private readonly messaging: MessagingService,
  ) {}

  async onModuleInit() {
    const tests = this.db.collection('admin_delivery_test_challenges');
    const limits = this.db.collection('admin_delivery_test_limits');
    await Promise.all([
      tests.createIndex({ challengeId: 1 }, { unique: true }),
      tests.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      limits.createIndex({ key: 1 }, { unique: true }),
      limits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
  }

  status() {
    const configured = (name: string) => !!this.config.get<string>(name)?.trim();
    return {
      email: {
        provider: 'Resend',
        configured: configured('RESEND_API_KEY') && configured('EMAIL_FROM'),
        sender: this.config.get<string>('EMAIL_FROM')?.trim() || null,
      },
      bangladeshSms: {
        provider: 'BulkSMSBD',
        configured: configured('BULKSMSBD_API_KEY') && configured('BULKSMSBD_SENDER_ID') && configured('BULKSMSBD_API_URL'),
      },
      internationalSms: {
        provider: 'Twilio',
        configured: configured('TWILIO_ACCOUNT_SID') && configured('TWILIO_AUTH_TOKEN') && configured('TWILIO_FROM'),
      },
    };
  }

  private email(value: unknown): string {
    if (typeof value !== 'string') throw new BadRequestException('Enter a valid email address.');
    const email = value.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
      throw new BadRequestException('Enter a valid email address.');
    }
    return email;
  }

  private destination(value: unknown, channel: unknown): string {
    if (channel === 'email') return this.email(value);
    if (channel !== 'sms' || typeof value !== 'string' || value.length > 30) {
      throw new BadRequestException('Choose email or SMS and enter a valid destination.');
    }
    return normalizePhone(value);
  }

  private digest(id: string, code: string): Buffer {
    const secret = this.config.get<string>('ACCESS_TOKEN');
    if (!secret) throw new ServiceUnavailableException('OTP test authentication is not configured.');
    return createHmac('sha256', secret).update('delivery-test:' + id + ':' + code).digest();
  }

  private async acquire(actorId: string, kind: string): Promise<string> {
    const collection = this.db.collection('admin_delivery_test_limits');
    const key = actorId + ':' + kind;
    const now = new Date();
    // TTL deletion is asynchronous, so release any already-expired lock first.
    await collection.deleteOne({ key, expiresAt: { $lte: now } });
    try {
      await collection.insertOne({ key, expiresAt: new Date(now.getTime() + 60000) });
    } catch (error: unknown) {
      if ((error as { code?: number })?.code === 11000) {
        throw new HttpException('Wait one minute before repeating this type of test.', HttpStatus.TOO_MANY_REQUESTS);
      }
      throw error;
    }
    return key;
  }

  private release(key: string) {
    return this.db.collection('admin_delivery_test_limits').deleteOne({ key });
  }

  async sendEmail(actorId: string, payload: unknown) {
    const input = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload as Record<string, unknown> : {};
    const to = this.email(input.to);
    if (!this.status().email.configured) throw new ServiceUnavailableException('Resend email settings are incomplete.');
    const lock = await this.acquire(actorId, 'email');
    try {
      await this.messaging.send(
        to,
        'Niqaha.com test email.\n\nThis email was requested from the administrator dashboard. If it reaches your inbox, email delivery is working. No account was changed.',
        'Niqaha.com | Test email',
      );
      return { accepted: true, message: 'The provider accepted the test email. Check your Inbox and Spam folder.' };
    } catch (error) {
      await this.release(lock);
      throw error;
    }
  }

  async sendOtp(actorId: string, payload: unknown) {
    const input = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload as Record<string, unknown> : {};
    const channel = input.channel;
    const to = this.destination(input.to, channel);
    const status = this.status();
    if (channel === 'email' && !status.email.configured) throw new ServiceUnavailableException('Email settings are incomplete.');
    if (channel === 'sms' && !(to.startsWith('01') ? status.bangladeshSms.configured : status.internationalSms.configured)) {
      throw new ServiceUnavailableException('SMS settings for that number are incomplete.');
    }
    const lock = await this.acquire(actorId, 'otp');
    const challengeId = randomUUID();
    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60000);
    const tests = this.db.collection('admin_delivery_test_challenges');
    try {
      await tests.insertOne({
        challengeId, actorId, destination: to, channel,
        hash: this.digest(challengeId, code).toString('hex'),
        attempts: 0, used: false, expiresAt, createdAt: new Date(),
      });
      await this.messaging.send(
        to,
        'Niqaha.com পরীক্ষার OTP: ' + code +
          '। ১০ মিনিটের মধ্যে অ্যাডমিন প্যানেলে কোডটি লিখুন। এটি শুধু ডেলিভারি পরীক্ষা, কোনো অ্যাকাউন্ট পরিবর্তন করবে না।',
        'Niqaha.com | OTP delivery test',
      );
      return {
        accepted: true, challengeId, expiresAt: expiresAt.toISOString(), channel,
        message: 'OTP submitted. Enter the six-digit code you receive to verify delivery.',
      };
    } catch (error) {
      await tests.deleteOne({ challengeId, actorId });
      await this.release(lock);
      throw error;
    }
  }

  async verifyOtp(actorId: string, payload: unknown) {
    const input = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload as Record<string, unknown> : {};
    if (typeof input.challengeId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f-]{27,40}$/i.test(input.challengeId) ||
        typeof input.code !== 'string' || !/^\d{6}$/.test(input.code)) {
      throw new BadRequestException('Enter the six-digit test code.');
    }
    const tests = this.db.collection('admin_delivery_test_challenges');
    const row = await tests.findOneAndUpdate(
      {
        challengeId: input.challengeId, actorId, used: false,
        expiresAt: { $gt: new Date() }, attempts: { $lt: 5 },
      },
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' },
    );
    if (!row || typeof row.hash !== 'string') {
      throw new BadRequestException('Code expired, already used, or too many attempts. Send a new test code.');
    }
    const expected = Buffer.from(row.hash, 'hex');
    if (expected.length !== 32 || !timingSafeEqual(expected, this.digest(input.challengeId, input.code))) {
      throw new BadRequestException('Incorrect test code. Check the received message.');
    }
    const consumed = await tests.updateOne(
      { _id: row._id, used: false }, { $set: { used: true, confirmedAt: new Date() } },
    );
    if (!consumed.modifiedCount) throw new BadRequestException('Test code was already used.');
    return { verified: true, message: 'OTP confirmed. The received code matches the test challenge.' };
  }
}
