import fallback from './profile-question-defaults.json';

export const PROTECTED_LOCATION_PATHS = new Set([
 'nationality','residenceCountry','address.district','address.upazila',
 'address.cityCorporation','address.area',
]);
export const isProtectedLocationQuestion=(q:{path?:string}|null|undefined)=>
  !!q?.path&&PROTECTED_LOCATION_PATHS.has(q.path);
export type QuestionGender = 'male'|'female'|'both';
export type QuestionType = 'text'|'textarea'|'number'|'select'|'dropdown'|'checkbox'|'multi_checkbox';
export type QuestionOption = {label:string;value:string};
export type ProfileQuestion = {
 id:string; path?:string;legacyKey?:string;question:string;publicLabel:string;
 section:number;gender:QuestionGender;type:QuestionType;options:QuestionOption[];
 optionSource:string;required:boolean;enabled:boolean;showPublic:boolean;
 order:number;locked:boolean;
};
export type ProfileQuestionSchema = {
 revision:number;sections:{id:number;title:string}[];questions:ProfileQuestion[];
};
const extraLocationQuestions = [
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
 if(!q.path&&!q.legacyKey)return true;
 const kind=(type:QuestionType)=>{
   if(type==='checkbox')return 'boolean';
   if(type==='multi_checkbox')return 'array';
   if(type==='number')return 'number';
   return 'string';
 };
 if(q.legacyKey)return kind(q.type)!=='string';
 const original=defaultById.get(q.id);
 if(!original)return true;
 if(kind(q.type)!==kind(original.type))return true;
 if(q.path==='gender'&&q.options.some(option=>!['male','female'].includes(option.value)))return true;
 return false;
}
export function locationQuestionApplies(q: ProfileQuestion, profile: Record<string,any>):boolean {
 const path=q.path || '';
 if(['address.district','address.upazila','address.cityCorporation','address.area'].includes(path)) {
   if(profile?.residenceCountry && profile.residenceCountry!=='Bangladesh')return false;
   if(['address.upazila','address.cityCorporation'].includes(path) && !profile?.address?.district)return false;
   if(path==='address.area' && (!profile?.address?.district ||
     !(profile?.address?.cityCorporation || profile?.address?.upazila)))return false;
   if(path==='address.upazila' && profile?.address?.cityCorporation)return false;
 }
 return true;
}
export function questionApplies(q:ProfileQuestion,gender?:string){
 return q.enabled&&(q.gender==='both'||q.gender===gender);
}
export function readQuestionAnswer(profile:Record<string,any>,q:ProfileQuestion):unknown {
 if(questionUsesSeparateStorage(q))return profile.dynamicAnswers?.[q.id];
 if(q.legacyKey)return profile.customFields?.[q.legacyKey];
 return q.path?.split('.').reduce<any>((v,key)=>v?.[key],profile);
}
export function questionDisplayValue(value:unknown,q:ProfileQuestion):string {
 if(value===null||value===undefined||value==='')return '';
 if(Array.isArray(value))return value.map(v=>q.options.find(o=>o.value===v)?.label||v).join(' • ');
 if(typeof value==='boolean')return value?'হ্যাঁ':'না';
 if(['select','dropdown'].includes(q.type))
  return q.options.find(o=>o.value===String(value))?.label||String(value);
 return String(value);
}
export function getMissingQuestions(profile:Record<string,any>,schema:ProfileQuestionSchema,step?:number){
 return schema.questions.filter(q=>questionApplies(q,profile.gender)&&locationQuestionApplies(q,profile)&&q.required&&
  (step===undefined||q.section===step)).filter(q=>{
    const v=readQuestionAnswer(profile,q);
    return v===undefined||v===null||v===''||(Array.isArray(v)&&v.length===0)||
      (q.type==='checkbox'&&v!==true)||(q.type==='number'&&v===0);
  }).map(q=>q.question);
}
