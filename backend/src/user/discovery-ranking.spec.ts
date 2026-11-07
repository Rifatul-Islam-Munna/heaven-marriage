import { MongoMemoryServer } from 'mongodb-memory-server';
import { createConnection, Connection, Model } from 'mongoose';
import { PlatformService } from './platform.service';
import { PublicController } from './public.controller';
import { QuestionConfigService } from '../profile-questions/question-config.service';
import { User, UserSchema, UserType } from './entities/user.entity';
import { discoveryCycle, recordDiscoveryEvent } from './discovery-cycle';
import { dailyRotationExpression } from './discovery-selection';

describe('Public discovery ranking (real published member engagement)', () => {
  let mongo: MongoMemoryServer;
  let db: Connection;
  let users: Model<any>;
  let platform: PlatformService;
  let controller: PublicController;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    db = await createConnection(mongo.getUri(), { dbName: 'niqaha_public_discovery' }).asPromise();
    users = db.model(User.name, UserSchema);
    platform = new PlatformService(db, users, {} as any, {} as any, new QuestionConfigService(db));
    controller = new PublicController(platform, db);
    await platform.onModuleInit();
  }, 120000);
  afterAll(async () => { await db?.close(); await mongo?.stop(); });
  beforeEach(async () => {
    for (const collection of Object.values(db.collections)) await collection.deleteMany({});
    await db.collection('discovery_engagement').deleteMany({});
  });

  it('ranks by views, favourites and contact additions; recent by creation date', async () => {
    const make = async (name: string, score: {views: number; favourites: number; connections: number}, day: string,
      extra: Record<string, unknown> = {}) => users.create({
      name, userId: String(Math.floor(Math.random()*1000000)),
      email: name+'@hidden.example', phoneNumber: undefined,
      role: UserType.USER, isPublished: true, isPublishFromAdmin: true,
      verificationStatus: 'approved', createdAt: new Date(day),
      profileViews: score.views, profileInterests: score.favourites,
      profileContactRequests: score.connections,
      address: { district: 'Dhaka', presentAddress: 'SECRET STREET' },
      ...extra,
    });
    const low = await make('Low', {views: 4, favourites: 2, connections: 0}, '2026-10-01');
    const top = await make('Top', {views: 4, favourites: 1, connections: 3}, '2026-10-02');
    const newest = await make('Newest', {views: 0, favourites: 0, connections: 0}, '2026-10-03');
    await make('Hidden', {views: 10000, favourites: 1000, connections: 900}, '2026-10-04',
      { isPublishFromAdmin: false });
    await make('Staff', {views: 10000, favourites: 1000, connections: 900}, '2026-10-05',
      {role: UserType.ADMIN});

    for (let i = 0; i < 4; i++) {
      await recordDiscoveryEvent(db, String(low._id), 'views');
      await recordDiscoveryEvent(db, String(top._id), 'views');
    }
    for (let i = 0; i < 2; i++) await recordDiscoveryEvent(db, String(low._id), 'favourites');
    await recordDiscoveryEvent(db, String(top._id), 'favourites');
    for (let i = 0; i < 3; i++) await recordDiscoveryEvent(db, String(top._id), 'connections');

    const found=await platform.discovery();
    expect(found.popular.map(profile=>String(profile._id))).toEqual([
      String(top._id), String(low._id),
    ]);
    expect(found.recent.map(profile=>String(profile._id))).toEqual([
      String(newest._id),
    ]);
    expect(found.popular.map(profile=>profile.rankingPosition)).toEqual([1,2]);
    expect(found.recent[0].discoverySource).toBe('fresh');
    expect(new Set([...found.popular,...found.recent].map(profile=>String(profile._id))).size).toBe(3);
    expect(found.popular[0].engagement).toEqual({
      views: 4, favourites: 1, connections: 3,
    });
    const serialized=JSON.stringify(found);
    expect(serialized).not.toContain('@hidden.example');
    expect(serialized).not.toContain('SECRET STREET');
    expect(serialized).not.toContain('"name":"Top"');
  });

  it('does not carry old-cycle rank into a new 15-day cycle', async () => {
    const oldChampion = await users.create({
      name:'OldChampion', userId:'000010', role:UserType.USER,
      isPublished:true, isPublishFromAdmin:true, verificationStatus:'approved',
      profileViews:9999, profileInterests:900, profileContactRequests:300,
    });
    const current = await users.create({
      name:'Current', userId:'000011', role:UserType.USER,
      isPublished:true, isPublishFromAdmin:true, verificationStatus:'approved',
      profileViews:1,
    });
    const cycleStart = discoveryCycle().startsAt.getTime();
    await recordDiscoveryEvent(db, String(oldChampion._id), 'views', 1, new Date(cycleStart - 1000));
    await recordDiscoveryEvent(db, String(current._id), 'views');
    const result = await platform.discovery();
    expect(result.popular.map(p => String(p._id))).toEqual([String(current._id)]);
    expect(result.popular[0].engagement.views).toBe(1);
    expect(result.recent.map(p => String(p._id))).toContain(String(oldChampion._id));
    expect((await users.findById(oldChampion._id).lean())?.profileViews).toBe(9999);
  });

  it('rotates the biodata directory without moving profiles between pages during a day', async () => {
    await users.insertMany(Array.from({ length: 12 }, (_, i) => ({
      name: 'Published',
      userId: String(i + 1).padStart(6, '0'),
      role: UserType.USER,
      isPublished: true, isPublishFromAdmin: true, verificationStatus: 'approved',
      profileViews: i === 0 ? 5000 : 0,
    })));
    const order = async (day: string) =>
      (await users.aggregate([
        { $match: { role: UserType.USER, isPublished: true, isPublishFromAdmin: true } },
        { $addFields: { dailyRotation: dailyRotationExpression(new Date(day)) } },
        { $sort: { dailyRotation: 1, _id: 1 } },
        { $project: { userId: 1 } },
      ])).map(p => p.userId);
    const today = await order('2026-11-06T01:00:00Z');
    const later = await order('2026-11-06T23:00:00Z');
    const tomorrow = await order('2026-11-07T01:00:00Z');
    expect(today).toEqual(later);
    expect(today).not.toEqual(tomorrow);
    expect(new Set([...today.slice(0, 6), ...today.slice(6)])).toHaveProperty('size', 12);
    // Lifetime view champion is NOT permanently forced to the first position.
    expect([today[0], tomorrow[0]]).not.toEqual(['000001', '000001']);
  });

  it('respects admin discovery toggle for public visitors', async () => {
    const member=await users.create({
      name:'Published', userId:'9810', role:UserType.USER,
      isPublished:true, isPublishFromAdmin:true, verificationStatus:'approved',
    });
    const discovery = await controller.discovery();
    expect([...discovery.popular, ...discovery.recent].map(profile=>String(profile._id)))
      .toContain(String(member._id));
    expect(discovery.popular).toHaveLength(0); // Zero engagement is not a fake rank.
    await db.collection('platform_settings').insertOne({key:'public',discoveryEnabled:false});
    expect(await controller.discovery()).toEqual({popular:[],recent:[]});
  });
});
