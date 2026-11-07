import { MongoMemoryServer } from 'mongodb-memory-server';
import { createConnection, Connection, Model } from 'mongoose';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { PlatformController } from './platform.controller';
import { UserService } from './user.service';
import { User, UserSchema, UserType } from './entities/user.entity';
import { QuestionConfigService, BUILTINS } from '../profile-questions/question-config.service';
import { biodataStage, hasSubmittedBiodata } from './biodata-lifecycle';
import { RolesGuard } from '../lib/roles.guard';
import { ROLES_KEY } from '../lib/roles.decorator';

describe('Biodata deletion requests and submission lifecycle (isolated MongoDB)', () => {
  let mongo: MongoMemoryServer;
  let db: Connection;
  let users: Model<any>;
  let service: PlatformService;
  let writer: UserService;
  const account = async (extra: Record<string, unknown> = {}) =>
    users.create({
      role: UserType.USER,
      name: 'Saved identity',
      email: 'private@example.com',
      phoneNumber: extra.role === UserType.ADMIN || extra.role === UserType.MANAGER ? null : '01711111111',
      gender: 'male',
      age: 25,
      isPublished: true,
      isPublishFromAdmin: true,
      verificationStatus: 'approved',
      biodataStatus: 'approved',
      address: { district: 'Dhaka', presentAddress: 'Some street' },
      occupational: { profession: 'doctor' },
      expectedLifePartner: { age: '20-25', district: 'Dhaka' },
      ...extra,
    });

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    db = await createConnection(mongo.getUri(), { dbName: 'niqaha_deletion_tests' }).asPromise();
    users = db.model(User.name, UserSchema);
    const questions = new QuestionConfigService(db);
    service = new PlatformService(db, users, {} as any, { send: jest.fn() } as any, questions);
    await service.onModuleInit();
    writer = Object.assign(Object.create(UserService.prototype), {
      userModel: users,
      questions: { get: async () => ({
        questions: BUILTINS.filter(question => question.path === 'age'),
      }) },
    });
  }, 120000);
  afterAll(async () => { await db?.close(); await mongo?.stop(); });
  beforeEach(async () => {
    for (const collection of Object.values(db.collections)) await collection.deleteMany({});
  });

  it('request is non-destructive, tracks Pending and deduplicates repeated requests', async () => {
    const member = await account();
    const id = String(member._id);
    const first = await service.requestBiodataDeletion(id, { message: 'Please delete my biodata' });
    const duplicate = await service.requestBiodataDeletion(id);
    expect(first.status).toBe('pending');
    expect(duplicate.id).toBe(first.id);
    const saved = await users.findById(member._id).lean();
    expect(saved?.address?.district).toBe('Dhaka');
    expect(saved?.isPublished).toBe(true);
    expect(saved?.isPublishFromAdmin).toBe(true);
    expect(saved?.deletionRequested).toBe(true);
    const tracked = await service.myDeletionRequest(id);
    expect(tracked?.status).toBe('pending');
    expect(tracked?.id).toBe(first.id);
    expect(tracked).not.toHaveProperty('adminNotes');
    expect(await db.collection('service_cases').countDocuments({userId:id,kind:'deletion'})).toBe(1);
  });

  it('only administrator explicitly approves; approval removes biodata but keeps login and history', async () => {
    const member = await account(), admin = await account({role:UserType.ADMIN});
    const memberId = String(member._id), adminId=String(admin._id);
    const request = await service.requestBiodataDeletion(memberId);
    await expect(service.caseAction(adminId, request.id, {
      status: 'approved', reason: 'Member requested removal',
    })).rejects.toThrow('confirmation');
    const staff = await account({role:UserType.MANAGER});
    await expect(service.caseAction(String(staff._id), request.id, {
      status: 'approved', reason: 'Staff attempt', confirmDeletion: true,
    })).rejects.toThrow(ForbiddenException);
    const before = await users.findById(member._id).lean();
    expect(before?.address?.district).toBe('Dhaka');
    const done = await service.caseAction(adminId, request.id, {
      status: 'approved', reason: 'Member requested removal', confirmDeletion: true,
    });
    expect(done.status).toBe('approved');
    const after = await users.findById(member._id).lean();
    expect(after?.name).toBe('Saved identity');
    expect(after?.email).toBe('private@example.com');
    expect(after?.phoneNumber).toBe('01711111111');
    expect(after?.role).toBe(UserType.USER);
    expect(after?.gender).toBeUndefined();
    expect(after?.age).toBeUndefined();
    expect(after?.occupational).toBeUndefined();
    expect(after?.expectedLifePartner).toBeUndefined();
    expect(after?.address).toBeUndefined();
    expect(after?.isPublished).toBe(false);
    expect(after?.isPublishFromAdmin).toBe(false);
    expect(after?.biodataStatus).toBe('deleted');
    expect(biodataStage(after, 0)).toBe('deleted');
    expect((await service.myDeletionRequest(memberId))?.decisionReason).toBe('Member requested removal');
    const audit = await db.collection('platform_audit').findOne({ action: 'deletion.approved' });
    expect(audit).toBeTruthy();
    await expect(service.requestBiodataDeletion(memberId)).resolves.toHaveProperty('status','approved');
    await expect(service.caseAction(adminId, request.id, {
      status: 'approved', reason: 'Repeated attempt', confirmDeletion: true,
    })).rejects.toThrow();
    await expect(writer.updatedFullUserInformation({ age: 27 } as any, memberId))
      .rejects.toThrow(ForbiddenException);
  });

  it('reject preserves biodata and allows another deletion request', async () => {
    const member = await account(), admin = await account({ role: UserType.ADMIN });
    const id=String(member._id), adminId=String(admin._id);
    const first=await service.requestBiodataDeletion(id);
    const rejected=await service.caseAction(adminId, first.id, {
      status: 'rejected', reason: 'Member needs to confirm details',
    });
    expect(rejected.status).toBe('rejected');
    const intact=await users.findById(member._id).lean();
    expect(intact?.address?.district).toBe('Dhaka');
    expect(intact?.isPublishFromAdmin).toBe(true);
    expect(intact?.deletionRequested).toBe(false);
    expect((await service.myDeletionRequest(id))?.status).toBe('rejected');
    const second=await service.requestBiodataDeletion(id);
    expect(second.id).not.toBe(first.id);
    expect((await service.myDeletionRequest(id))?.status).toBe('pending');
  });

  it('both deletion endpoints require authenticated member role', () => {
    const guard=new RolesGuard(new Reflector());
    for (const handler of [PlatformController.prototype.deletionRequest,
      PlatformController.prototype.requestDeletion]) {
      expect(Reflect.getMetadata(ROLES_KEY,handler)).toEqual([UserType.USER]);
      expect(Reflect.getMetadata(GUARDS_METADATA,handler)).toContain(RolesGuard);
      const context=(role: UserType) => ({
        getClass:()=>PlatformController,getHandler:()=>handler,
        switchToHttp:()=>({getRequest:()=>({user:{role,id:'member'}})}),
      }) as unknown as ExecutionContext;
      expect(guard.canActivate(context(UserType.USER))).toBe(true);
      expect(()=>guard.canActivate(context(UserType.ADMIN))).toThrow(ForbiddenException);
    }
  });

  it('submitted biodata remains submitted after editing and re-submission, including publication', async () => {
    const member=await account({biodataStatus:'draft', verificationStatus:'pending',
      isPublishFromAdmin:false, isPublished:false});
    const id=String(member._id);
    const first=await writer.updatedFullUserInformation({ submit: true } as any,id);
    expect(first.data.biodataStatus).toBe('submitted');
    expect(first.data.verificationStatus).toBe('pending');
    expect(first.data.submittedAt).toBeTruthy();
    const timestamp=new Date(first.data.submittedAt).getTime();
    const repeat=await writer.updatedFullUserInformation({submit:true,age:26} as any,id);
    expect(repeat.data.age).toBe(26);
    expect(repeat.data.biodataStatus).toBe('submitted');
    expect(new Date(repeat.data.submittedAt).getTime()).toBe(timestamp);
    expect(repeat.data.isPublishFromAdmin).toBe(false);
    await users.updateOne({_id:member._id},{$set:{biodataStatus:'approved',
      verificationStatus:'approved',isPublishFromAdmin:true,isPublished:true}});
    const updated=await writer.updatedFullUserInformation({submit:true,age:27} as any,id);
    expect(updated.data.age).toBe(27);
    expect(updated.data.verificationStatus).toBe('approved');
    expect(updated.data.isPublishFromAdmin).toBe(true);
    expect(updated.data.biodataStatus).toBe('approved');
    expect(biodataStage(updated.data,100)).toBe('published');
    expect(hasSubmittedBiodata(updated.data)).toBe(true);
  });

  it('rejected submitted profile can be corrected and submitted for another review', async () => {
    const member=await account({biodataStatus:'submitted',
      verificationStatus:'rejected',isPublishFromAdmin:false,isPublished:false});
    const result=await writer.updatedFullUserInformation({submit:true,age:28} as any,String(member._id));
    expect(result.data.biodataStatus).toBe('submitted');
    expect(result.data.verificationStatus).toBe('pending');
    expect(result.data.isPublishFromAdmin).toBe(false);
    expect(result.data.age).toBe(28);
  });

  it('clearly differentiates draft, ready, submitted/review, published, rejected and deleted', () => {
    expect(biodataStage({biodataStatus:'draft'},50)).toBe('draft');
    expect(biodataStage({biodataStatus:'draft'},100)).toBe('ready');
    expect(biodataStage({biodataStatus:'submitted',verificationStatus:'pending'},90)).toBe('under_review');
    expect(biodataStage({biodataStatus:'approved',isPublished:true,isPublishFromAdmin:true},100)).toBe('published');
    expect(biodataStage({biodataStatus:'submitted',verificationStatus:'rejected'},90)).toBe('rejected');
    expect(biodataStage({biodataStatus:'deleted'},0)).toBe('deleted');
  });
});
