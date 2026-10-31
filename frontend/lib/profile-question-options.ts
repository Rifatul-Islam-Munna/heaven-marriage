import {
 countries, marriedStatus, educationMediumOptions, educationOptions,
 skinColorOptions, religiousEducationOptions, fiqhOptions, economicStatusOptions,
 professionOptions, polygamyConsentOptions,
} from '@/staticData/all-data';
import { districts } from '@/staticData/districts';
import { upazilas } from '@/staticData/upazilas';
import type { ProfileQuestion,QuestionOption } from './profile-questions';

const strings=(items:string[]):QuestionOption[]=>items.map(s=>({value:s,label:s}));
const format=(items:any[],value='value',label='label'):QuestionOption[]=>items.map(i=>({
 value:String(i[value]),label:String(i[label]),
}));
/**
 * Option values are React keys and stored answers, so they must be unique.
 * Some static lists repeat a name (e.g. upazilas "Kaukhali" and "Daulatpur"
 * exist in two districts); they store the same value, so keep the first.
 */
function uniqueOptions(options:QuestionOption[]):QuestionOption[]{
 const seen=new Set<string>();
 return options.filter(option=>{
  if(seen.has(option.value))return false;
  seen.add(option.value);
  return true;
 });
}
export function profileQuestionOptions(q:ProfileQuestion,gender?:string,formData?:Record<string,any>):QuestionOption[]{
 return uniqueOptions(rawProfileQuestionOptions(q,gender,formData));
}
function rawProfileQuestionOptions(q:ProfileQuestion,gender?:string,formData?:Record<string,any>):QuestionOption[]{
 if(q.options?.length)return q.options;
 const filtered=(items:any[])=>items.filter(i=>!i.gender||i.gender==='all'||
   i.gender==='both'||i.gender===gender);
 const partner=gender==='male'?'female':'male';
 switch(q.optionSource) {
 case 'gender':return [{value:'male',label:'পুরুষ'},{value:'female',label:'মহিলা'}];
 case 'maritalStatus':return format(filtered(marriedStatus).filter(i=>i.en!=='all'),'en','bn');
 case 'partnerMaritalStatus':return format(marriedStatus.filter(i=>i.gender==='all'||i.gender===partner).filter(i=>i.en!=='all'),'bn','bn');
 case 'bloodGroup':return strings(['A+','A-','B+','B-','O+','O-','AB+','AB-']);
 case 'countries':return format(countries,'en','bn');
 case 'districts':return format(districts,'name','bn_name');
 case 'upazilas':{
   const selected=districts.find(d=>d.name===formData?.address?.district);
   return format(upazilas.filter(u=>!selected||u.district_id===selected.id),'name','bn_name');
 }
 case 'educationBackground':return format(filtered(educationOptions),'bangla','bangla');
 case 'educationMethod':return format(educationMediumOptions);
 case 'skinTone':return format(filtered(skinColorOptions),'label','label');
 case 'partnerComplexion':return format(skinColorOptions.filter(i=>!i.gender||i.gender==='both'||i.gender===partner),'label','label');
 case 'physicalStructure':return strings(['হালকা পাতলা গড়ন এর','মাঝারি স্বাস্থ্যধারী','ভারীদেহী']);
 case 'islamicStudy':return format(religiousEducationOptions,'label','label');
 case 'fiqhFollow':return format(fiqhOptions,'label','label');
 case 'familyFinancial':return format(economicStatusOptions);
 case 'partnerFinancial':return format(economicStatusOptions,'label','label');
 case 'profession':return format(professionOptions);
 case 'partnerEducation':return format(educationOptions.filter(i=>i.gender==='both'||i.gender===partner),'bangla','bangla');
 case 'polygamy':return format(polygamyConsentOptions);
 case 'childCare':return strings(['জি, প্রস্তুত আছি।','না, প্রস্তুত নাই','শর্তসাপেক্ষ প্রস্তুত আছি।']);
 case 'childCustody':return strings(['আমার সাথে','তার বাবার কাছে','আমার পরিবারের কারোর কাছে','প্রযোজ্য না']);
 case 'marriageMethod':return strings(['Niqaha এর মাধ্যমে','নিজে নিজে','আলোচনা সাপেক্ষ']);
 case 'height': {
   const data:QuestionOption[]=[];
   for(let feet=4;feet<=7;feet++)for(let inch=0;inch<=(feet===7?0:11);inch++){
     if(feet===4&&inch<4)continue;
     data.push({value:feet+'.'+inch,label:feet+' ফুট '+inch+' ইঞ্চি'});
   }
   return data;
 }
 default:return [];
 }
}
