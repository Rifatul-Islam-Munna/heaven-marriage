import { BadRequestException } from '@nestjs/common';

export type PremiumSettings = {
  visible:boolean; enabled:boolean; title:string; summary:string; intro:string;
  steps:string[]; footer:string; requestLabel:string;detailsLabel:string;
  contactPhone:string; fee:number;
  durationDays:number; assistedConnections:number; includedConnections:number;
  serviceCharge:number; extraConnectionFee:number; extraConnectionPolicy:string;
  adHeadline:string; adDescription:string; benefits:string[];
};
export const defaultPremiumSettings:PremiumSettings={
  visible:true,enabled:true,title:'Premium Marriage Assistance',
  summary:'আমাদের টিম আপনার পছন্দ ও প্রত্যাশা অনুযায়ী বায়োডাটা Shortlist ও Connection-এর সিদ্ধান্তে সাহায্য করবে।',
  intro:'Premium একটি ঐচ্ছিক Assisted Matrimony Service; সাধারণ বায়োডাটা জমা বিনামূল্যে।',
  steps:[
    'বিনামূল্যে Signup করে বায়োডাটা সম্পূর্ণ করুন।',
    'Premium-এর মূল্য, সুবিধা, মেয়াদ এবং অতিরিক্ত চার্জ দেখে আবেদন করুন।',
    'পেমেন্ট যাচাইয়ের পর টিম আপনার পছন্দ ও চাহিদা অনুযায়ী Shortlist-এ সহায়তা করবে।',
    'টিমের সঙ্গে পরামর্শ করে বায়োডাটার Connection নিতে পারবেন।',
  ],
  footer:'Premium মানে ব্যক্তিগত সহায়তা—জীবনসঙ্গী নিশ্চিত করা বা পরিচয়পত্র যাচাইয়ের বিকল্প নয়।',
  requestLabel:'Premium Service Request',detailsLabel:'Premium এর বিস্তারিত ও শর্ত দেখুন',
  contactPhone:'01748919251',fee:1000,
  durationDays:90,assistedConnections:3,includedConnections:0,
  serviceCharge:0,extraConnectionFee:0,
  extraConnectionPolicy:'প্যাকেজের Assisted Connection শেষ হলে নতুন Connection কেনা বা টিমের সঙ্গে যোগাযোগ করতে হবে। আলাদা চার্জ থাকলে অর্ডারের আগে জানানো হবে।',
  adHeadline:'Premium সহায়তায় উপযুক্ত জীবনসঙ্গী খোঁজার যাত্রা শুরু করুন',
  adDescription:'একটি Free Biodata, সঙ্গে ঐচ্ছিক Premium Team Assistance। শর্ত ও মূল্য আগে দেখে নিন।',
  benefits:['পছন্দ অনুযায়ী Biodata Shortlist-এ সহায়তা','যোগাযোগ ও Connection-এর ধাপে টিমের সহযোগিতা','পরিষ্কার সার্ভিস স্ট্যাটাস ও মেয়াদ'],
};
export function resolvePremiumSettings(saved:unknown):PremiumSettings {
  const v=saved && typeof saved==='object'&&!Array.isArray(saved)?saved as Partial<PremiumSettings>:{};
  return {...defaultPremiumSettings,...v,
    benefits:Array.isArray(v.benefits)?v.benefits:defaultPremiumSettings.benefits};
}
export function premiumTotal(settings:PremiumSettings):number {return settings.fee+settings.serviceCharge;}
export function parsePremiumSettings(raw:unknown):PremiumSettings {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new BadRequestException('Premium settings must be an object');
  const v=raw as Record<string,unknown>, existing=resolvePremiumSettings(raw);
  if(typeof v.enabled!=='boolean')throw new BadRequestException('Premium enabled must be true or false');
  if(v.visible!==undefined&&typeof v.visible!=='boolean')throw new BadRequestException('Premium visible must be true or false');
  const txt=(key:keyof PremiumSettings,max:number,optional=false)=>{
    const value=existing[key];
    if(typeof value!=='string'||(!optional&&!value.trim())||value.length>max)
      throw new BadRequestException(String(key)+' must be text (up to '+max+' characters)');
    return value.trim();
  };
  const amount=(key:keyof PremiumSettings,min:number,max:number)=>{
    const value=existing[key];
    if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min||value>max)
      throw new BadRequestException(String(key)+' must be between '+min+' and '+max);
    return value;
  };
  const fee=amount('fee',1,1000000), serviceCharge=amount('serviceCharge',0,1000000);
  if(fee+serviceCharge>1000000)throw new BadRequestException('Total premium payment may not exceed 1,000,000 BDT');
  if(!Array.isArray(existing.steps)||existing.steps.length<1||existing.steps.length>10||existing.steps.some(s=>typeof s!=='string'||!s.trim()||s.length>500))
    throw new BadRequestException('Use 1–10 Premium steps, each under 500 characters');
  if(!Array.isArray(existing.benefits)||existing.benefits.length<1||existing.benefits.length>8||
    existing.benefits.some(s=>typeof s!=='string'||!s.trim()||s.length>180))
    throw new BadRequestException('Use 1–8 Premium benefits, each under 180 characters');
  const contactPhone=txt('contactPhone',20,true);
  if(contactPhone&&!/^\+?[0-9]{8,15}$/.test(contactPhone))throw new BadRequestException('Invalid premium contact number');
  return {
    visible: v.visible!==false,enabled:v.enabled as boolean,
    title:txt('title',120),summary:txt('summary',2000),intro:txt('intro',2000),
    steps:existing.steps.map(x=>x.trim()),footer:txt('footer',2000),
    requestLabel:txt('requestLabel',100),detailsLabel:txt('detailsLabel',100),
    contactPhone,fee,serviceCharge,durationDays:amount('durationDays',1,3650),
    assistedConnections:amount('assistedConnections',0,10000),
    includedConnections:amount('includedConnections',0,10000),
    extraConnectionFee:amount('extraConnectionFee',0,1000000),
    extraConnectionPolicy:txt('extraConnectionPolicy',1000),
    adHeadline:txt('adHeadline',200),adDescription:txt('adDescription',500),
    benefits:existing.benefits.map(x=>x.trim()),
  };
}
