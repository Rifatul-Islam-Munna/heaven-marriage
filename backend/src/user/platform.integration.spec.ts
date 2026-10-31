import { MongoMemoryServer } from 'mongodb-memory-server';
import { createConnection, Connection, Model } from 'mongoose';
import { PlatformService } from './platform.service';
import { QuestionConfigService } from '../profile-questions/question-config.service';
import { User, UserSchema } from './entities/user.entity';
import { publicProfile, editableProfile, profileUpdateSet, profileUpdatePreview } from './profile-rules';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserDto } from './dto/update-user.dto';
describe('Connection authorization and payment integrity (isolated MongoDB)', () => {
  let mongo: MongoMemoryServer,
    db: Connection,
    users: Model<any>,
    service: PlatformService;
  const bkash = {
    createPayment: jest.fn(),
    executePayment: jest.fn(),
    queryPayment: jest.fn(),
  };
  const messages = { send: jest.fn() };
  const account = async (extra: any = {}) =>
    users.create({
      name: 'Private name',
      gender: 'male',
      isPublished: true,
      isPublishFromAdmin: true,
      verificationStatus: 'approved',
      numberOfConnections: 0,
      ...extra,
    });
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    db = await createConnection(mongo.getUri(), {
      dbName: 'niqaha_upgrade_tests',
    }).asPromise();
    users = db.model(User.name, UserSchema);
    service = new PlatformService(db, users, bkash as any, messages as any, new QuestionConfigService(db));
    await service.onModuleInit();
  }, 120000);
  afterAll(async () => {
    await db?.close();
    await mongo?.stop();
  });
  beforeEach(async () => {
    for (const c of Object.values(db.collections)) await c.deleteMany({});
    jest.clearAllMocks();
  });
  it('never sends identity, account credentials, contacts or detailed address before unlock', () => {
    const u = {
      _id: 'x',
      userId: '100',
      name: 'secret',
      fatherName: 'father',
      motherName: 'mother',
      phoneNumber: '01712345678',
      guardianPhone: '01912345678',
      email: 'x@example.com',
      password: 'hash',
      address: { district: 'Sylhet', presentAddress: 'private street' },
      customFields: { phone: 'secret' },
    };
    const json = JSON.stringify(publicProfile(u));
    for (const word of [
      'secret',
      'father',
      'mother',
      '01712345678',
      '01912345678',
      'x@example.com',
      'hash',
      'private street',
    ])
      expect(json).not.toContain(word);
    expect(publicProfile(u, true).fatherName).toBe('father');
  });
  it('rejects protected fields and Mongo operators from self-profile edits', () => {
    expect(
      editableProfile({
        role: 'admin',
        numberOfConnections: 999,
        isSubscriber: true,
      }),
    ).toEqual({});
    expect(() => editableProfile({ address: { $set: 'x' } })).toThrow();
  });
  it('keeps incomplete nested DTO draft data valid', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      address: { district: 'Sylhet' },
      personalInformation: { height: 5.5 },
    });
    expect(await validate(dto)).toEqual([]);
  });
  it('updates just the edited biodata fields without deleting saved siblings or credits', async () => {
    const person = await account({
      motherName: 'Old mother',
      familyInfo: { fathersProfession: 'Teacher', mothersProfession: 'Homemaker', brotherCount: 2 },
      address: { district: 'Dhaka', upazila: 'Savar' },
      numberOfConnections: 7,
    });
    const changes = editableProfile({
      motherName: 'New mother',
      familyInfo: { mothersProfession: 'Engineer' },
      address: { district: 'Sylhet' },
      numberOfConnections: 9999,
      role: 'admin',
    });
    const set = profileUpdateSet({ ...changes, draftStep: 2 });
    expect(set).toEqual({
      motherName: 'New mother',
      'familyInfo.mothersProfession': 'Engineer',
      'address.district': 'Sylhet',
      draftStep: 2,
    });
    const updated = await users.findByIdAndUpdate(person._id, { $set: set }, {
      new: true, runValidators: true,
    }).lean();
    expect(updated?.motherName).toBe('New mother');
    expect(updated?.familyInfo?.fathersProfession).toBe('Teacher');
    expect(updated?.familyInfo?.brotherCount).toBe(2);
    expect(updated?.familyInfo?.mothersProfession).toBe('Engineer');
    expect(updated?.address?.district).toBe('Sylhet');
    expect(updated?.address?.upazila).toBe('Savar');
    expect(updated?.numberOfConnections).toBe(7);
    expect(updated?.role).not.toBe('admin');
    const preview = profileUpdatePreview(person.toObject(), changes);
    expect((preview.familyInfo as any).fathersProfession).toBe('Teacher');
    expect((preview.familyInfo as any).mothersProfession).toBe('Engineer');
  });
  it('requires publication even if a connection exists', async () => {
    const a = await account({ numberOfConnections: 1 }),
      b = await account({ isPublished: false });
    await expect(
      service.unlock(String(a._id), String(b._id)),
    ).rejects.toThrow();
    await expect(
      service.profile(String(b._id), String(a._id)),
    ).rejects.toThrow();
  });
  it('does not allow a connection to unlock another profile or another account', async () => {
    const a = await account({ numberOfConnections: 1 }),
      b = await account({ fatherName: 'secret father' }),
      c = await account(),
      d = await account();
    await service.unlock(String(a._id), String(b._id));
    expect(
      (await service.profile(String(b._id), String(a._id))).fatherName,
    ).toBe('secret father');
    expect(
      (await service.profile(String(c._id), String(a._id))).identityUnlocked,
    ).toBe(false);
    expect(
      (await service.profile(String(b._id), String(d._id))).identityUnlocked,
    ).toBe(false);
  });
  it('deducts only once for concurrent duplicate unlocks', async () => {
    const a = await account({ numberOfConnections: 1 }),
      b = await account();
    await Promise.all(
      Array.from({ length: 12 }, () =>
        service.unlock(String(a._id), String(b._id)),
      ),
    );
    const u = await users.findById(a._id).lean();
    expect(u.numberOfConnections).toBe(0);
    expect(u.connectionUnlocks).toHaveLength(1);
  });
  it('does not overspend one credit across different profiles', async () => {
    const a = await account({ numberOfConnections: 1 }),
      b = await account(),
      c = await account();
    const r = await Promise.allSettled([
      service.unlock(String(a._id), String(b._id)),
      service.unlock(String(a._id), String(c._id)),
    ]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect((await users.findById(a._id)).numberOfConnections).toBe(0);
  });
  it('honors ten-credit package quantities', async () => {
    const a = await account({
      numberOfConnections: 10,
      connectionGrants: [
        { id: 'pkg', quantity: 10, used: 0, status: 'active' },
      ],
    });
    for (let i = 0; i < 10; i++) {
      const b = await account();
      await service.unlock(String(a._id), String(b._id));
    }
    const extra = await account();
    await expect(
      service.unlock(String(a._id), String(extra._id)),
    ).rejects.toThrow();
    const s = await service.connections(String(a._id));
    expect(s).toMatchObject({ total: 10, used: 10, remaining: 0 });
  });
  it('grants a verified payment exactly once even when callbacks repeat', async () => {
    const a = await account(),
      id = 'order-1',
      paymentId = 'payment-1';
    await db
      .collection('connection_orders')
      .insertOne({
        id,
        paymentId,
        userId: String(a._id),
        quantity: 5,
        amount: 500,
        currency: 'BDT',
        status: 'pending',
      });
    bkash.executePayment.mockResolvedValue({
      paymentID: paymentId,
      payerReference: id,
      transactionStatus: 'Completed',
      amount: '500',
      currency: 'BDT',
      trxID: 'verified',
    });
    await Promise.all(
      Array.from({ length: 6 }, () => service.executePayment(paymentId)),
    );
    const u = await users.findById(a._id).lean();
    expect(u.numberOfConnections).toBe(5);
    expect(u.connectionGrants).toHaveLength(1);
  });
  it('denies credits for wrong amounts, currencies and pending payments', async () => {
    const a = await account();
    for (const [i, result] of [
      { amount: '1', currency: 'BDT', transactionStatus: 'Completed' },
      { amount: '500', currency: 'USD', transactionStatus: 'Completed' },
      { amount: '500', currency: 'BDT', transactionStatus: 'Pending' },
    ].entries()) {
      const paymentId = 'p' + i;
      await db
        .collection('connection_orders')
        .insertOne({
          id: 'o' + i,
          paymentId,
          userId: String(a._id),
          quantity: 5,
          amount: 500,
          currency: 'BDT',
          status: 'pending',
        });
      bkash.executePayment.mockResolvedValue({
        ...result,
        paymentID: paymentId,
        payerReference: 'o' + i,
      });
      bkash.queryPayment.mockResolvedValue({
        ...result,
        paymentID: paymentId,
        payerReference: 'o' + i,
      });
      expect((await service.executePayment(paymentId)).success).toBe(false);
    }
    expect((await users.findById(a._id)).numberOfConnections).toBe(0);
  });
  it('revokes only the refunded payment credits and linked permissions', async () => {
    const a = await account({
        numberOfConnections: 2,
        connectionGrants: [{ id: 'p', quantity: 2, used: 0, status: 'active' }],
      }),
      b = await account();
    await service.unlock(String(a._id), String(b._id));
    await db
      .collection('connection_orders')
      .insertOne({
        id: 'o',
        paymentId: 'p',
        userId: String(a._id),
        status: 'paid',
      });
    await service.refund('admin', 'o', {
      confirmMoneyReversed: true,
      reason: 'Refund verified',
      transactionReference: 'r',
    });
    await service.refund('admin', 'o', {
      confirmMoneyReversed: true,
      reason: 'Retry',
      transactionReference: 'r',
    });
    expect((await users.findById(a._id)).numberOfConnections).toBe(0);
    expect(
      (await service.profile(String(b._id), String(a._id))).identityUnlocked,
    ).toBe(false);
  });

  it('saves the actual empty form defaults without rejecting incomplete drafts', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      name: 'Test user',
      gender: 'male',
      maritalStatus: '',
      nationality: '',
      phoneNumber: '01712345678',
      familyInfo: { brotherCount: 0, sisterCount: 0 },
      personalInformation: { height: 0, skinTone: '' },
      educationInfo: { currentlyDoingHightEducation: false },
      pledge: {
        youGordianKnowsThis: false,
        allTheInformationTrue: false,
        anyMisInformationWeAreNotKnowing: false,
      },
    });
    expect(await validate(dto)).toEqual([]);
  });
  it('deduplicates verification of existing manual payments', async () => {
    const a = await account();
    const pkg = await db
      .collection('pricings')
      .insertOne({ title: 'Five', originalPrice: 500, numberOfConnections: 5 });
    await db.collection('connection_orders').insertOne({
      id: 'legacy-manual-order',
      paymentId: 'manual:bkash:unique-txn',
      userId: String(a._id),
      packageId: String(pkg.insertedId),
      packageName: 'Five',
      quantity: 5,
      amount: 500,
      currency: 'BDT',
      status: 'pending_manual',
      createdAt: new Date(),
    });
    const order = await db
      .collection('connection_orders')
      .findOne({ userId: String(a._id) });
    expect((await users.findById(a._id)).numberOfConnections).toBe(0);
    await Promise.all([
      service.verifyManualPayment('admin', order!.id, {
        confirm: true,
        reason: 'Verified',
      }),
      service.verifyManualPayment('admin', order!.id, {
        confirm: true,
        reason: 'Retry',
      }),
    ]);
    expect((await users.findById(a._id)).numberOfConnections).toBe(5);
  });
  it('keeps grant refunds consistent after an audited balance reduction', async () => {
    const a = await account({
        numberOfConnections: 5,
        connectionGrants: [{ id: 'p', quantity: 5, used: 0, status: 'active' }],
      }),
      b = await account();
    await service.unlock(String(a._id), String(b._id));
    await service.setBalance(
      'admin',
      String(a._id),
      2,
      'Support correction',
      'request-1',
    );
    await service.setBalance(
      'admin',
      String(a._id),
      2,
      'Network retry',
      'request-1',
    );
    await db
      .collection('connection_orders')
      .insertOne({
        id: 'o',
        paymentId: 'p',
        userId: String(a._id),
        status: 'paid',
      });
    await service.refund('admin', 'o', {
      confirmMoneyReversed: true,
      transactionReference: 'r',
      reason: 'Verified refund',
    });
    const u = await users.findById(a._id).lean();
    expect(u.numberOfConnections).toBe(0);
    expect(u.connectionAdjustments).toHaveLength(1);
  });
});
