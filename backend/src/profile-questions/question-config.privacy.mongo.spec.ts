import { MongoMemoryServer } from 'mongodb-memory-server';
import { createConnection, type Connection, type Model } from 'mongoose';
import { User, UserSchema } from '../user/entities/user.entity';
import { PlatformService } from '../user/platform.service';
import {
  QuestionConfigService, sanitizeDynamicAnswers, type ProfileQuestion,
} from './question-config.service';

const extra:ProfileQuestion={
  id:'q_ddeeff00112233445566778899aabbcc',
  question:'What is your favorite book?', publicLabel:'Favorite book',
  gender:'female',section:3,type:'text',required:false,enabled:true,
  showPublic:true,order:900,locked:false,options:[],optionSource:'',
};

describe('Public biodata and existing MongoDB answers (privacy regressions)',()=>{
  let mongo:MongoMemoryServer;
  let db:Connection;
  let users:Model<any>;
  let questions:QuestionConfigService;
  let platform:PlatformService;

  beforeAll(async()=>{
    mongo=await MongoMemoryServer.create();
    db=await createConnection(mongo.getUri(),{dbName:'privacy_test'}).asPromise();
    users=db.model(User.name,UserSchema);
    questions=new QuestionConfigService(db);
    platform=new PlatformService(db,users,{} as any,{} as any,questions);
  },120000);
  afterAll(async()=>{await db?.close();await mongo?.stop();});
  beforeEach(async()=>{
    for(const collection of Object.values(db.collections))
      await collection.deleteMany({});
    for(const name of ['profile_question_config','customquestions','profile_question_audit'])
      await db.collection(name).deleteMany({});
  });

  async function seedProfile(){
    return users.create({
      name:'Existing Profile',gender:'female',age:30,
      fatherName:'Previous father name',isOtpVerified:true,
      isPublished:true,isPublishFromAdmin:true,verificationStatus:'approved',
      personalInformation:{height:5.6,skinTone:'fair'},
      dynamicAnswers:{[extra.id]:'Al-Quran'},
    });
  }

  it('hides deleted/private default and custom answers from the public response without deleting old data',async()=>{
    const user=await seedProfile();
    const base=await questions.get();
    const edited=await questions.save('admin',{revision:0,
      questions:[...base.questions,extra].map(q=>{
        if(q.path==='age')return {...q,enabled:false,required:false};
        if(q.path==='personalInformation.height')return {...q,showPublic:false};
        if(q.path==='gender')return {...q,showPublic:false};
        if(q.path==='fatherName')return {...q,showPublic:false};
        if(q.id===extra.id)return {...q,showPublic:false};
        return q;
      }),
    });
    const publicData:any=await platform.profile(String(user._id));
    expect(publicData.age).toBeUndefined();
    expect(publicData.gender).toBeUndefined();
    expect(publicData.personalInformation?.height).toBeUndefined();
    expect(publicData.publicAnswers?.[extra.id]).toBeUndefined();
    expect(publicData.publicQuestionSchema.revision).toBe(edited.revision);
    // Identity unlock cannot bypass an admin's question-privacy choice.
    const unlocked:any=await platform.profile(String(user._id),undefined,'admin');
    expect(unlocked.fatherName).toBeUndefined();
    const stored:any=await users.findById(user._id).lean();
    expect(stored.age).toBe(30);
    expect(stored.gender).toBe('female');
    expect(stored.fatherName).toBe('Previous father name');
    expect(stored.personalInformation.height).toBe(5.6);
    expect(stored.dynamicAnswers[extra.id]).toBe('Al-Quran');

    // Restoration reveals the *original* answers with no migration or reset.
    const restored=await questions.save('admin',{revision:edited.revision,
      questions:edited.questions.map(q=>{
        if(q.path==='age')return {...q,enabled:true,showPublic:true};
        if(q.path==='personalInformation.height'||q.path==='gender'||q.path==='fatherName')
          return {...q,showPublic:true};
        if(q.id===extra.id)return {...q,showPublic:true};
        return q;
      }),
    });
    const visible:any=await platform.profile(String(user._id));
    expect(visible.age).toBe(30);
    expect(visible.gender).toBe('female');
    expect(visible.personalInformation?.height).toBe(5.6);
    expect(visible.publicAnswers[extra.id]).toBe('Al-Quran');
    expect(visible.publicQuestionSchema.revision).toBe(restored.revision);
  });

  it('moving/editing old question labels retains answers and relocates public output',async()=>{
    const user=await seedProfile();
    const initial=await questions.get();
    const age=initial.questions.find(q=>q.path==='age')!;
    const saved=await questions.save('admin',{revision:0,questions:initial.questions.map(q=>
      q.id===age.id?{...q,question:'Your age?',publicLabel:'Years of age',section:5}:q,
    )});
    const response:any=await platform.profile(String(user._id));
    expect(response.age).toBeUndefined(); // no stale row in Basic Information
    expect(response.publicAnswers[age.id]).toBe(30);
    const config=response.publicQuestionSchema.questions.find((q:ProfileQuestion)=>q.id===age.id)!;
    expect(config.section).toBe(5);
    expect(config.publicLabel).toBe('Years of age');
    expect(saved.revision).toBe(response.publicQuestionSchema.revision);
    expect((await users.findById(user._id).lean()).age).toBe(30);
  });

  it('keeps legacy custom answer when renamed, private, archived, and restored',async()=>{
    const old=await db.collection('customquestions').insertOne({question:'Old prompt'});
    const id='old_'+String(old.insertedId);
    const u=await users.create({
      name:'Old member',gender:'male',isPublished:true,isPublishFromAdmin:true,
      verificationStatus:'approved',
      customFields:{'Old prompt':'Important old answer'},
    });
    const base=await questions.get();
    let edited=await questions.save('admin',{revision:0,questions:base.questions.map(q=>
      q.id===id?{...q,question:'Edited prompt',publicLabel:'Public label',showPublic:true}:q,
    )});
    expect((await platform.profile(String(u._id))).publicAnswers[id]).toBe('Important old answer');
    edited=await questions.save('admin',{revision:edited.revision,questions:edited.questions.map(q=>
      q.id===id?{...q,showPublic:false}:q,
    )});
    expect((await platform.profile(String(u._id))).publicAnswers[id]).toBeUndefined();
    edited=await questions.save('admin',{revision:edited.revision,questions:edited.questions.filter(q=>q.id!==id)});
    expect((await platform.profile(String(u._id))).publicAnswers[id]).toBeUndefined();
    edited=await questions.save('admin',{revision:edited.revision,questions:edited.questions.map(q=>
      q.id===id?{...q,enabled:true,showPublic:true}:q,
    )});
    expect((await platform.profile(String(u._id))).publicAnswers[id]).toBe('Important old answer');
    expect((await users.findById(u._id).lean()).customFields['Old prompt']).toBe('Important old answer');
  });

  it('publishes a previously saved pledge only when its admin public flag is enabled',async()=>{
    const base=await questions.get();
    const original=base.questions.find(q=>q.path==='pledge.allTheInformationTrue')!;
    expect(original).toBeDefined();
    const oldMember=await users.create({
      name:'Existing member',gender:'female',isPublished:true,
      isPublishFromAdmin:true,verificationStatus:'approved',
      pledge:{allTheInformationTrue:true},
    });
    const published=await questions.save('admin',{revision:0,questions:base.questions.map(q=>
      q.id===original.id?{...q,showPublic:true,publicLabel:'Information confirmed'}:q),
    });
    const output:any=await platform.profile(String(oldMember._id));
    expect(output.publicAnswers[original.id]).toBe(true);
    expect(output.publicQuestionSchema.questions.find((q:ProfileQuestion)=>q.id===original.id)
      .publicLabel).toBe('Information confirmed');
    const privateSchema=await questions.save('admin',{revision:published.revision,
      questions:published.questions.map(q=>q.id===original.id?{...q,showPublic:false}:q),
    });
    const hidden:any=await platform.profile(String(oldMember._id));
    expect(hidden.publicAnswers[original.id]).toBeUndefined();
    expect(privateSchema.revision).toBe(hidden.publicQuestionSchema.revision);
    expect((await users.findById(oldMember._id).lean()).pledge.allTheInformationTrue).toBe(true);
  });

  it('accepts unchanged historical answers after input type/options are reconfigured',async()=>{
    const before=await questions.get();
    const first=await questions.save('admin',{revision:0,questions:[...before.questions,extra]});
    const u=await users.create({name:'Legacy',gender:'female',
      dynamicAnswers:{[extra.id]:'Previous stored text'}});
    const changed=await questions.save('admin',{revision:first.revision,questions:first.questions.map(q=>
      q.id===extra.id?{...q,type:'multi_checkbox',options:[{label:'A',value:'a'}]}:q,
    )});
    const old:any=await users.findById(u._id).lean();
    const answers=sanitizeDynamicAnswers({[extra.id]:'Previous stored text'},
      old.dynamicAnswers,changed.questions,'female');
    expect(answers[extra.id]).toBe('Previous stored text');
    const replacement=sanitizeDynamicAnswers({[extra.id]:['a']},
      answers,changed.questions,'female');
    expect(replacement[extra.id]).toEqual(['a']);
    expect((await users.findById(u._id).lean()).dynamicAnswers[extra.id]).toBe('Previous stored text');
  });
});
