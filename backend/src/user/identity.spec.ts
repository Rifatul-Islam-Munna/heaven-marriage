import { MongoMemoryServer } from 'mongodb-memory-server';
import { createConnection, Connection, Model } from 'mongoose';
import { IdentityService } from './identity.service';
import { User, UserSchema } from './entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service';
import { OAuth2Client } from 'google-auth-library';
import { adminFilter, adminSort } from './profile-rules';
import { UpdateUserDto, ReqForDto, NewPasswordResetWithOtp } from './dto/update-user.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { of, throwError } from 'rxjs';
import { SmsService } from './sms.service';
import { MessagingService, normalizePhone } from './messaging.service';
describe('OTP challenge security', () => {
  let mongo: MongoMemoryServer,
    db: Connection,
    users: Model<any>,
    service: IdentityService;
  const messages = { send: jest.fn().mockResolvedValue(undefined) };
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    db = await createConnection(mongo.getUri(), {
      dbName: 'niqaha_identity_tests',
    }).asPromise();
    users = db.model(User.name, UserSchema);
    service = new IdentityService(
      users,
      db,
      new JwtService(),
      new ConfigService({ ACCESS_TOKEN: 'isolated-test-secret' }),
      messages as any,
    );
    await service.onModuleInit();
  }, 120000);
  afterAll(async () => {
    await db?.close();
    await mongo?.stop();
  });
  beforeEach(async () => {
    await users.deleteMany({});
    await db.collection('identity_challenges').deleteMany({});
    await db.collection('identity_claims').deleteMany({});
    jest.clearAllMocks();
  });
  it('stores only an OTP digest and consumes a bound challenge only once', async () => {
    const r = await service.register({
      name: 'Test',
      gender: 'male',
      email: 'test@example.com',
      password: 'Password123',
    });
    const code = messages.send.mock.calls[0][1].match(/\d{6}/)[0];
    const row = await db
      .collection('identity_challenges')
      .findOne({ id: r.challengeId });
    expect(row?.hash).not.toBe(code);
    expect(row?.otp).toBeUndefined();
    const verified = await service.verify({
      challengeId: r.challengeId,
      otp: code,
    });
    expect(verified.data.isEmailVerified).toBe(true);
    expect(verified.data.isPhoneVerified).not.toBe(true);
    await expect(
      service.verify({ challengeId: r.challengeId, otp: code }),
    ).rejects.toThrow();
  });
  it('rejects expired codes and limits guesses to five attempts', async () => {
    const r = await service.register({
      name: 'Test',
      gender: 'male',
      phoneNumber: '01712345678',
      password: 'Password123',
    });
    const code = messages.send.mock.calls[0][1].match(/\d{6}/)[0];
    for (let i = 0; i < 5; i++)
      await expect(
        service.verify({ challengeId: r.challengeId, otp: '000000' }),
      ).rejects.toThrow();
    await expect(
      service.verify({ challengeId: r.challengeId, otp: code }),
    ).rejects.toThrow();
    await db
      .collection('identity_challenges')
      .updateOne(
        { id: r.challengeId },
        { $set: { attempts: 0, expiresAt: new Date(0) } },
      );
    await expect(
      service.verify({ challengeId: r.challengeId, otp: code }),
    ).rejects.toThrow();
  });

  it.each([
    '01712345678',
    '1712345678',
    '+8801712345678',
    '8801712345678',
    '০১৭১২৩৪৫৬৭৮',
  ])('registers %s using Bangladesh mobile OTP without requiring a country code', async (input) => {
    const result = await service.register({
      name: 'Bangladesh Test',
      gender: 'female',
      phoneNumber: input,
      password: 'Password123',
    });
    expect(messages.send).toHaveBeenCalledWith(
      '01712345678',
      expect.stringContaining('Niqaha.com OTP'),
    );
    const code = messages.send.mock.calls[0][1].match(/\d{6}/)[0];
    const verified = await service.verify({ challengeId: result.challengeId, otp: code });
    expect(verified.data.phoneNumber).toBe('01712345678');
    expect(verified.data.isPhoneVerified).toBe(true);
    expect(verified.data.isEmailVerified).not.toBe(true);
    const loggedIn = await service.login({ phoneNumber: input, password: 'Password123' });
    expect(loggedIn.user.phoneNumber).toBe('01712345678');
  });

  it('rejects international mobile numbers during registration', async () => {
    await expect(service.register({
      name: 'Not Bangladesh',
      gender: 'male',
      phoneNumber: '+14155550123',
      password: 'Password123',
    })).rejects.toThrow('শুধু বাংলাদেশের');
    expect(messages.send).not.toHaveBeenCalled();
  });

  const deliveredCode = () =>
    messages.send.mock.calls.at(-1)![1].match(/\d{6}/)[0];
  async function verifiedAccount(email = 'reset@example.com') {
    const r = await service.register({
      name: 'Reset Test',
      gender: 'male',
      email,
      password: 'Original123',
    });
    const v = await service.verify({
      challengeId: r.challengeId,
      otp: deliveredCode(),
    });
    return v.data;
  }
  it('resets by email, revokes old sessions, accepts the new password and rejects replay', async () => {
    const u = await verifiedAccount();
    const before = await users.findById(u._id).lean();
    const oldToken = await service.token(before);
    const r = await service.resetRequest({ email: ' RESET@example.com ' });
    const otp = deliveredCode();
    await service.reset({
      challengeId: r.challengeId,
      otp,
      newPassword: 'Changed123',
    });
    await expect(
      service.login({
        phoneNumber: 'reset@example.com',
        password: 'Original123',
      }),
    ).rejects.toThrow();
    const login = await service.login({
      phoneNumber: 'reset@example.com',
      password: 'Changed123',
    });
    expect(login.user._id).toEqual(u._id);
    expect(new JwtService().decode(oldToken).authVersion).toBe(0);
    expect(new JwtService().decode(login.access_token).authVersion).toBe(1);
    await expect(
      service.reset({
        challengeId: r.challengeId,
        otp,
        newPassword: 'Another123',
      }),
    ).rejects.toThrow();
  });
  it('resends after cooldown and only the latest reset challenge works', async () => {
    await verifiedAccount();
    const first = await service.resetRequest({
      phoneNumber: 'reset@example.com',
    });
    const oldCode = deliveredCode();
    await expect(
      service.resetRequest({ email: 'reset@example.com' }),
    ).rejects.toThrow('60 seconds');
    await db
      .collection('identity_challenges')
      .updateOne(
        { id: first.challengeId },
        { $set: { sentAt: new Date(Date.now() - 61000) } },
      );
    const next = await service.resetRequest({ email: 'reset@example.com' });
    await expect(
      service.reset({
        challengeId: first.challengeId,
        otp: oldCode,
        newPassword: 'Changed123',
      }),
    ).rejects.toThrow();
    await service.reset({
      challengeId: next.challengeId,
      otp: deliveredCode(),
      newPassword: 'Changed123',
    });
  });
  it('allows a safe retry after provider failure and does not retain a usable failed challenge', async () => {
    await verifiedAccount();
    messages.send.mockRejectedValueOnce(
      new Error('Synthetic provider unavailable'),
    );
    await expect(
      service.resetRequest({ email: 'reset@example.com' }),
    ).rejects.toThrow('unavailable');
    expect(
      await db
        .collection('identity_challenges')
        .countDocuments({ purpose: 'password-reset' }),
    ).toBe(0);
    await expect(
      service.resetRequest({ email: 'reset@example.com' }),
    ).resolves.toHaveProperty('challengeId');
  });
  it('admin normalizes both contacts, invalidates OTPs and sessions, and rejects contact conflicts', async () => {
    const u = await verifiedAccount();
    const admin = await users.create({
      name: 'Admin',
      role: 'admin',
      phoneNumber: '01712345678',
    });
    const r = await service.resetRequest({ email: 'reset@example.com' }),
      oldCode = deliveredCode();
    await expect(
      service.adminUpdateProfile(
        String(u._id),
        String(u._id),
        {},
        { email: 'hijack@example.com' },
      ),
    ).rejects.toThrow('Administrator');
    const result: any = await service.adminUpdateProfile(
      String(admin._id),
      String(u._id),
      { name: 'Edited' },
      {
        email: ' NEW@example.com ',
        phoneNumber: '+880 1812-345678',
      },
    );
    expect(result.email).toBe('new@example.com');
    expect(result.phoneNumber).toBe('01812345678');
    expect(result.isEmailVerified).toBe(false);
    expect(result.isPhoneVerified).toBe(false);
    expect(result.authVersion).toBe(1);
    expect(result.password).toBeUndefined();
    await expect(
      service.reset({
        challengeId: r.challengeId,
        otp: oldCode,
        newPassword: 'Changed123',
      }),
    ).rejects.toThrow();
    await expect(
      service.adminUpdateProfile(
        String(admin._id),
        String(u._id),
        {},
        { phoneNumber: '01712345678' },
      ),
    ).rejects.toThrow('already in use');
    await expect(
      service.adminUpdateProfile(
        String(admin._id),
        String(u._id),
        {},
        { email: null, phoneNumber: null },
      ),
    ).rejects.toThrow('at least one');
    await expect(
      service.login({
        phoneNumber: 'new@example.com',
        password: 'Original123',
      }),
    ).resolves.toHaveProperty('access_token');
  });
  it('combines admin filters against stored profiles and sorts deterministically', async () => {
    await users.create([
      {
        name: 'Match',
        gender: 'female',
        nationality: 'Bangladeshi',
        address: { district: 'Dhaka', upazila: 'Dhamrai' },
        age: 25,
        isSubscriber: true,
        verificationStatus: 'pending',
        biodataStatus: 'submitted',
        isEmailVerified: true,
        email: 'match@example.com',
        numberOfConnections: 4,
        occupational: { profession: 'doctor' },
        createdAt: new Date('2026-01-10'),
      },
      {
        name: 'Wrong district',
        gender: 'female',
        address: { district: 'Sylhet' },
        age: 25,
        isSubscriber: true,
        numberOfConnections: 4,
      },
      {
        name: 'Wrong age',
        gender: 'female',
        address: { district: 'Dhaka' },
        age: 45,
        isSubscriber: true,
        numberOfConnections: 4,
      },
    ]);
    const q = {
      gender: 'female',
      districtId: 'Dhaka',
      accountType: 'premium',
      verificationStatus: 'pending',
      biodataStatus: 'submitted',
      profession: ['doctor'],
      ageMin: 20,
      ageMax: 30,
      emailVerified: 'true',
      hasEmail: 'true',
      connectionsMin: 3,
      connectionsMax: 5,
      registeredFrom: '2026-01-01',
      registeredTo: '2026-01-31',
    };
    const found = await users
      .find(adminFilter(q))
      .sort(adminSort('oldest'))
      .lean();
    expect(found.map((v) => v.name)).toEqual(['Match']);
    expect(() =>
      adminFilter({ connectionsMin: 5, connectionsMax: 1 }),
    ).toThrow();
    expect(() =>
      adminFilter({ registeredFrom: '2026-02-01', registeredTo: '2026-01-01' }),
    ).toThrow();
  });

  it('verifies the Google audience, creates one account and reuses it on subsequent sign-in', async () => {
    const accountService: any = Object.assign(
      Object.create(UserService.prototype),
      {
        userModel: users,
        identity: service,
        configService: new ConfigService({
          GOOGLE_CLIENT_ID: 'synthetic-client',
        }),
        counterModel: {
          findOneAndUpdate: () => ({ lean: async () => ({ seq: 17 }) }),
        },
      },
    );
    const verify = jest
      .spyOn(OAuth2Client.prototype, 'verifyIdToken')
      .mockResolvedValue({
        getPayload: () => ({
          email: ' Google@Example.com ',
          email_verified: true,
          name: 'Google Test',
        }),
      } as any);
    try {
      const first = await accountService.loginWithGoogle('synthetic-token');
      expect(verify).toHaveBeenCalledWith({
        idToken: 'synthetic-token',
        audience: 'synthetic-client',
      });
      expect(first.isNewUser).toBe(true);
      expect(first.user.email).toBe('google@example.com');
      expect(first.access_token).toBeTruthy();
      const second = await accountService.loginWithGoogle('synthetic-token');
      expect(second.isNewUser).toBe(false);
      expect(String(second.user._id)).toBe(String(first.user._id));
      expect(await users.countDocuments({ email: 'google@example.com' })).toBe(
        1,
      );
      verify.mockRejectedValueOnce(new Error('Invalid signature'));
      await expect(
        accountService.loginWithGoogle('invalid'),
      ).rejects.toMatchObject({ status: 401 });
    } finally {
      verify.mockRestore();
    }
  });
  it('does not link Google to a password account with an unverified email', async () => {
    await users.create({
      name: 'Existing',
      email: 'google@example.com',
      phoneNumber: '01812345678',
      password: 'synthetic-hash',
      isOtpVerified: true,
      isEmailVerified: false,
    });
    const accountService: any = Object.assign(
      Object.create(UserService.prototype),
      {
        userModel: users,
        identity: service,
        configService: new ConfigService({
          GOOGLE_CLIENT_ID: 'synthetic-client',
        }),
        counterModel: {
          findOneAndUpdate: () => ({ lean: async () => ({ seq: 17 }) }),
        },
      },
    );
    const verify = jest
      .spyOn(OAuth2Client.prototype, 'verifyIdToken')
      .mockResolvedValue({
        getPayload: () => ({
          email: 'google@example.com',
          email_verified: true,
          name: 'Google Test',
        }),
      } as any);
    try {
      await expect(accountService.loginWithGoogle('synthetic')).rejects.toThrow(
        'verify this email',
      );
    } finally {
      verify.mockRestore();
    }
    accountService.configService = new ConfigService({});
    await expect(
      accountService.loginWithGoogle('synthetic'),
    ).rejects.toMatchObject({ status: 503 });
  });

  it('preserves optional email clearing and updates phone-only accounts through the admin DTO',async()=>{
    const admin=await users.create({name:'Admin',role:'admin',phoneNumber:'01712345678'});
    const u=await users.create({name:'Phone user',phoneNumber:'01812345678',isOtpVerified:true,isPhoneVerified:true});
    const dto=plainToInstance(UpdateUserDto,{id:String(u._id),phoneNumber:'01912345678',email:null});
    expect(dto.email).toBeNull();
    expect(await validate(dto)).toEqual([]);
    const result:any=await service.adminUpdateProfile(String(admin._id),String(u._id),{},dto);
    expect(result.phoneNumber).toBe('01912345678');expect(result.email).toBeUndefined();
    const reset=await service.resetRequest({phoneNumber:'01912345678'});
    await service.reset({challengeId:reset.challengeId,otp:deliveredCode(),newPassword:'NewPhone123'});
    await expect(service.login({phoneNumber:'01912345678',password:'NewPhone123'})).resolves.toHaveProperty('access_token');
  });
  it('cannot use a registration code to reset a password', async () => {
    const r = await service.register({
      name: 'Test',
      gender: 'male',
      email: 'test@example.com',
      password: 'Password123',
    });
    const code = messages.send.mock.calls[0][1].match(/\d{6}/)[0];
    await expect(
      service.reset({
        challengeId: r.challengeId,
        otp: code,
        newPassword: 'Changed123',
      }),
    ).rejects.toThrow();
  });
});

