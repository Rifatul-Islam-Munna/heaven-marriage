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
      logger: {debug:jest.fn(),warn:jest.fn()},
      questions: { get: async () => ({
        revision:0,questions: BUILTINS.filter(question => question.path === 'age'),
      }) },
    });
  }, 120000);
  afterAll(async () => { await db?.close(); await mongo?.stop(); });
  beforeEach(async () => {
    for (const collection of Object.values(db.collections)) await collection.deleteMany({});
  });

  it('shows saved unpublished profiles first, moves them to the top after every save, and excludes signups',async()=>{
    (writer as any).questions={get:async()=>({revision:80,
      questions:BUILTINS.filter(question=>question.path==='age')})};
    const oldTime=new Date(Date.now()-120000);
    const recentTime=new Date(Date.now()-60000);
    const signup=await account({phoneNumber:'01711111110',email:'review-signup@example.com',
      age:undefined,maritalStatus:undefined,address:undefined,
      biodataStatus:'draft',isPublished:false,isPublishFromAdmin:false,
      verificationStatus:'pending',draftSavedAt:undefined,submittedAt:undefined,
    });
    const olderDraft=await account({phoneNumber:'01711111111',email:'review-old@example.com',
      biodataStatus:'draft',isPublished:false,
      isPublishFromAdmin:false,verificationStatus:'pending',draftSavedAt:oldTime});
    const newerDraft=await account({phoneNumber:'01711111112',email:'review-new@example.com',
      biodataStatus:'draft',isPublished:false,
      isPublishFromAdmin:false,verificationStatus:'pending',draftSavedAt:recentTime});
    const published=await account({phoneNumber:'01711111113',email:'review-published@example.com',
      draftSavedAt:new Date(),isPublished:true,
      isPublishFromAdmin:true,verificationStatus:'approved',biodataStatus:'approved'});
    const legacySubmitted=await account({phoneNumber:'01711111114',email:'review-legacy@example.com',
      biodataStatus:'submitted',
      isPublished:false,isPublishFromAdmin:false,verificationStatus:'pending',
      draftSavedAt:undefined,submittedAt:new Date(Date.now()-180000)});

    const query:any={page:1,limit:2,reviewQueue:'true',verificationStatus:'pending'};
    const first=await writer.getUserForAdmin(query);
    expect(first.totalItems).toBe(3);
    expect(first.totalPages).toBe(2);
    expect(first.data.map((item:any)=>String(item._id))).toEqual([
      String(newerDraft._id),String(olderDraft._id),
    ]);
    const second=await writer.getUserForAdmin({...query,page:2});
    expect(second.data.map((item:any)=>String(item._id))).toEqual([String(legacySubmitted._id)]);

    const saved=await writer.updatedFullUserInformation({age:29} as any,String(olderDraft._id));
    expect(saved.data.draftSavedAt.getTime()).toBeGreaterThan(recentTime.getTime());
    const afterSave=await writer.getUserForAdmin(query);
    expect(afterSave.data.map((item:any)=>String(item._id))).toEqual([
      String(olderDraft._id),String(newerDraft._id),
    ]);
    await users.updateOne({_id:olderDraft._id},{$set:{
      biodataStatus:'approved',isPublished:true,isPublishFromAdmin:true,verificationStatus:'approved',
    }});
    const afterPublish=await writer.getUserForAdmin({...query,verificationStatus:undefined});
    expect(afterPublish.totalItems).toBe(2);
    expect(afterPublish.data.some((item:any)=>String(item._id)===String(olderDraft._id))).toBe(false);

    const all=await writer.getUserForAdmin({
      page:1,limit:10,reviewQueue:'false',
    } as any);
    expect(all.totalItems).toBe(5);
    expect(all.data.map((item:any)=>String(item._id))).toEqual(
      expect.arrayContaining([String(signup._id),String(published._id)]),
    );
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

  it('persists required-question progress on the member list, biodata edit and schema revision changes',async()=>{
    const age={...BUILTINS.find(q=>q.path==='age')!,required:true,enabled:true};
    const extraId='q_'+'f'.repeat(32);
    const extra={id:extraId,question:'Extra required question',publicLabel:'Extra required',
      section:2,gender:'both',type:'text',options:[],optionSource:'',required:true,
      enabled:true,showPublic:false,order:20,locked:false};
    const member=await account({biodataStatus:'draft',isPublished:false,
      isPublishFromAdmin:false,verificationStatus:'pending'});
    const id=String(member._id);
    const initial={revision:31,questions:[age]};
    (writer as any).questions={get:async()=>initial};
    const listing=await writer.getUserForAdmin({page:1,limit:10,gender:'all'} as any);
    const entry=listing.data.find((m:any)=>String(m._id)===id);
    expect(entry).toMatchObject({completionPercentage:100,completionRequiredCount:1,
      completionAnsweredCount:1,completionSchemaRevision:31});
    let stored=await users.findById(id).lean();
    expect(stored).toMatchObject({completionPercentage:100,completionSchemaRevision:31});
    const next={revision:32,questions:[age,extra]};
    (writer as any).questions={get:async()=>next};
    const updated=await writer.getUserForAdmin({page:1,limit:10,gender:'all'} as any);
    expect(updated.data.find((m:any)=>String(m._id)===id)).toMatchObject({
      completionPercentage:50,completionRequiredCount:2,completionAnsweredCount:1,completionSchemaRevision:32});
    stored=await users.findById(id).lean();
    expect(stored).toMatchObject({completionPercentage:50,completionSchemaRevision:32});
    await writer.updatedFullUserInformation({dynamicAnswers:{[extraId]:'done'}} as any,id);
    stored=await users.findById(id).lean();
    expect(stored).toMatchObject({completionPercentage:100,
      completionRequiredCount:2,completionAnsweredCount:2,completionSchemaRevision:32});
    (writer as any).questions={get:async()=>({revision:33,questions:[age,{...extra,enabled:false}]})};
    await writer.refreshStaleCompletionSnapshots();
    stored=await users.findById(id).lean();
    expect(stored).toMatchObject({completionPercentage:100,
      completionRequiredCount:1,completionAnsweredCount:1,completionSchemaRevision:33});
  });

  it('shows exactly the same required-field completion to members and admins',async()=>{
    const fieldId='q_'+'a'.repeat(32);
    const required={
      id:fieldId,question:'Required new field',publicLabel:'Required new field',
      section:2,gender:'both',type:'text',options:[],optionSource:'',
      required:true,enabled:true,showPublic:false,order:20,locked:false,
    };
    const age={...BUILTINS.find(q=>q.path==='age')!,required:true,enabled:true};
    const member=await account({biodataStatus:'draft',isPublished:false,
      isPublishFromAdmin:false,verificationStatus:'pending'});
    const id=String(member._id);
    (writer as any).questions={get:async()=>({revision:45,questions:[age,required]})};
    const adminList=await writer.getUserForAdmin({page:1,limit:10,gender:'all'} as any);
    const adminMember=adminList.data.find((item:any)=>String(item._id)===id);
    const myProfile=await writer.finMyProfile(id);
    expect(myProfile).toMatchObject({
      completionPercentage:50,completionRequiredCount:2,completionAnsweredCount:1,
      completionSchemaRevision:45,completion:{
        percentage:50,requiredCount:2,answeredCount:1,schemaRevision:45,
      },
    });
    expect(myProfile.completion.percentage).toBe(adminMember.completionPercentage);
    expect(myProfile.completion.answeredCount).toBe(adminMember.completionAnsweredCount);
    const updated=await writer.updatedFullUserInformation({dynamicAnswers:{[fieldId]:'answered'}} as any,id);
    expect(updated.completion).toMatchObject({percentage:100,requiredCount:2,answeredCount:2});
    const refreshed=await writer.finMyProfile(id);
    expect(refreshed.completion.percentage).toBe(100);
    const saved=await users.findById(id).lean();
    expect(saved).toMatchObject({completionPercentage:100,completionAnsweredCount:2});
    (writer as any).questions={get:async()=>({revision:46,questions:[
      age,required,{...required,id:'q_'+'b'.repeat(32)},
    ]})};
    const changed=await writer.finMyProfile(id);
    expect(changed.completion).toMatchObject({percentage:67,requiredCount:3,answeredCount:2});
    expect((await users.findById(id).lean())).toMatchObject({
      completionPercentage:67,completionRequiredCount:3,completionSchemaRevision:46,
    });
  });

  it('never displays 100% to a signup-only account without biodata gender',async()=>{
    const noProfile=await account({gender:undefined,biodataStatus:'draft',
      isPublished:false,isPublishFromAdmin:false});
    (writer as any).questions={get:async()=>({revision:47,questions:[
      {...BUILTINS.find(q=>q.path==='age')!,required:true,enabled:true},
    ]})};
    const member=await writer.finMyProfile(String(noProfile._id));
    const admin=await writer.getUserForAdmin({page:1,limit:10,gender:'all'} as any);
    const adminMember=admin.data.find((item:any)=>String(item._id)===String(noProfile._id));
    expect(member.completion).toMatchObject({percentage:0,requiredCount:0,answeredCount:0});
    expect(adminMember).toMatchObject({completionPercentage:0,completionRequiredCount:0});
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
