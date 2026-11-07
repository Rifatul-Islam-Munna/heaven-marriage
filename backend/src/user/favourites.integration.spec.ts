import { MongoMemoryServer } from 'mongodb-memory-server';
import { createConnection, Connection, Model } from 'mongoose';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User, UserSchema, UserType } from './entities/user.entity';
import { Shortlist, ShortlistSchema } from './entities/shortlist.schema';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { QuestionConfigService } from '../profile-questions/question-config.service';
import { RolesGuard } from '../lib/roles.guard';
import { ROLES_KEY } from '../lib/roles.decorator';

describe('My Favourites and Who Favourited Me (isolated MongoDB)', () => {
  let mongo: MongoMemoryServer;
  let db: Connection;
  let users: Model<any>;
  let lists: Model<any>;
  let service: UserService;

  const profile = async (extra: Record<string, any> = {}) => users.create({
    name: 'Private person',
    role: UserType.USER,
    gender: 'female',
    email: 'secret@example.com',
    password: 'secret-hash',
    phoneNumber: null,
    isPublished: true,
    isPublishFromAdmin: true,
    verificationStatus: 'approved',
    age: 25,
    address: { district: 'Dhaka', presentAddress: 'Hidden residence' },
    ...extra,
  });

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    db = await createConnection(mongo.getUri(), { dbName: 'niqaha_favourites_tests' }).asPromise();
    users = db.model(User.name, UserSchema);
    lists = db.model(Shortlist.name, ShortlistSchema);
    const platform = { profile: async (target: string) => {
      const u = await users.findById(target).lean();
      if (!u?.isPublished || !u?.isPublishFromAdmin || u.verificationStatus === 'suspended')
        throw new Error('Profile unavailable');
      return u;
    } };
    const none = {} as any;
    service = new UserService(users, lists, none, none, none, none, none,
      none, none, none, none, none, none, platform as any, new QuestionConfigService(db));
  }, 120000);

  afterAll(async () => {
    await db?.close();
    await mongo?.stop();
  });
  beforeEach(async () => {
    for (const collection of Object.values(db.collections)) await collection.deleteMany({});
  });

  it('separates the two directions and never implies reciprocal interest', async () => {
    const me = await profile({ userId: '001' });
    const alice = await profile({ userId: '002' });
    const bob = await profile({ userId: '003' });
    const other = await profile({ userId: '004' });
    await lists.insertMany([
      { userId: alice._id, shortlistedUserId: [me._id] },
      { userId: bob._id, shortlistedUserId: [me._id] },
      { userId: me._id, shortlistedUserId: [other._id] },
    ]);
    const incoming = await service.getWhoFavouritedMe(String(me._id), {page: 1, limit: 12});
    const outgoing = await service.getShortlist(String(me._id), {page: 1, limit: 12});
    expect(incoming.totalItems).toBe(2);
    expect(new Set(incoming.data.map((u: any) => String(u._id)))).toEqual(
      new Set([String(alice._id), String(bob._id)]));
    expect(outgoing.totalItems).toBe(1);
    expect(String(outgoing.data[0]._id)).toBe(String(other._id));
    const output = JSON.stringify(incoming);
    for (const secret of ['secret@example.com', 'secret-hash', 'Private person',
      'Hidden residence', 'phoneNumber', 'guardianPhone']) {
      expect(output).not.toContain(secret);
    }
  });

  it('does not expose hidden, suspended or staff biodata in either direction', async () => {
    const me = await profile();
    const good = await profile({ userId: 'good' });
    const hidden = await profile({ isPublishFromAdmin: false });
    const suspended = await profile({ verificationStatus: 'suspended' });
    const staff = await profile({ role: UserType.ADMIN });
    await lists.insertMany([
      { userId: good._id, shortlistedUserId: [me._id] },
      { userId: hidden._id, shortlistedUserId: [me._id] },
      { userId: suspended._id, shortlistedUserId: [me._id] },
      { userId: staff._id, shortlistedUserId: [me._id] },
      { userId: me._id, shortlistedUserId: [good._id, hidden._id, suspended._id, staff._id] },
    ]);
    const received = await service.getWhoFavouritedMe(String(me._id), {});
    const given = await service.getShortlist(String(me._id), {});
    expect(received.totalItems).toBe(1);
    expect(given.totalItems).toBe(1);
    expect(String(received.data[0]._id)).toBe(String(good._id));
    expect(String(given.data[0]._id)).toBe(String(good._id));
  });

  it('deduplicates legacy repeated documents and pages results consistently', async () => {
    const me = await profile();
    const a = await profile();
    const b = await profile();
    await lists.insertMany([
      { userId: a._id, shortlistedUserId: [me._id, me._id] },
      { userId: a._id, shortlistedUserId: [me._id] },
      { userId: b._id, shortlistedUserId: [me._id] },
    ]);
    const first = await service.getWhoFavouritedMe(String(me._id), {page: 1, limit: 1});
    const second = await service.getWhoFavouritedMe(String(me._id), {page: 2, limit: 1});
    expect(first.totalItems).toBe(2);
    expect(first.data).toHaveLength(1);
    expect(second.totalItems).toBe(2);
    expect(second.data).toHaveLength(1);
    expect(String(first.data[0]._id)).not.toBe(String(second.data[0]._id));
  });

  it('creates favourite once, rejects self-save, removes only my save and updates reverse view', async () => {
    const me = await profile();
    const target = await profile({profileInterests: 0});
    await expect(service.addToShortList({shortlistedUserId: String(me._id)}, String(me._id)))
      .rejects.toThrow('own biodata');
    const first = await service.addToShortList(
      { shortlistedUserId: String(target._id) }, String(me._id));
    const twice = await service.addToShortList(
      { shortlistedUserId: String(target._id) }, String(me._id));
    expect(first.created).toBe(true);
    expect(twice.created).toBe(false);
    expect((await db.collection('discovery_engagement').findOne({ profileId: target._id }))?.favourites).toBe(1);
    expect((await users.findById(target._id).lean())?.profileInterests).toBe(1);
    expect((await service.getWhoFavouritedMe(String(target._id), {})).totalItems).toBe(1);
    const removal = await service.removeFromShortList(
      { shortlistedUserId: String(target._id) }, String(me._id));
    expect(removal.removed).toBe(true);
    expect((await service.getWhoFavouritedMe(String(target._id), {})).totalItems).toBe(0);
    expect((await service.getShortlist(String(me._id), {})).totalItems).toBe(0);
    expect((await users.findById(target._id).lean())?.profileInterests).toBe(0);
    expect((await db.collection('discovery_engagement').findOne({ profileId: target._id }))?.favourites).toBe(0);
    expect((await service.removeFromShortList(
      { shortlistedUserId: String(target._id) }, String(me._id))).removed).toBe(false);
    expect((await users.findById(target._id).lean())?.profileInterests).toBe(0);
  });

  it('removes favourites from duplicate legacy shortlist records', async () => {
    const me = await profile();
    const target = await profile();
    await lists.insertMany([
      { userId: me._id, shortlistedUserId: [target._id] },
      { userId: me._id, shortlistedUserId: [target._id] },
    ]);
    expect((await service.getWhoFavouritedMe(String(target._id), {})).totalItems).toBe(1);
    expect((await service.removeFromShortList(
      { shortlistedUserId: String(target._id) }, String(me._id))).removed).toBe(true);
    expect((await service.getWhoFavouritedMe(String(target._id), {})).totalItems).toBe(0);
    expect((await service.getShortlist(String(me._id), {})).totalItems).toBe(0);
  });

  it('does not count concurrent duplicate favourites more than once', async () => {
    const me = await profile();
    const target = await profile({ profileInterests: 0 });
    await Promise.all(Array.from({ length: 6 }, () =>
      service.addToShortList({ shortlistedUserId: String(target._id) }, String(me._id))));
    expect((await service.getShortlist(String(me._id), {})).totalItems).toBe(1);
    expect((await service.getWhoFavouritedMe(String(target._id), {})).totalItems).toBe(1);
    expect((await users.findById(target._id).lean())?.profileInterests).toBe(1);
    expect((await db.collection('discovery_engagement').findOne({ profileId: target._id }))?.favourites).toBe(1);
  });

  it('restricts all four favourite APIs to authenticated members', () => {
    const guard = new RolesGuard(new Reflector());
    const routes = [
      UserController.prototype.getMyShortList,
      UserController.prototype.getWhoFavouritedMe,
      UserController.prototype.AddToShortList,
      UserController.prototype.RemoveFromShortList,
    ];
    for (const handler of routes) {
      const requiredRoles = Reflect.getMetadata(ROLES_KEY, handler);
      expect(requiredRoles).toEqual([UserType.USER]);
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(RolesGuard);
      const context = (role: UserType) => ({
        getHandler: () => handler,
        getClass: () => UserController,
        switchToHttp: () => ({getRequest: () => ({ user: {id:'me',role} })}),
      }) as unknown as ExecutionContext;
      expect(guard.canActivate(context(UserType.USER))).toBe(true);
      expect(() => guard.canActivate(context(UserType.ADMIN))).toThrow(ForbiddenException);
    }
    expect(Reflect.getMetadata(PATH_METADATA, UserController.prototype.getWhoFavouritedMe))
      .toBe('get-who-favourited-me');
  });
});
