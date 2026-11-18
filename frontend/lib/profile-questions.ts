import fallback from './profile-question-defaults.json';
import {ageFromBirthDate,formatBirthDate} from './birth-date';

export const PROTECTED_LOCATION_PATHS = new Set([
 'nationality','residenceCountry','address.district','address.upazila',
 'address.cityCorporation','address.area',
]);
export const isProtectedLocationQuestion=(q:{path?:string}|null|undefined)=>
  !!q?.path&&PROTECTED_LOCATION_PATHS.has(q.path);
export const isProtectedQuestion=(q:{path?:string}|null|undefined)=>
  isProtectedLocationQuestion(q)||q?.path==='dateOfBirth';
export type QuestionGender = 'male'|'female'|'both';
export type QuestionType = 'text'|'textarea'|'number'|'date'|'select'|'dropdown'|'checkbox'|'multi_checkbox';
export type QuestionOption = {label:string;value:string};
export type QuestionRule = {type:'not_equal';questionId:string;message?:string};
export type ProfileQuestion = {
 id:string; path?:string;legacyKey?:string;answerStorage?:'dynamic';question:string;publicLabel:string;
 section:number;gender:QuestionGender;type:QuestionType;options:QuestionOption[];
 optionSource:string;required:boolean;enabled:boolean;showPublic:boolean;
 order:number;locked:boolean;
 rules?:QuestionRule[];
};
export type ProfileQuestionSchema = {
 revision:number;sections:{id:number;title:string}[];questions:ProfileQuestion[];
};
const extraLocationQuestions = [
  {id:'builtin_8e65c7400068cbe0',path:'dateOfBirth',question:'জন্ম তারিখ',
    publicLabel:'জন্ম তারিখ',section:0,gender:'both',type:'date',options:[],
    optionSource:'',required:true,enabled:true,showPublic:true,order:490,locked:false},
  {id:'builtin_8e65c7400068cbdd',path:'residenceCountry',question:'আপনি বর্তমানে কোন দেশে বসবাস করছেন?',
    publicLabel:'বর্তমান বসবাসের দেশ',section:0,gender:'both',type:'select',
    options:[],optionSource:'countries',required:false,enabled:true,showPublic:true,order:850,locked:false},
  {id:'builtin_8e65c7400068cbde',path:'address.cityCorporation',
    question:'সিটি কর্পোরেশন (উপজেলার পরিবর্তে নির্বাচন করতে পারেন)',
    publicLabel:'সিটি কর্পোরেশন',section:1,gender:'both',type:'select',options:[],
    optionSource:'cityCorporations',required:false,enabled:true,showPublic:true,order:150,locked:false},
  {id:'builtin_8e65c7400068cbdf',path:'address.area',
    question:'এলাকা / মহল্লা / ওয়ার্ড (যেমন: Gulshan)',
    publicLabel:'এলাকা',section:1,gender:'both',type:'select',options:[],
    optionSource:'cityAreas',required:false,enabled:true,showPublic:true,order:180,locked:false},
];
export const defaultQuestions:ProfileQuestionSchema={
 revision:0,
 sections:fallback.sections,
 questions:[...fallback.questions,...extraLocationQuestions].map(q=>({...q,locked:['email','phoneNumber','password'].includes(q.path||'')})) as ProfileQuestion[],
};
const defaultById=new Map(defaultQuestions.questions.map(q=>[q.id,q]));
export function questionUsesSeparateStorage(q:ProfileQuestion):boolean {
 if(q.answerStorage==='dynamic')return true;
 if(!q.path&&!q.legacyKey)return true;
 const kind=(type:QuestionType)=>{
   if(type==='checkbox')return 'boolean';
   if(type==='multi_checkbox')return 'array';
   if(type==='number')return 'number';
   return 'string';
 };
 // Legacy text prompts are mutable; new edits go to the stable question ID.
 // The reader still falls back to customFields[legacyKey] for all old answers.
 if(q.legacyKey)return true;
 const original=defaultById.get(q.id);
 if(!original)return true;
 if(kind(q.type)!==kind(original.type))return true;
 if(q.path==='gender'&&q.options.some(option=>!['male','female'].includes(option.value)))return true;
 return false;
}
export function locationQuestionLabel(q:ProfileQuestion):string {
 if(q.path==='address.district' && q.question.trim()==='বর্তমান ঠিকানা')return 'জেলা নির্বাচন করুন';
 if(q.path==='address.upazila' && q.question.trim()==='বর্তমান ঠিকানা')return 'উপজেলা নির্বাচন করুন';
 if(q.path==='address.presentAddress' && q.question.trim()==='বর্তমান ঠিকানা')return 'বর্তমান ঠিকানার বিস্তারিত';
 return q.question;
}
export function questionInputAttributes(q:ProfileQuestion){
 if(q.type==='number')return {type:'number',inputMode:
   ['age','familyInfo.brotherCount','familyInfo.sisterCount'].includes(q.path||'')?'numeric':'decimal'} as const;
 if(q.type==='date')return {type:'date'} as const;
 if(q.type==='text'&&['phoneNumber','guardianPhone','whatsapp'].includes(q.path||''))
   return {type:'tel',inputMode:'tel'} as const;
 if(q.type==='text'&&q.path==='educationInfo.highestEducationPassingYear')
   return {type:'text',inputMode:'numeric'} as const;
 return {type:'text'} as const;
}
export function locationQuestionVisible(q: ProfileQuestion, profile: Record<string,any>):boolean {
 const path=q.path || '';
 if(['address.district','address.upazila','address.cityCorporation','address.area'].includes(path)) {
   if(profile?.residenceCountry && profile.residenceCountry!=='Bangladesh')return false;
   if(['address.upazila','address.cityCorporation'].includes(path) && !profile?.address?.district)return false;
   // Upazila and city corporation are alternatives. If legacy data contains both,
   // keep upazila visible as the deterministic source of truth so it can be corrected.
   if(path==='address.cityCorporation' && profile?.address?.upazila)return false;
   if(path==='address.upazila' && profile?.address?.cityCorporation && !profile?.address?.upazila)return false;
   if(path==='address.area' && (!profile?.address?.district ||
     !(profile?.address?.cityCorporation || profile?.address?.upazila)))return false;
 }
 return true;
}
export function locationQuestionApplies(q: ProfileQuestion, profile: Record<string,any>):boolean {
 return locationQuestionVisible(q,profile);
}
export function questionApplies(q:ProfileQuestion,gender?:string){
 return q.enabled&&(q.gender==='both'||q.gender===gender);
}
export function readQuestionAnswer(profile:Record<string,any>,q:ProfileQuestion):unknown {
 // Match the backend reader: Mongoose Map values and plain JSON objects are both valid.
 // A redesigned input must still show the answer saved before its type changed.
 // An explicit empty/false/zero override must never resurrect the older value.
 const readStored=(source:any,key:string)=>source instanceof Map?source.get(key):source?.[key];
 const hasStored=(source:any,key:string)=>source instanceof Map?source.has(key):
  Object.prototype.hasOwnProperty.call(source||{},key);
 if(questionUsesSeparateStorage(q)&&hasStored(profile.dynamicAnswers,q.id))
  return readStored(profile.dynamicAnswers,q.id);
 if(q.legacyKey)return readStored(profile.customFields,q.legacyKey);
 if(q.path==='age')return ageFromBirthDate(profile.dateOfBirth)??profile.age;
 return q.path?.split('.').reduce<any>((v,key)=>v?.[key],profile);
}
export function questionAnswerFitsInput(value:unknown,q:ProfileQuestion,options:QuestionOption[]=q.options):boolean {
 if(value===undefined||value===null||value==='')return true;
 if(q.type==='checkbox')return typeof value==='boolean';
 if(q.type==='multi_checkbox')return Array.isArray(value)&&value.every(v=>options.some(o=>o.value===v));
 if(q.type==='number')return (typeof value==='number'||typeof value==='string'&&
  /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value))&&Number.isFinite(Number(value));
 if(q.type==='date')return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
  Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
 return !Array.isArray(value);
}
/** Keep historic multiple selections even if the question was formerly text/select.
 * Editing converts a legacy scalar to an array without discarding its values. */
