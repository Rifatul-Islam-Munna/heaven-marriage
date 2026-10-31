import { ConflictException } from '@nestjs/common';
import type { Connection } from 'mongoose';
import {
  BUILTINS, QuestionConfigService, type ProfileQuestion,
  sanitizeDynamicAnswers, missingDynamicAnswers,
} from './question-config.service';

function fixture() {
  let document: any = null;
  const log: unknown[] = [];
  const oldQuestions: any[] = [];
  const collections: any = {
    profile_question_config: {
      async findOne() { return document ? JSON.parse(JSON.stringify(document)) : null; },
      async updateOne(filter: any,update: any, options: any) {
        if (document) {
          if (document.revision !== filter.revision) return { matchedCount: 0, upsertedCount: 0 };
          document={...document,...update.$set};
          return {matchedCount:1,upsertedCount:0};
        }
        if(!options?.upsert||filter.revision!==0)
          return {matchedCount:0,upsertedCount:0};
        document={_id:'active',...update.$set};
        return {matchedCount:0,upsertedCount:1};
      },
    },
    customquestions: {
      find() { return { project() { return {async toArray() {return oldQuestions;} };} }; },
    },
    profile_question_audit: {
      async insertOne(item:any) {log.push(item);},
    },
  };
  const db={collection(name:string) {
    if(!collections[name])throw Error('Unexpected collection '+name);
    return collections[name];
  }} as unknown as Connection;
  return { service:new QuestionConfigService(db), log, oldQuestions, getRecord:()=>document };
}
const custom: ProfileQuestion = {
  id:'q_11223344556677889900aabbccddeeff',question:'How old are you?',publicLabel:'Age',
  section:0,gender:'female',type:'number',options:[],optionSource:'',required:true,
  enabled:true,showPublic:true,order:333,locked:false,
};
describe('Profile question schema database flows',()=>{
  it('loads original questions without writing them to the database',async()=>{
    const ctx=fixture(), schema=await ctx.service.get();
    expect(schema.questions.length).toBe(BUILTINS.length);
    expect(ctx.getRecord()).toBeNull();
    expect(schema.questions.find(q=>q.path==='age')?.publicLabel).toBeTruthy();
  });
  it('saves new questions, edits existing labels, and protects against concurrent overwrites',async()=>{
    const ctx=fixture();
    const initial=await ctx.service.get();
    const edits=initial.questions.map(q=>q.path==='age'
      ? {...q,question:'How old are you?',publicLabel:'Age in years'} : q);
    const saved=await ctx.service.save('admin-123',
      {revision:initial.revision, questions:[...edits,custom]});
    expect(saved.revision).toBe(1);
    expect(saved.questions.find(q=>q.path==='age')?.publicLabel).toBe('Age in years');
    expect(saved.questions.find(q=>q.id===custom.id)?.gender).toBe('female');
    expect(ctx.log).toHaveLength(1);
    await expect(ctx.service.save('admin-456',
      {revision:0,questions:edits})).rejects.toBeInstanceOf(ConflictException);
  });
  it('archives deleted questions without changing their permanent identifiers or other answers',async()=>{
    const ctx=fixture(), initial=await ctx.service.get();
    await ctx.service.save('admin',{revision:0,questions:[...initial.questions,custom]});
    const saved=await ctx.service.get();
    const removed=await ctx.service.save('admin',
      {revision:saved.revision,questions:saved.questions.filter(q=>q.id!==custom.id)});
    expect(removed.questions.find(q=>q.id===custom.id)?.enabled).toBe(false);
    const persisted=sanitizeDynamicAnswers({[custom.id]:24},{[custom.id]:30},
      removed.questions,'female');
    expect(persisted[custom.id]).toBe(30);
    expect(removed.questions.some(q=>q.path==='name')).toBe(true);
  });
  it('hides builtins in the returned public profile, while retaining locked contact details',async()=>{
    const ctx=fixture(),initial=await ctx.service.get();
    const updated=await ctx.service.save('admin',{revision:0,questions:initial.questions.map(q=>
      q.path==='age'?{...q,showPublic:false}:{...q,enabled:q.path==='bloodGroup'?false:q.enabled},
    )});
    const original={age:30,phoneNumber:'01711111111',bloodGroup:'O+',gender:'female'};
    const profile=ctx.service.applyPublicVisibility({...original},updated);
    expect(profile.age).toBeUndefined();
    expect(profile.bloodGroup).toBeUndefined();
    expect(profile.phoneNumber).toBe(original.phoneNumber);
  });
  it('shows only gender-eligible public questions and redacts contact details before unlock',async()=>{
    const ctx=fixture(),original=await ctx.service.get();
    const saved=await ctx.service.save('admin',{revision:0,questions:[...original.questions,
      {...custom,required:false,type:'text'}]});
    const data={gender:'female',name:'Test User',phoneNumber:'01711111111',
      dynamicAnswers:{[custom.id]:'I am 30, call me 01711111111'}};
    const publicFemale=await ctx.service.publicAnswers(data,false,saved);
    expect(String(publicFemale[custom.id])).toContain('[সংরক্ষিত]');
    expect(String(publicFemale[custom.id])).not.toContain('01711111111');
    expect(await ctx.service.publicAnswers({...data,gender:'male'},false,saved)).toEqual({});
    expect((await ctx.service.publicAnswers(data,true,saved))[custom.id])
      .toContain('01711111111');
  });
  it('enforces required questions and preserves old selected values after options change',()=>{
    const q={...custom,type:'dropdown' as const,options:[{label:'New',value:'new'}]};
    expect(missingDynamicAnswers({},[q],'female')).toEqual([q.question]);
    const result=sanitizeDynamicAnswers({[q.id]:'old'},{[q.id]:'old'},[q],'female');
    expect(result[q.id]).toBe('old');
    expect(()=>sanitizeDynamicAnswers({[q.id]:'invalid'},{[q.id]:'old'},[q],'female'))
      .toThrow();
  });
});
