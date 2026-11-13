'use client';
import { useMemo,useState } from 'react';
import { useProfileStore } from '@/zustan/useProfileStore';
import { profileQuestionOptions } from '@/lib/profile-question-options';
import {useQueryWrapper} from '@/api-hooks/react-query-wrapper';
import type {LocationEntry,LocationResponse} from '@/lib/location-options';
import {
 questionApplies,locationQuestionApplies,readQuestionAnswer,questionUsesSeparateStorage,questionRuleErrors,type ProfileQuestion, type ProfileQuestionSchema,
} from '@/lib/profile-questions';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {ageFromBirthDate,latestBirthDate} from '@/lib/birth-date';

export function QuestionInput({
 q,value,onChange,gender,profile,preview=false,locations=[],error,
}:{
 q:ProfileQuestion;value:unknown;
 onChange:(next:string|number|boolean|string[])=>void;
 gender?:string;profile?:Record<string,any>;preview?:boolean;locations?:LocationEntry[];
 error?:string;
}){
 const [optionSearch,setOptionSearch]=useState('');
 const options=profileQuestionOptions(q,gender,profile,locations);
 const filteredOptions=options.filter(opt=>opt.value===String(value??'') ||
   !optionSearch || opt.label.toLocaleLowerCase().includes(optionSearch.toLocaleLowerCase()) ||
   opt.value.toLocaleLowerCase().includes(optionSearch.toLocaleLowerCase()));
 const raw=(value===undefined||value===null?'':value);
 const id='question-'+q.id;
 const choices=q.type==='multi_checkbox';
 return <div className="space-y-2 rounded-xl border border-pink-100 bg-white p-4 shadow-sm" data-profile-question={q.id} data-invalid={!!error||undefined}>
  <Label htmlFor={id} className="block font-medium leading-relaxed text-gray-800">
    {q.question} {q.required&&<span className="text-pink-600" aria-label="required">*</span>}
  </Label>
  {q.type==='checkbox'?(
   <label className="flex cursor-pointer items-center gap-3 py-2 text-sm">
    <Checkbox id={id} aria-invalid={!!error} aria-describedby={error?id+'-error':undefined} checked={raw===true} onCheckedChange={checked=>onChange(checked===true)}/>
    <span>{raw===true?'হ্যাঁ':'না'}</span>
   </label>
  ):choices?(
   <fieldset className="grid gap-2 sm:grid-cols-2">
     {options.map(opt=><label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm">
       <Checkbox checked={Array.isArray(raw)&&raw.includes(opt.value)} onCheckedChange={checked=>{
         const previous=Array.isArray(raw)?raw.map(String):[];
         onChange(checked===true?[...new Set([...previous,opt.value])]:previous.filter(x=>x!==opt.value));
       }}/><span>{opt.label}</span>
     </label>)}
     {!options.length&&<span className="text-xs text-amber-700">No options configured.</span>}
   </fieldset>
  ):q.type==='textarea'?(
   <Textarea id={id} aria-invalid={!!error} aria-describedby={error?id+'-error':undefined} value={String(raw)} onChange={event=>onChange(event.target.value)}
     rows={4} maxLength={5000} dir="auto" className="border-pink-200" placeholder="আপনার উত্তর লিখুন..." />
  ):(q.type==='select'||q.type==='dropdown')?(
   <div className="space-y-2">
     {(q.optionSource==='countries' || options.length>15) &&
       <input type="search" value={optionSearch} onChange={event=>setOptionSearch(event.target.value)}
         aria-label={`Search ${q.question}`} placeholder="Search options / দেশ খুঁজুন..."
         className="h-10 w-full rounded-lg border border-pink-200 px-3 text-sm focus:outline-pink-500" />}
     <select id={id} aria-invalid={!!error} aria-describedby={error?id+'-error':undefined} value={String(raw)} onChange={event=>onChange(event.target.value)}
       className="h-11 w-full rounded-lg border border-pink-200 bg-white px-3 text-sm focus:outline-pink-500">
       <option value="">নির্বাচন করুন</option>
       {String(raw)&&!options.some(opt=>opt.value===String(raw))&&
         <option value={String(raw)}>{String(raw)} (saved answer)</option>}
       {filteredOptions.map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}
     </select>
     {!options.length && <p className="text-xs text-amber-700">আগের ঠিকানা বা parent নির্বাচন করুন।</p>}
     {!!optionSearch && !filteredOptions.length && <p className="text-xs text-slate-500">No matching options</p>}
   </div>
  ):(
   <Input id={id} type={q.type==='number'?'number':q.type==='date'?'date':'text'} dir="auto"
     aria-invalid={!!error} aria-describedby={error?id+'-error':undefined}
     required={q.required} max={q.path==='dateOfBirth'?latestBirthDate():undefined}
     value={String(raw)} maxLength={q.type==='number'?undefined:5000}
     onChange={event=>onChange(q.type==='number'?(event.target.value===''?'':Number(event.target.value)):event.target.value)}
     className="border-pink-200" placeholder="আপনার উত্তর লিখুন..." />
  )}
  {error&&<p id={id+'-error'} role="alert" className="text-sm text-destructive">{error}</p>}
  {preview&&<p className="text-[11px] text-muted-foreground">Live preview • {q.gender==='both'?'Both':q.gender} • {q.showPublic?(q.publicLabel||'Public label missing'):'Hidden publicly'}</p>}
 </div>;
}

