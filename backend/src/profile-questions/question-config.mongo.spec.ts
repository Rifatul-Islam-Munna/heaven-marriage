import { MongoMemoryServer } from 'mongodb-memory-server';
import { createConnection, Connection, Model } from 'mongoose';
import { ConflictException } from '@nestjs/common';
import { completion } from '../user/profile-rules';
import { User, UserSchema } from '../user/entities/user.entity';
import {
  QuestionConfigService,
  sanitizeDynamicAnswers, usesSeparateAnswerStorage,
  type ProfileQuestion,
} from './question-config.service';

const sample: ProfileQuestion={
  id:'q_11112222333344445555666677778888',
  question:'What is your favorite Islamic book?',
  publicLabel:'Favorite book',
  gender:'female',section:3,type:'text',options:[],
  optionSource:'',required:false,enabled:true,showPublic:true,order:500,locked:false,
};
describe('Dynamic questions: persisted MongoDB behavior (isolated)',()=>{
  let mongo:MongoMemoryServer, db:Connection, userModel:Model<any>;
  let service:QuestionConfigService;
  beforeAll(async()=>{
    mongo=await MongoMemoryServer.create();
    db=await createConnection(mongo.getUri(),{dbName:'question_builder_tests'}).asPromise();
    userModel=db.model(User.name,UserSchema);
    service=new QuestionConfigService(db);
  },120000);
  afterAll(async()=>{await db?.close();await mongo?.stop();});
  beforeEach(async()=>{
    for(const collection of Object.values(db.collections))await collection.deleteMany({});
    await db.collection('profile_question_config').deleteMany({});
    await db.collection('customquestions').deleteMany({});
    await db.collection('profile_question_audit').deleteMany({});
  });

  it('persists form definitions, new answers, gender, and separate public labels',async()=>{
    const before=await service.get();
    expect(before.revision).toBe(0);
    const updated=await service.save('admin', {
      revision:before.revision,questions:[...before.questions,sample],
    });
    expect(updated.revision).toBe(1);
    expect(updated.questions.find(q=>q.id===sample.id)?.publicLabel).toBe('Favorite book');
    const loaded=await service.get();
    expect(loaded.questions.find(q=>q.id===sample.id)?.gender).toBe('female');
    expect(await db.collection('profile_question_config').countDocuments()).toBe(1);
    const answer=sanitizeDynamicAnswers({[sample.id]:'Sahih Bukhari'},{},loaded.questions,'female');
    const user=await userModel.create({
      name:'Member',gender:'female',isOtpVerified:true,isPublished:true,
      dynamicAnswers:answer,
    });
    const saved=await userModel.findById(user._id).lean();
    expect(saved.dynamicAnswers[sample.id]).toBe('Sahih Bukhari');
    expect((await service.publicAnswers(saved,false,loaded))[sample.id]).toBe('Sahih Bukhari');
    expect(await service.publicAnswers({...saved,gender:'male'},false,loaded)).toEqual({});
  });
  it('archives fields while retaining existing answers and preventing old revision updates',async()=>{
    const base=await service.get();
    await service.save('admin',{revision:0,questions:[...base.questions,sample]});
    const current=await service.get();
    await expect(service.save('other',{revision:0,questions:base.questions}))
      .rejects.toBeInstanceOf(ConflictException);
    const archived=await service.save('admin',{
      revision:current.revision,questions:current.questions.filter(q=>q.id!==sample.id),
    });
    expect(archived.questions.find(q=>q.id===sample.id)?.enabled).toBe(false);
    const user=await userModel.create({name:'Member',gender:'female',
      dynamicAnswers:{[sample.id]:'Previously saved answer'}});
    const saved=await userModel.findById(user._id).lean();
    expect(saved.dynamicAnswers[sample.id]).toBe('Previously saved answer');
    expect(await service.publicAnswers(saved,false,archived)).toEqual({});
    expect(await db.collection('profile_question_audit').countDocuments()).toBe(2);
  });
  it('stores redesigned legacy question answers separately without modifying old user fields',async()=>{
    const before=await service.get();
    const original=before.questions.find(q=>q.path==='age')!;
    const updated=await service.save('admin',{
      revision:0,questions:before.questions.map(q=>q.id===original.id?
        {...q,type:'checkbox',question:'Do you feel young?',publicLabel:'Young at heart',required:false}:q),
    });
    const changed=updated.questions.find(q=>q.id===original.id)!;
    expect(usesSeparateAnswerStorage(changed)).toBe(true);
    const answers=sanitizeDynamicAnswers({[changed.id]:true},{},updated.questions,'male');
    const user=await userModel.create({
      name:'Member',gender:'male',age:30,dynamicAnswers:answers,
    });
    const saved=await userModel.findById(user._id).lean();
    expect(saved.age).toBe(30);
    expect(saved.dynamicAnswers[changed.id]).toBe(true);
    expect((await service.publicAnswers(saved,false,updated))[changed.id]).toBe(true);
    const publicObj=service.applyPublicVisibility({gender:'male',age:30},updated);
    expect(publicObj.age).toBeUndefined();
  });
  it('lets admins archive every profile question without requiring old fields for completion',async()=>{
    const current=await service.get();
    const updated=await service.save('admin',{revision:0,
      questions:current.questions.map(q=>({...q,enabled:false,required:false})),
    });
    expect(updated.questions.filter(q=>q.enabled).length).toBe(0);
    expect(completion({gender:'female'},updated.questions).percentage).toBe(100);
    expect(updated.questions.find(q=>q.path==='pledge.allTheInformationTrue')?.enabled).toBe(false);
    expect(await db.collection('profile_question_config').countDocuments()).toBe(1);
  });
  it('adopts old custom question wording with stable legacy storage references',async()=>{
    const legacy=await db.collection('customquestions').insertOne({
      question:'What inspires you?',createdAt:new Date(),
    });
    const loaded=await service.get();
    const id='old_'+String(legacy.insertedId);
    const original=loaded.questions.find(q=>q.id===id)!;
    expect(original.legacyKey).toBe('What inspires you?');
    const revised=await service.save('admin',{revision:0,questions:loaded.questions.map(q=>
      q.id===id?{...q,question:'What motivates you?',publicLabel:'Inspiration',showPublic:true}:q,
    )});
    const member=await userModel.create({
      name:'Member',gender:'male',customFields:{'What inspires you?':'Helping people'},
    });
    const saved=await userModel.findById(member._id).lean();
    expect((await service.publicAnswers(saved,false,revised))[id]).toBe('Helping people');
  });
});
