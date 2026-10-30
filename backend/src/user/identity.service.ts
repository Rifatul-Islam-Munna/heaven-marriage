import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { User, UserDocument } from './entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { MessagingService, normalizePhone } from './messaging.service';
@Injectable()
export class IdentityService {
  constructor(
    @InjectModel(User.name) private users: Model<UserDocument>,
    @InjectConnection() private db: Connection,
    private jwt: JwtService,
    private config: ConfigService,
    private messages: MessagingService,
  ) {}
  async onModuleInit() {
    await this.db
      .collection('identity_challenges')
      .createIndex({ subject: 1, purpose: 1 }, { unique: true });
    await this.db
      .collection('identity_challenges')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  }
  private subject(p: any) {
    if (p.email || String(p.phoneNumber || '').includes('@')) {
      const email = String(p.email || p.phoneNumber)
        .trim()
        .toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new BadRequestException('Invalid email');
      return email;
    }
    return normalizePhone(p.phoneNumber);
  }
  private digest(id: string, code: string) {
    const secret = this.config.get<string>('ACCESS_TOKEN');
    if (!secret) throw new Error('Authentication is not configured');
    return createHmac('sha256', secret)
      .update(id + ':' + code)
      .digest('hex');
  }
  private async challenge(
    userId: string,
    subject: string,
    purpose: string,
    registrationData?: any,
  ) {
    const c = this.db.collection('identity_challenges');
    const recent = await c.findOne({
      subject,
      purpose,
      sentAt: { $gt: new Date(Date.now() - 60000) },
    });
    if (recent)
      throw new BadRequestException('Please wait 60 seconds before resending.');
    const id = randomUUID(),
      code = String(randomInt(100000, 1000000));
    try {
      await c.findOneAndUpdate(
        {
          subject,
          purpose,
          $or: [
            { sentAt: { $lte: new Date(Date.now() - 60000) } },
            { sentAt: { $exists: false } },
          ],
        },
        {
          $set: {
            id,
            userId,
            subject,
            purpose,
            registrationData,
            hash: this.digest(id, code),
            attempts: 0,
            expiresAt: new Date(Date.now() + 10 * 60000),
            sentAt: new Date(),
            used: false,
          },
        },
        { upsert: true },
      );
    } catch (e) {
      if (e.code === 11000)
        throw new BadRequestException(
          'Please wait 60 seconds before resending.',
        );
      throw e;
    }
    try {
      await this.messages.send(
        subject,
        'আপনার Niqaha.com OTP: ' +
          code +
          '। ১০ মিনিটের মধ্যে ব্যবহার করুন। কারও সঙ্গে শেয়ার করবেন না।',
      );
    } catch (e) {
      await c.deleteOne({ id });
      throw e;
    }
    return {
      challengeId: id,
      otpExpiresAt: new Date(Date.now() + 10 * 60000),
      message: 'OTP sent successfully',
    };
  }
  async register(p: any) {
    const subject = this.subject(p),
      email = subject.includes('@');
    if (
      !p.name ||
      !['male', 'female'].includes(p.gender) ||
      !p.password ||
      p.password.length < 8
    )
      throw new BadRequestException(
        'Name, gender and a password of at least 8 characters are required.',
      );
    const key = email ? { email: subject } : { phoneNumber: subject };
    let user = await this.users.findOne(key);
    if (
      user &&
      (email
        ? (user as any).isEmailVerified
        : (user as any).isPhoneVerified || user.isOtpVerified)
    )
      throw new BadRequestException('Account already exists. Please log in.');
    if (!user) {
      const claim = await this.db
        .collection('identity_claims')
        .findOneAndUpdate(
          { _id: subject as any },
          { $setOnInsert: { userId: new Types.ObjectId() } },
          { upsert: true, returnDocument: 'after' },
        );
      const counter = await this.db
        .collection('counters')
        .findOneAndUpdate(
          { _id: 'counter' as any },
          { $inc: { seq: 1 } },
          { upsert: true, returnDocument: 'after' },
        );
      user = await this.users.findOneAndUpdate(
        { _id: claim!.userId },
        {
          $setOnInsert: {
            ...key,
            name: p.name,
            gender: p.gender,
            password: await bcrypt.hash(p.password, 12),
            userId: String(counter?.seq || Date.now()).padStart(6, '0'),
          },
        },
        { upsert: true, returnDocument: 'after' },
      );
    }
    if (!user) throw new BadRequestException('Unable to create account');
    return this.challenge(String(user._id), subject, 'registration', {
      passwordHash: await bcrypt.hash(p.password, 12),
      name: p.name,
      gender: p.gender,
    });
  }
  async resend(id: string) {
    const c = await this.db
      .collection('identity_challenges')
      .findOne({ id, used: false });
    if (!c) throw new BadRequestException('Please start registration again.');
    return this.challenge(c.userId, c.subject, c.purpose, c.registrationData);
  }
  private async consume(p: any, purpose: string) {
    const c = this.db.collection('identity_challenges');
    const query: any = {
      purpose,
      used: false,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: 5 },
    };
    if (p.challengeId) query.id = p.challengeId;
    else if (p.phoneNumber || p.email) query.subject = this.subject(p);
    else
      throw new BadRequestException(
        'Verification session is missing. Please start again.',
      );
    const row = await c.findOneAndUpdate(
      query,
      { $inc: { attempts: 1 } },
      { sort: { sentAt: -1 }, returnDocument: 'after' },
    );
    if (!row || row.hash !== this.digest(row.id, String(p.otp)))
      throw new BadRequestException('Invalid or expired OTP');
    const used = await c.updateOne(
      { _id: row._id, used: false },
      { $set: { used: true } },
    );
    if (!used.modifiedCount) throw new BadRequestException('OTP already used');
    return row;
  }
  async verify(p: any) {
    const row = await this.consume(p, 'registration'),
      email = row.subject.includes('@');
    const user = await this.users
      .findOneAndUpdate(
        {
          _id: row.userId,
          isOtpVerified: { $ne: true },
          [email ? 'email' : 'phoneNumber']: row.subject,
        },
        {
          $set: {
            isOtpVerified: true,
            ...(row.registrationData
              ? {
                  password: row.registrationData.passwordHash,
                  name: row.registrationData.name,
                  gender: row.registrationData.gender,
                }
              : {}),
            ...(email ? { isEmailVerified: true } : { isPhoneVerified: true }),
          },
        },
        { returnDocument: 'after' },
      )
      .lean();
    if (!user) throw new BadRequestException('Account unavailable');
    return {
      message: 'Verification successful',
      data: this.safe(user),
      access_token: await this.token(user),
      isNewUser: true,
    };
  }
  async resetRequest(p: any) {
    const subject = this.subject(p);
    const user = await this.users
      .findOne(
        subject.includes('@') ? { email: subject } : { phoneNumber: subject },
      )
      .lean();
    if (!user)
      return {
        message: 'If an account exists, a verification code will be sent.',
        challengeId: randomUUID(),
      };
    return this.challenge(String(user._id), subject, 'password-reset');
  }
  async reset(p: any) {
    if (!p.newPassword || p.newPassword.length < 8 || p.newPassword.length > 50)
      throw new BadRequestException('Use a password of at least 8 characters');
    const row = await this.consume(p, 'password-reset');
    const updated = await this.users.updateOne(
      {
        _id: row.userId,
        [row.subject.includes('@') ? 'email' : 'phoneNumber']: row.subject,
      },
      {
        $set: {
          password: await bcrypt.hash(p.newPassword, 12),
          isOtpVerified: true,
          [row.subject.includes('@') ? 'isEmailVerified' : 'isPhoneVerified']:
            true,
        },
        $inc: { authVersion: 1 },
      },
    );
    if (!updated.matchedCount)
      throw new BadRequestException(
        'Account contact changed. Please request a new code.',
      );
    await this.db
      .collection('identity_challenges')
      .deleteMany({ userId: row.userId });
    return { message: 'Password reset successfully. Please log in.' };
  }
  safe(u: any) {
    const keys = [
      '_id',
      'name',
      'email',
      'phoneNumber',
      'gender',
      'role',
      'userId',
      'isOtpVerified',
      'isPhoneVerified',
      'isEmailVerified',
      'isSubscriber',
      'numberOfConnections',
    ];
    return Object.fromEntries(keys.map((k) => [k, u[k]]));
  }
  token(u: any) {
    return this.jwt.signAsync(
      { id: String(u._id), role: u.role, authVersion: u.authVersion || 0 },
      { expiresIn: '10d', secret: this.config.get<string>('ACCESS_TOKEN') },
    );
  }
  async login(p: any) {
    const subject = this.subject(p);
    const u = await this.users
      .findOne(
        subject.includes('@') ? { email: subject } : { phoneNumber: subject },
      )
      .lean();
    if (!u || !u.password || !(await bcrypt.compare(p.password, u.password)))
      throw new UnauthorizedException('Invalid credentials');
    if (!u.isOtpVerified)
      throw new BadRequestException('Please verify your account first.');
    return {
      message: 'Logged in',
      user: this.safe(u),
      access_token: await this.token(u),
    };
  }

  /** Only a current administrator may edit account login contacts. */
  async adminUpdateProfile(
    actor: string,
    userId: string,
    profile: any,
    input: any,
  ) {
    const admin = await this.users.findById(actor).select('role').lean();
    if (admin?.role !== 'admin')
      throw new UnauthorizedException('Administrator access required');
    const user: any = await this.users.findById(userId).lean();
    if (!user) throw new BadRequestException('User not found');
    const set: any = { ...profile },
      unset: any = {},
      changed: string[] = [],
      reserved: string[] = [];
    const next: any = { email: user.email, phoneNumber: user.phoneNumber };
    for (const key of ['email', 'phoneNumber']) {
      if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
      const value = input[key];
      if (value === undefined) continue;
      next[key] =
        value === null || value === ''
          ? undefined
          : this.subject(
              key === 'email' ? { email: value } : { phoneNumber: value },
            );
      if (key === 'email' && next[key] && !next[key].includes('@'))
        throw new BadRequestException('Invalid email');
      if (key === 'phoneNumber' && next[key]?.includes('@'))
        throw new BadRequestException('Invalid phone number');
      if (next[key] !== user[key]) {
        changed.push(key);
        if (next[key]) set[key] = next[key];
        else unset[key] = '';
        set[key === 'email' ? 'isEmailVerified' : 'isPhoneVerified'] = false;
      }
    }
    if (!next.email && !next.phoneNumber)
      throw new BadRequestException('Keep at least one login contact');
    const claims = this.db.collection('identity_claims');
    let committed = false;
    try {
      for (const key of changed) {
        const subject = next[key];
        if (!subject) continue;
        const duplicate = await this.users
          .findOne({ _id: { $ne: user._id }, [key]: subject })
          .select('_id')
          .lean();
        if (duplicate)
          throw new BadRequestException('This contact is already in use');
        const claim = await claims.findOneAndUpdate(
          { _id: subject as any },
          { $setOnInsert: { userId: user._id } },
          { upsert: true, returnDocument: 'before' },
        );
        if (claim && String(claim.userId) !== userId)
          throw new BadRequestException('This contact is already reserved');
        if (!claim) reserved.push(subject);
      }
      const update: any = { $set: set };
      if (Object.keys(unset).length) update.$unset = unset;
      const filter: any = { _id: user._id };
      if (changed.length) {
        filter.authVersion =
          user.authVersion === undefined
            ? { $in: [null, 0] }
            : user.authVersion;
        update.$inc = { authVersion: 1 };
      }
      const result = await this.users
        .findOneAndUpdate(filter, update, { new: true, runValidators: true })
        .select('-password -otpNumber -otpValidatedAt')
        .lean();
      if (!result)
        throw new BadRequestException('Account changed. Reload and try again.');
      committed = true;
      if (changed.length) {
        await this.db.collection('identity_challenges').deleteMany({ userId });
        for (const key of changed)
          if (user[key])
            await claims.deleteOne({ _id: user[key] as any, userId: user._id });
      }
      return result;
    } catch (e) {
      if (!committed)
        for (const subject of reserved)
          await claims.deleteOne({ _id: subject as any, userId: user._id });
      if (e.code === 11000)
        throw new BadRequestException('This contact is already in use');
      throw e;
    }
  }
  async requestContact(userId: string, p: any) {
    const user = await this.users.findById(userId).lean();
    if (!user) throw new BadRequestException('Account unavailable');
    if (
      user.password &&
      !(await bcrypt.compare(String(p.password || ''), user.password))
    )
      throw new UnauthorizedException('Current password is required');
    const subject = this.subject({ phoneNumber: p.contact });
    const existing = await this.users
      .findOne(
        subject.includes('@') ? { email: subject } : { phoneNumber: subject },
      )
      .lean();
    if (existing && String(existing._id) !== userId)
      throw new BadRequestException('This contact is already in use');
    return this.challenge(userId, subject, 'contact-change');
  }
  async verifyContact(userId: string, p: any) {
    const row = await this.consume(p, 'contact-change');
    if (row.userId !== userId)
      throw new UnauthorizedException(
        'Verification belongs to a different account',
      );
    const email = row.subject.includes('@');
    const existing = await this.users
      .findOne(email ? { email: row.subject } : { phoneNumber: row.subject })
      .lean();
    if (existing && String(existing._id) !== userId)
      throw new BadRequestException('This contact is already in use');
    await this.users.updateOne(
      { _id: userId },
      {
        $set: email
          ? { email: row.subject, isEmailVerified: true }
          : { phoneNumber: row.subject, isPhoneVerified: true },
      },
    );
    return { message: 'Contact verified and updated' };
  }
}