describe('OTP request validation and SMS submission', () => {
  it.each([
    { email: 'reset@example.com' },
    { phoneNumber: 'reset@example.com' },
    { phoneNumber: '+14155550123' },
    { phoneNumber: '01712345678' },
  ])('accepts supported reset contact %p', async (contact) => {
    expect(await validate(plainToInstance(ReqForDto, contact))).toEqual([]);
    expect(
      await validate(
        plainToInstance(NewPasswordResetWithOtp, {
          ...contact,
          challengeId: 'synthetic-session',
          otp: '123456',
          newPassword: 'Changed123',
        }),
      ),
    ).toEqual([]);
  });
  it('rejects weak passwords, invalid OTPs and missing challenge identifiers', async () => {
    const errors = await validate(
      plainToInstance(NewPasswordResetWithOtp, {
        phoneNumber: 'x@example.com',
        otp: 'abc',
        newPassword: 'short',
      }),
    );
    expect(errors.map((v) => v.property)).toEqual(
      expect.arrayContaining(['challengeId', 'otp', 'newPassword']),
    );
    expect(normalizePhone('+880 (1812) 345678')).toBe('01812345678');
    expect(() => normalizePhone('abc')).toThrow();
  });
  const config = new ConfigService({
    BULKSMSBD_API_KEY: 'fake-key',
    BULKSMSBD_SENDER_ID: 'fake-sender',
  });
  it.each([
    [1002, 'Sender ID'],
    [1007, 'Insufficient SMS balance'],
    [1012, 'Bengali'],
    [1032, 'not whitelisted'],
  ])('reports actionable BulkSMSBD response code %s without exposing provider data', async (code, explanation) => {
    const post = jest.fn().mockReturnValue(of({
      data: { response_code: code, error_message: 'Secret provider details' },
    }));
    const sms = new SmsService({ post } as any, config);
    await expect(
      sms.sendSms({ number: '01712345678', message: 'Test code 123456' }),
    ).rejects.toThrow(explanation as string);
    expect(post).toHaveBeenCalledTimes(1);
  });
  it.each([
    '01712345678',
    '1712345678',
    '8801712345678',
    '+8801712345678',
    '০১৭১২৩৪৫৬৭৮',
  ])('submits %s only through BulkSMSBD as a POST with Bangla-safe encoding', async (phone) => {
    const post = jest.fn().mockReturnValue(of({
      data: { response_code: '202', message_id: 'synthetic' },
    }));
    const sms = new SmsService({ post } as any, config);
    await expect(
      sms.sendSms({ number: phone, message: 'আপনার OTP: 123456' }),
    ).resolves.toMatchObject({ success: true });
    const [url, rawBody, opts] = post.mock.calls[0];
    const body = new URLSearchParams(rawBody);
    expect(url).toBe('https://bulksmsbd.net/api/smsapi');
    expect(body.get('number')).toBe('8801712345678');
    expect(body.get('message')).toBe('আপনার OTP: 123456');
    expect(body.get('api_key')).toBe('fake-key');
    expect(body.get('senderid')).toBe('fake-sender');
    expect(opts.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(opts.timeout).toBe(15000);
    expect(url).not.toContain('fake-key');
  });
  it('rejects international and invalid numbers without contacting BulkSMSBD', async () => {
    const post = jest.fn();
    const sms = new SmsService({ post } as any, config);
    for (const phone of ['+14155550123', '017123', '001712345678']) {
      await expect(sms.sendSms({ number: phone, message: 'Test' }))
        .rejects.toMatchObject({ status: 400 });
    }
    expect(post).not.toHaveBeenCalled();
  });
  it('reports a safe provider rejection sent with HTTP 403 and never leaks credentials', async () => {
    const post = jest.fn().mockReturnValue(throwError(() => ({
      response: { status: 403, data: { response_code: 1032, message: 'Server IP 203.0.113.5' } },
      config: { data: 'api_key=fake-key&message=Test+code+123456' },
    })));
    const sms = new SmsService({ post } as any, config);
    let message = '';
    try {
      await sms.sendSms({ number: '01712345678', message: 'Test code 123456' });
    } catch (e) {
      message = String((e as Error).message);
    }
    expect(message).toContain('1032');
    expect(message).not.toContain('fake-key');
    expect(message).not.toContain('203.0.113.5');
    expect(message).not.toContain('123456');
  });
  it('reads the official BulkSMSBD balance endpoint with no SMS submission', async () => {
    const post = jest.fn().mockReturnValue(of({ data: { response_code: 202, balance: '496' } }));
    const sms = new SmsService({ post } as any, config);
    await expect(sms.checkBalance()).resolves.toEqual({ success: true, balance: 496 });
    const [url, rawBody] = post.mock.calls[0];
    expect(url).toBe('https://bulksmsbd.net/api/getBalanceApi');
    expect(new URLSearchParams(rawBody).get('api_key')).toBe('fake-key');
    expect(url).not.toContain('fake-key');
  });
  it('routes Bangladesh OTP only to BulkSMSBD, leaves email separate and rejects international SMS', async () => {
    const sms = { sendSms: jest.fn().mockResolvedValue({ success: true }) };
    const gateway = new MessagingService(
      new ConfigService({
        RESEND_API_KEY: 'fake',
        EMAIL_FROM: 'test@example.com',
      }),
      sms as any,
    );
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      Response.json({ id: 'test-resend-email-id' }, { status: 200 }),
    );
    try {
      await gateway.send('+8801712345678', 'synthetic');
      expect(sms.sendSms).toHaveBeenCalledWith({
        number: '01712345678', message: 'synthetic',
      });
      await gateway.send('test@example.com', 'synthetic');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.resend.com/emails');
      await expect(gateway.send('+14155550123', 'synthetic'))
        .rejects.toThrow('Bangladesh mobile numbers only');
      expect(sms.sendSms).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      fetchMock.mockResolvedValueOnce(
        Response.json({ name: 'validation_error', message: 'sender not verified', statusCode: 403 }, { status: 403 }),
      );
      await expect(gateway.send('test@example.com', 'synthetic'))
        .rejects.toMatchObject({ status: 503 });
    } finally {
      fetchMock.mockRestore();
    }
  });
});
