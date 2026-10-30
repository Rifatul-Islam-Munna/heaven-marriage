import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createConnection, Connection, Types } from 'mongoose';
import request from 'supertest';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthGuard, OptionalAuthGuard } from '../lib/auth.guard';
import { RolesGuard } from '../lib/roles.guard';
describe('HTTP authorization boundaries', () => {
  let mongo: MongoMemoryServer,
    db: Connection,
    app: INestApplication,
    jwt: JwtService,
    userId: string,
    adminId: string;
  const service = {
    update: jest.fn((payload, actor) => ({
      id: payload.id,
      actor,
      email: payload.email,
      phoneNumber: payload.phoneNumber,
    })),
    createRequestNumber: jest.fn((payload, actor) => ({
      actor,
      target: payload.requestUserId,
    })),
    findOne: jest.fn(() => ({ identityUnlocked: false })),
    finMyProfile: jest.fn(() => ({ ok: true })),
  };
  const secret = 'isolated-http-test-secret';
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    db = await createConnection(mongo.getUri(), {
      dbName: 'niqaha_http_tests',
    }).asPromise();
    userId = String(new Types.ObjectId());
    adminId = String(new Types.ObjectId());
    await db.collection('users').insertMany([
      { _id: new Types.ObjectId(userId), role: 'user', authVersion: 0 },
      { _id: new Types.ObjectId(adminId), role: 'admin', authVersion: 0 },
    ]);
    const m = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }])],
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: service },
        {
          provide: ConfigService,
          useValue: new ConfigService({ ACCESS_TOKEN: secret }),
        },
        JwtService,
        { provide: getConnectionToken(), useValue: db },
        AuthGuard,
        OptionalAuthGuard,
        RolesGuard,
      ],
    }).compile();
    app = m.createNestApplication();
    await app.init();
    jwt = m.get(JwtService);
  }, 120000);
  afterAll(async () => {
    await app?.close();
    await db?.close();
    await mongo?.stop();
  });
  const token = (id: string, role = 'user') =>
    jwt.sign({ id, role, authVersion: 0 }, { secret });
  it('denies the admin profile endpoint to anonymous and ordinary accounts', async () => {
    await request(app.getHttpServer())
      .get('/user/get-user-profile-admin?id=' + userId)
      .expect(401);
    await request(app.getHttpServer())
      .get('/user/get-user-profile-admin?id=' + userId)
      .set('access_token', token(userId))
      .expect(403);
    await request(app.getHttpServer())
      .get('/user/get-user-profile-admin?id=' + userId)
      .set('access_token', token(adminId, 'admin'))
      .expect(200);
  });
  it('restricts contact edits to administrators and passes the verified actor', async () => {
    const payload = {
      id: userId,
      email: 'edited@example.com',
      phoneNumber: '01812345678',
    };
    await request(app.getHttpServer())
      .patch('/user/update-user-admin')
      .send(payload)
      .expect(401);
    await request(app.getHttpServer())
      .patch('/user/update-user-admin')
      .set('access_token', token(userId))
      .send(payload)
      .expect(403);
    const r = await request(app.getHttpServer())
      .patch('/user/update-user-admin')
      .set('access_token', token(adminId, 'admin'))
      .send(payload)
      .expect(200);
    expect(r.body.actor).toBe(adminId);
    expect(r.body.email).toBe(payload.email);
    expect(r.body.phoneNumber).toBe(payload.phoneNumber);
  });
  it('checks current database role rather than trusting an old admin JWT claim', async () => {
    await request(app.getHttpServer())
      .get('/user/get-user-profile-admin?id=' + userId)
      .set('access_token', token(userId, 'admin'))
      .expect(403);
  });
  it('binds an unlock to the authenticated actor and ignores a spoofed payer ID', async () => {
    const r = await request(app.getHttpServer())
      .post('/user/request-for-number')
      .set('access_token', token(userId))
      .send({ userId: adminId, requestUserId: adminId })
      .expect(201);
    expect(r.body.actor).toBe(userId);
  });
  it('permits anonymous public viewing through the optional guard', async () => {
    await request(app.getHttpServer())
      .get('/user/get-one-user?id=000123')
      .expect(200);
  });
  it('allows suspended users to read their status while blocking an unlock', async () => {
    const id = String(new Types.ObjectId());
    await db
      .collection('users')
      .insertOne({
        _id: new Types.ObjectId(id),
        role: 'user',
        authVersion: 0,
        verificationStatus: 'suspended',
      });
    await request(app.getHttpServer())
      .get('/user/get-my-profile')
      .set('access_token', token(id))
      .expect(200);
    await request(app.getHttpServer())
      .post('/user/request-for-number')
      .set('access_token', token(id))
      .send({ userId: id, requestUserId: adminId })
      .expect(401);
  });
});
