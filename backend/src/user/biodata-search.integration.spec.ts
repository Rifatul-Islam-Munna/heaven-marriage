import { MongoMemoryServer } from 'mongodb-memory-server';
import { createConnection, Connection, Model } from 'mongoose';
import { User, UserSchema, UserType } from './entities/user.entity';
import { UserService } from './user.service';
import { PlatformService } from './platform.service';
import { QuestionConfigService } from '../profile-questions/question-config.service';
import { adminFilter } from './profile-rules';
import { biodataIdFilter } from './biodata-id';

describe('Displayed biodata ID lookup (isolated MongoDB)', () => {
  let mongo: MongoMemoryServer, db: Connection, users: Model<any>;
  let discovery: UserService, profiles: PlatformService;
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    db = await createConnection(mongo.getUri()).asPromise();
    users = db.model(User.name, UserSchema);
    discovery = Object.create(UserService.prototype);
    Object.assign(discovery, { userModel: users, logger: { debug: jest.fn() } });
    profiles = new PlatformService(db, users, {} as any, {} as any, new QuestionConfigService(db));
    await users.create([
      { userId: '001319', name: 'Visible', phoneNumber: '01711111111', role: UserType.USER, gender: 'male', age: 55,
        isPublished: true, isPublishFromAdmin: true, verificationStatus: 'approved' },
      { userId: '001320', role: UserType.USER, gender: 'female',
        isPublished: true, isPublishFromAdmin: true, verificationStatus: 'approved' },
      { userId: '001321', role: UserType.USER, gender: 'male',
        isPublished: false, isPublishFromAdmin: true },
      { userId: '001322', role: UserType.USER, gender: 'male',
        isPublished: true, isPublishFromAdmin: false },
      { userId: '001323', role: UserType.USER, gender: 'male',
        isPublished: true, isPublishFromAdmin: true, verificationStatus: 'suspended' },
      { userId: '001324', role: UserType.USER, gender: 'male',
        isPublished: true, isPublishFromAdmin: true, verificationStatus: 'rejected' },
    ].map(profile => ({ name: 'Test member', ...profile })));
    await users.init();
  }, 120000);
  afterAll(async () => { await db?.close(); await mongo?.stop(); });

  it.each(['NG-001319', 'ng-001319', ' NG-001319 ', '#NG-001319',
    'NG–০০১৩১৯', '001319', '1319', '০০১৩১৯'])('finds %s despite default browse filters', async query => {
    const result = await discovery.findAll({ query, ageMin: 10, ageMax: 40,
      heightMin: 4, heightMax: 7, page: 1 });
    expect(result.docs.map(u => u.userId)).toEqual(['001319']);
    expect(result.totalDocs).toBe(1);
    expect((await profiles.profile(query)).userId).toBe('001319');
    expect((await users.find(adminFilter({ query })).lean()).map(u => u.userId)).toEqual(['001319']);
  });
  it('keeps NB and NG prefixes specific to their gender', async () => {
    expect((await discovery.findAll({ query: 'NB-001320' })).totalDocs).toBe(1);
    expect((await discovery.findAll({ query: 'NB-001319' })).totalDocs).toBe(0);
    await expect(profiles.profile('NB-001319')).rejects.toThrow('Profile unavailable');
  });
  it('returns direct lookups on page one after browsing later pages', async () => {
    const result = await discovery.findAll({ query: 'NG-001319', page: 5 });
    expect(result.page).toBe(1);
    expect(result.docs.map(u => u.userId)).toEqual(['001319']);
  });
  it.each(['001321', '001322', '001323', '001324'])('does not expose hidden profile %s', async query => {
    expect((await discovery.findAll({ query })).totalDocs).toBe(0);
    await expect(profiles.profile(query)).rejects.toThrow('Profile unavailable');
  });
  it('preserves ordinary text searches and does not interpret regex text as an ID', () => {
    expect(biodataIdFilter('NG-.*')).toBeUndefined();
    expect(biodataIdFilter('Dhaka')).toBeUndefined();
    expect(adminFilter({ query: ' Dhaka ' }).$text).toEqual({ $search: 'Dhaka' });
    expect(adminFilter({ query: '01711111111' }).$text).toEqual({ $search: '01711111111' });
  });
  it('preserves name/contact searches and normal browse filters', async () => {
    expect((await discovery.findAll({ query: 'Visible', ageMax: 40 })).totalDocs).toBe(0);
    expect((await discovery.findAll({ query: 'Visible', ageMax: 60 })).totalDocs).toBe(1);
    expect((await users.find(adminFilter({ query: '01711111111' })).lean()).map(u => u.userId)).toEqual(['001319']);
  });
});
