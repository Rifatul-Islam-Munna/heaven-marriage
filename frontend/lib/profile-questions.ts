import fallback from './profile-question-defaults.json';

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
export const defaultQuestions:ProfileQuestionSchema={
 revision:0,
 sections:fallback.sections,
 questions:fallback.questions.map(q=>({...q,locked:['email','phoneNumber','password'].includes(q.path||'')})) as ProfileQuestion[],
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
 return schema.questions.filter(q=>questionApplies(q,profile.gender)&&q.required&&
  (step===undefined||q.section===step)).filter(q=>{
    const v=readQuestionAnswer(profile,q);
    return v===undefined||v===null||v===''||(Array.isArray(v)&&v.length===0)||
      (q.type==='checkbox'&&v!==true)||(q.type==='number'&&v===0);
  }).map(q=>q.question);
}