export function savedMultiValues(value:unknown):string[] {
 if(Array.isArray(value))return [...new Set(value.filter((v):v is string=>typeof v==='string'&&!!v.trim()))];
 if(typeof value==='string'&&value.trim())return [...new Set(value.split(/\s*[,،•]\s*/).map(v=>v.trim()).filter(Boolean))];
 return [];
}
export function questionOptionsWithSavedAnswer(q:ProfileQuestion,options:QuestionOption[],value:unknown):QuestionOption[] {
 if(q.type!=='multi_checkbox')return options;
 const missing=savedMultiValues(value).filter(v=>!options.some(o=>o.value===v));
 return [...options,...missing.map(v=>({value:v,label:v+' (saved answer)'}))];
}
export function questionRuleErrors(profile:Record<string,any>,questions:ProfileQuestion[]){
 const byId=new Map(questions.map(q=>[q.id,q]));
 const errors:{questionId:string;otherQuestionId:string;message:string}[]=[];
 const seen=new Set<string>();
 const applies=(q:ProfileQuestion)=>questionApplies(q,profile.gender)&&locationQuestionApplies(q,profile);
 const present=(value:unknown)=>value!==undefined&&value!==null&&value!==''&&!Array.isArray(value);
 for(const question of questions){
  if(!applies(question))continue;
  for(const rule of question.rules||[]){
   const other=byId.get(rule.questionId);
   if(rule.type!=='not_equal'||!other||!applies(other))continue;
   const left=readQuestionAnswer(profile,question),right=readQuestionAnswer(profile,other);
   const pair=[question.id,other.id].sort().join(':');
   if(present(left)&&present(right)&&left===right&&!seen.has(pair)){
    seen.add(pair);
    errors.push({questionId:question.id,otherQuestionId:other.id,
     message:rule.message||`“${question.question}” ও “${other.question}” এর উত্তর আলাদা হতে হবে।`});
   }
  }
 }
 return errors;
}
/** Rules added after older answers must not block saving unrelated edits. */
export function newQuestionRuleErrors(
  profile:Record<string,any>,questions:ProfileQuestion[],before?:Record<string,any>
){
 const errors=questionRuleErrors(profile,questions);
 if(!before)return errors;
 const existing=new Set(questionRuleErrors(before,questions).map(error=>
  [error.questionId,error.otherQuestionId].sort().join(':')));
 return errors.filter(error=>!existing.has([error.questionId,error.otherQuestionId].sort().join(':')));
}
export function questionDisplayValue(value:unknown,q:ProfileQuestion):string {
 if(value===null||value===undefined||value==='')return '';
 if(q.path==='dateOfBirth')return formatBirthDate(value as string);
 if(Array.isArray(value))return value.map(v=>q.options.find(o=>o.value===String(v))?.label||String(v)).join(', ');
 if(typeof value==='boolean')return value?'হ্যাঁ':'না';
 if(q.type==='date' && typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value))
  return new Date(value+'T00:00:00').toLocaleDateString('bn-BD',{day:'numeric',month:'long',year:'numeric'});
 if(['select','dropdown'].includes(q.type))
  return q.options.find(o=>o.value===String(value))?.label||String(value);
 return String(value);
}
export function getMissingQuestions(profile:Record<string,any>,schema:ProfileQuestionSchema,step?:number){
 return schema.questions.filter(q=>questionApplies(q,profile.gender)&&locationQuestionApplies(q,profile)&&q.required&&
  (step===undefined||q.section===step)).filter(q=>{
    const v=readQuestionAnswer(profile,q);
    if(q.path==='dateOfBirth')return ageFromBirthDate(v as string)===undefined;
    return v===undefined||v===null||v===''||(Array.isArray(v)&&v.length===0)||
      (q.type==='checkbox'&&v!==true)||(q.type==='number'&&v===0);
  }).map(q=>q.question);
}
