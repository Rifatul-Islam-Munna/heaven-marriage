import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { FALLBACK_PROFILE_SCHEMA } from './default-question-registry';

export const SECTION_NAMES = FALLBACK_PROFILE_SCHEMA.sections;
const sourceQuestions = FALLBACK_PROFILE_SCHEMA.questions;
export type FieldType = 'text'|'textarea'|'number'|'select'|'dropdown'|'checkbox'|'multi_checkbox';
export type FieldGender = 'male'|'female'|'both';
export type QuestionOption = { label: string; value: string };
export type ProfileQuestion = {
  id: string; path?: string; legacyKey?: string;
  question: string; publicLabel: string; section: number;
  gender: FieldGender; type: FieldType; options: QuestionOption[];
  optionSource: string; required: boolean; enabled: boolean; showPublic: boolean;
  order: number; locked: boolean;
};
export type QuestionSchema = { revision: number; sections: {id:number;title:string}[]; questions: ProfileQuestion[] };

// Authentication credentials are managed by IdentityService, never the profile builder.
const authQuestionPaths = new Set(['email','phoneNumber','password']);
export const BUILTINS: ProfileQuestion[] = sourceQuestions.map(q => ({...q, type:q.type as FieldType,
  gender:q.gender as FieldGender,options:q.options.map(o=>({...o})),
  locked: authQuestionPaths.has(q.path || ''),
}));
export function usesSeparateAnswerStorage(q: ProfileQuestion): boolean {
  if (!q.path && !q.legacyKey) return true;
  const storageKind = (type: FieldType) => {
    if (type === 'checkbox') return 'boolean';
    if (type === 'multi_checkbox') return 'array';
    if (type === 'number') return 'number';
    return 'string'; // text, textarea, select, dropdown
  };
  if (q.legacyKey) return storageKind(q.type) !== 'string';
  const original = builtins.get(q.id);
  if (!original) return true;
  if (storageKind(q.type) !== storageKind(original.type)) return true;
  // Registration gender remains male/female; a redesigned gender question
  // with different stored values must not corrupt account classification.
  if (q.path === 'gender' && q.options.some(o => !['male','female'].includes(o.value))) return true;
  return false;
}
export function answerForQuestion(user: any, q: ProfileQuestion): unknown {
  const get = (map: any, key: string) => map?.get?.(key) ?? map?.[key];
  if (usesSeparateAnswerStorage(q)) return get(user.dynamicAnswers, q.id);
  if (q.legacyKey) return get(user.customFields, q.legacyKey);
  return q.path?.split('.').reduce((value: any, key) => value?.[key], user);
}
const builtins = new Map(BUILTINS.map(q=>[q.id,q]));
// Contact data is never exposed to strangers by publicProfile(), even when its
// biodata question is marked visible. Password, email and login-phone fields
// are not configurable here.
const secretFields = new Set(['email','phoneNumber','password']);
const unlockOnlyFields = new Set(['name','fatherName','motherName','guardianPhone','whatsapp']);
const types = new Set<FieldType>(['text','textarea','number','select','dropdown','checkbox','multi_checkbox']);
const genders = new Set<FieldGender>(['male','female','both']);
function cleanText(value:unknown, max:number, key:string) {
  if(typeof value!=='string'||value.length>max)throw new BadRequestException('Invalid '+key);
  return value.trim();
}
export function validateQuestion(input: unknown): ProfileQuestion {
  if(!input||typeof input!=='object'||Array.isArray(input)) throw new BadRequestException('Invalid question');
  const a=input as Record<string,any>;
  const id=cleanText(a.id,80,'id');
  const existing=builtins.get(id);
  if(!existing&&!/^q_[a-f0-9]{32}$/.test(id)&&!/^old_[a-f0-9]{24}$/.test(id))
    throw new BadRequestException('Invalid question ID');
  if(a.path!==undefined&&a.path!==existing?.path) throw new BadRequestException('Cannot change original answer field');
  if(a.legacyKey!==undefined&&(!id.startsWith('old_')||typeof a.legacyKey!=='string'||a.legacyKey.length>500))
    throw new BadRequestException('Invalid legacy field');
  if(!types.has(a.type)) throw new BadRequestException('Invalid input type');
  // Default profile fields are fully configurable. Incompatible input types
  // use an ID-based answer instead of overwriting a typed legacy Mongo field.
  if(!genders.has(a.gender))throw new BadRequestException('Invalid gender');
  const section=Number(a.section), order=Number(a.order);
  if(!Number.isInteger(section)||section<0||section>9||!Number.isFinite(order)||Math.abs(order)>1000000)
    throw new BadRequestException('Invalid section or order');
  const question=cleanText(a.question,1000,'question');
  if(!question)throw new BadRequestException('Question is required');
  // Existing pledge paragraphs can be much longer than ordinary labels.
  const publicLabel=cleanText(a.publicLabel??'',2000,'public label');
  if(a.showPublic===true&&!publicLabel)throw new BadRequestException('Public biodata label is required');
  const raw=a.options??[];
  if(!Array.isArray(raw)||raw.length>100)throw new BadRequestException('Invalid options');
  const options=raw.map((o:any)=>{
    const label=cleanText(o?.label,200,'option label');
    const value=cleanText(o?.value,200,'option value');
    if(!label||!value)throw new BadRequestException('Option cannot be empty');
    return {label,value};
  });
  if(new Set(options.map(o=>o.value)).size!==options.length)
    throw new BadRequestException('Duplicate option');
  const optionSource=existing ? (a.optionSource === '' ? '' : existing.optionSource) : '';
  const locked = !!existing && authQuestionPaths.has(existing.path || '');
  if (locked && (a.enabled === false || a.required !== existing!.required ||
    a.gender !== existing!.gender || a.question !== existing!.question ||
    a.type !== existing!.type)) throw new BadRequestException('Authentication fields are not configurable');
  const required = locked ? existing!.required : a.required === true;
  const enabled = locked ? true : a.enabled !== false;
  return {
    id,
    ...(existing?.path?{path:existing.path}:{}),
    ...(id.startsWith('old_')&&a.legacyKey?{legacyKey:a.legacyKey}:{}),
    question,publicLabel,section,
    gender:locked?existing!.gender:a.gender,
    type:a.type, options,optionSource,
    required,enabled,showPublic:!secretFields.has(existing?.path||'')&&a.showPublic===true,
    order,locked,
  };
}
export function sanitizeDynamicAnswers(answers: unknown, existing: Record<string,unknown> | undefined,
    questions:ProfileQuestion[], gender:unknown) {
  if(!answers||typeof answers!=='object'||Array.isArray(answers)) throw new BadRequestException('Invalid answers');
  const received=Object.entries(answers as Record<string,unknown>);
  if(received.length>400)throw new BadRequestException('Too many answers');
  const byId=new Map(questions.filter(q=>q.enabled&&usesSeparateAnswerStorage(q)&&
    (q.gender==='both'||q.gender===gender)).map(q=>[q.id,q]));
  const result:Record<string,unknown>={...(existing||{})};
  for(const [key,raw] of received) {
    if(!/^(?:q_[a-f0-9]{32}|builtin_[a-f0-9]{16}|old_[a-f0-9]{24})$/.test(key))
      throw new BadRequestException('Invalid answer key');
    const q=byId.get(key);
    if(!q) {
      // Keep saved answers to archived questions, but reject new answers to them.
      if(Object.hasOwn(result,key))continue;
      throw new BadRequestException('Question not available');
    }
    // Existing answers may have been saved using an older input type/options.
    // Unchanged old values are always safe to keep; only newly edited answers
    // must follow the current question's validation rules.
    if(Object.hasOwn(result,key)&&JSON.stringify(result[key])===JSON.stringify(raw))continue;
    if(Array.isArray(raw)) {
      if(q.type!=='multi_checkbox'||raw.length>100||raw.some(s=>typeof s!=='string'||s.length>200))
        throw new BadRequestException('Invalid multiple-choice answer');
      const options=new Set(q.options.map(o=>o.value));
      if(options.size && raw.some(s=>!options.has(s))&&JSON.stringify(result[key])!==JSON.stringify(raw))throw new BadRequestException('Invalid choice');
      result[key]=raw;
    } else if(typeof raw==='boolean') {
      if(q.type!=='checkbox')throw new BadRequestException('Invalid checkbox answer');
      result[key]=raw;
    } else if(typeof raw==='number') {
      if(q.type!=='number'||!Number.isFinite(raw))throw new BadRequestException('Invalid number');
      result[key]=raw;
    } else if(typeof raw==='string'&&raw.length<=5000) {
      if(['checkbox','multi_checkbox'].includes(q.type)&&raw!=='')throw new BadRequestException('Incorrect answer type');
      if(q.type==='number'&&raw!==''&&!Number.isFinite(Number(raw))) throw new BadRequestException('Invalid number');
      if(['select','dropdown'].includes(q.type)&&q.options.length&&raw&&raw!==result[key]&&!q.options.some(o=>o.value===raw))
        throw new BadRequestException('Invalid selected answer');
      result[key]=q.type==='number'&&raw!==''?Number(raw):raw;
    } else throw new BadRequestException('Invalid answer type');
  }
  const size=JSON.stringify(result).length;
  if(size>180000)throw new BadRequestException('Answer limit exceeded');
  return result;
}
export function missingDynamicAnswers(answers:any, questions:ProfileQuestion[],gender:any) {
  return questions.filter(q=>q.enabled&&q.required&&usesSeparateAnswerStorage(q)&&
    (q.gender==='both'||q.gender===gender)).filter(q=>{
      const v=answers?.get?.(q.id) ?? answers?.[q.id];
      return v===undefined||v===null||v===''||(Array.isArray(v)&&v.length===0)||
        (q.type==='checkbox'&&v!==true);
    }).map(q=>q.question);
}
@Injectable()
export class QuestionConfigService {
  constructor(@InjectConnection() private readonly db:Connection){}
  private get collection(){return this.db.collection('profile_question_config');}
  async get():Promise<QuestionSchema> {
    const [doc,legacy]=await Promise.all([
      this.collection.findOne({_id:'active' as any}),
      this.db.collection('customquestions').find({}).project({_id:1,question:1}).toArray(),
    ]);
    const stored=Array.isArray(doc?.questions)?doc.questions as ProfileQuestion[]:[];
    const rows=new Map<string,ProfileQuestion>(BUILTINS.map(q=>[q.id,{...q,options:[...q.options]}]));
    for(const old of legacy) {
      const id='old_'+String(old._id).replace(/[^a-f0-9]/gi,'').toLowerCase().slice(0,24);
      if(!/^old_[a-f0-9]{24}$/.test(id)||typeof old.question!=='string')continue;
      rows.set(id,{id,legacyKey:old.question,question:old.question,publicLabel:old.question,
        section:8,gender:'both',type:'textarea',options:[],optionSource:'',required:false,
        enabled:true,showPublic:false,order:100+rows.size*100,locked:false});
    }
    for(const q of stored) {
      if(!q?.id)continue;
      const old=rows.get(q.id);
      try {
        rows.set(q.id,validateQuestion({
          ...q,
          ...(old?.legacyKey?{legacyKey:old.legacyKey}:{}),
        }));
      } catch { /* Keep the seed instead of letting corrupt config break forms. */ }
    }
    return {revision:Number(doc?.revision)||0,sections:SECTION_NAMES.map(s=>({...s})),
      questions:[...rows.values()].sort((a,b)=>a.section-b.section||a.order-b.order)};
  }
  async save(actorId:string, payload:unknown) {
    if(!payload||typeof payload!=='object'||Array.isArray(payload))
      throw new BadRequestException('Invalid schema');
    const input=payload as Record<string,any>;
    if(!Number.isSafeInteger(input.revision)||input.revision<0)
      throw new BadRequestException('Invalid revision');
    if(!Array.isArray(input.questions)||input.questions.length>400)
      throw new BadRequestException('Too many questions');
    const current=await this.get();
    if(input.revision!==current.revision)throw new ConflictException('Questions changed in another browser. Refresh.');
    const submitted=new Map<string,ProfileQuestion>();
    for(const item of input.questions) {
      const q=validateQuestion(item);
      if(submitted.has(q.id))throw new BadRequestException('Duplicate ID');
      const previous=current.questions.find(p=>p.id===q.id);
      if(q.legacyKey&&!previous)throw new BadRequestException('Unknown original custom question');
      if(previous?.legacyKey) q.legacyKey=previous.legacyKey;
      submitted.set(q.id,q);
    }
    // An omitted default is archived, never erased, preserving existing answers.
    for(const old of current.questions)
      if(!submitted.has(old.id))submitted.set(old.id,{...old,enabled:old.locked});
    const questions=[...submitted.values()].sort((a,b)=>a.section-b.section||a.order-b.order);
    try{
      const result=await this.collection.updateOne(
        {_id:'active' as any,revision:input.revision},
        {$set:{questions,revision:input.revision+1,updatedAt:new Date(),updatedBy:actorId}},
        {upsert:input.revision===0},
      );
      if(!result.matchedCount&&!result.upsertedCount)throw new ConflictException('Schema updated elsewhere');
    }catch(e:any) {
      if(e?.code===11000)throw new ConflictException('Schema updated elsewhere. Refresh.');
      throw e;
    }
    await this.db.collection('profile_question_audit').insertOne({
      actorId,action:'schema.save',revision:input.revision+1,createdAt:new Date(),
      questionCount:questions.length,
    });
    return this.get();
  }
  applyPublicVisibility(data:Record<string,any>,schema:QuestionSchema){
    // Capture gender before removing it: it still determines which questions
    // apply, even if administrators hide the gender answer itself.
    const audienceGender = data.gender;
    for(const q of schema.questions) {
      if(!q.path)continue;
      const original=builtins.get(q.id);
      const inOriginalSection=!original||original.section===q.section;
      if(q.enabled&&q.showPublic&&!usesSeparateAnswerStorage(q)&&
          inOriginalSection&&
          (q.gender==='both'||q.gender===audienceGender))continue;
      // This only edits the serialized public-profile copy, never the user.
      const parts=q.path.split('.');
      if(parts.length===1)delete data[parts[0]];
      else if(data[parts[0]]&&typeof data[parts[0]]==='object')
        delete data[parts[0]][parts[1]];
    }
    return data;
  }
  async publicAnswers(user:any, unlocked=false, s?:QuestionSchema) {
    s ||= await this.get();
    const output:Record<string,unknown>={};
    for(const q of s.questions) {
      if(!q.enabled||!q.showPublic||
        (q.gender!=='both'&&q.gender!==user.gender))continue;
      const original=builtins.get(q.id);
      const moved=!!(q.path&&original&&original.section!==q.section);
      // Normal built-ins appear in their original InfoRows. Moved built-ins
      // and new/custom/redesigned fields are rendered by PublicExtraRows.
      const standalone=!!(q.path?.startsWith('pledge.')||q.path==='howYouWannaGetMarried');
      if(q.path&&!usesSeparateAnswerStorage(q)&&!moved&&!standalone)continue;
      if(!unlocked&&unlockOnlyFields.has(q.path||''))continue;
      const answer=answerForQuestion(user,q);
      if(answer!==undefined&&answer!==null&&answer!==''&&
        !(Array.isArray(answer)&&!answer.length)){
        const secrets=[user.name,user.fatherName,user.motherName,user.phoneNumber,
          user.whatsapp,user.guardianPhone,user.email,user.address?.presentAddress,
          user.address?.permanentAddress].filter((x:unknown)=>typeof x==='string'&&x.length>=3) as string[];
        const scrub=(input:string)=>{
          if(unlocked)return input;
          let text=input;
          for(const secret of secrets)text=text.split(secret).join('[সংরক্ষিত]');
          return text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[সংরক্ষিত]')
            .replace(/(?:\+?\d[\d\s()-]{8,}\d)/g,'[সংরক্ষিত]');
        };
        output[q.id]=Array.isArray(answer)?answer.map(x=>scrub(String(x))):
          typeof answer==='string'?scrub(answer):answer;
      }
    }
    return output;
  }
}