export function DynamicQuestionStep({step,schema}:{step:number;schema:ProfileQuestionSchema}){
 const profile=useProfileStore(state=>state.formData);
 const updateField=useProfileStore(state=>state.updateField);
 const updateNestedField=useProfileStore(state=>state.updateNestedField);
 const updateCustomField=useProfileStore(state=>state.updateCustomField);
 const updateDynamicAnswer=useProfileStore(state=>state.updateDynamicAnswer);
 const {data:locations}=useQueryWrapper<LocationResponse>(['public-location-options'],'/profile-questions/locations',{staleTime:60000});
 const questions=useMemo(()=>schema.questions
   .filter(q=>q.path!=='age'&&q.section===step&&questionApplies(q,profile.gender)&&locationQuestionApplies(q,profile))
   .sort((a,b)=>a.order-b.order),[schema,step,profile]);
 const errors=questionRuleErrors(profile,schema.questions);
 const setAnswer=(q:ProfileQuestion,answer:string|number|boolean|string[])=>{
   if(q.path==='dateOfBirth'){
     updateField('dateOfBirth',String(answer));
     updateField('age',ageFromBirthDate(String(answer)));
     return;
   }
   if(questionUsesSeparateStorage(q)){updateDynamicAnswer(q.id,answer);return;}
   if(q.legacyKey){updateCustomField(q.legacyKey,String(answer));return;}
   if(!q.path)return;
   const normalized= typeof answer==='string'&&['age','weight','familyInfo.brotherCount','familyInfo.sisterCount','personalInformation.height'].includes(q.path)
     ? (answer===''?undefined:Number(answer)) : answer;
   const [parent,field]=q.path.split('.');
   if(field){
     updateNestedField(parent as any,field,normalized);
     if(q.path==='address.district'){
       updateNestedField('address','upazila','');
       updateNestedField('address','cityCorporation','');
       updateNestedField('address','area','');
     }
     if(q.path==='address.cityCorporation'){
       updateNestedField('address','upazila','');
       updateNestedField('address','area','');
     }
     if(q.path==='address.upazila'){
       updateNestedField('address','cityCorporation','');
       updateNestedField('address','area','');
     }
   }else updateField(q.path as any,normalized as any);
 };
 if(!questions.length)return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
    এই ধাপে কোনো প্রশ্ন নেই।
  </div>;
 return <div className="grid gap-4 md:grid-cols-2">
  {questions.map(q=><div key={q.id} className={q.type==='textarea'||q.question.length>130?'md:col-span-2':''}>
   <QuestionInput q={q} gender={profile.gender} profile={profile} locations={locations?.entries}
     error={errors.find(error=>error.questionId===q.id||error.otherQuestionId===q.id)?.message}
     value={readQuestionAnswer(profile,q)} onChange={answer=>setAnswer(q,answer)}/>
  </div>)}
 </div>;
}
