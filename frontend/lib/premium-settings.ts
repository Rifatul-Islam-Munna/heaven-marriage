export type PremiumSettings={
  visible:boolean;enabled:boolean;title:string;summary:string;intro:string;
  steps:string[];footer:string;requestLabel:string;detailsLabel:string;
  contactPhone:string;fee:number;
  durationDays:number;assistedConnections:number;includedConnections:number;
  serviceCharge:number;extraConnectionFee:number;extraConnectionPolicy:string;
  adHeadline:string;adDescription:string;benefits:string[];
};
export const defaultPremiumSettings:PremiumSettings={
  visible:true,enabled:true,title:'Premium Marriage Assistance',
  summary:'আমাদের টিম আপনার পছন্দ ও প্রত্যাশা অনুযায়ী বায়োডাটা Shortlist ও Connection-এর সিদ্ধান্তে সাহায্য করবে।',
  intro:'Premium একটি ঐচ্ছিক Assisted Matrimony Service; সাধারণ বায়োডাটা জমা বিনামূল্যে।',
  steps:['বিনামূল্যে Signup করে বায়োডাটা সম্পূর্ণ করুন।',
    'Premium-এর মূল্য, সুবিধা, মেয়াদ এবং অতিরিক্ত চার্জ দেখে আবেদন করুন।',
    'পেমেন্ট যাচাইয়ের পর টিম আপনার পছন্দ ও চাহিদা অনুযায়ী Shortlist-এ সহায়তা করবে।',
    'টিমের সঙ্গে পরামর্শ করে বায়োডাটার Connection নিতে পারবেন।'],
  footer:'Premium মানে ব্যক্তিগত সহায়তা—জীবনসঙ্গী নিশ্চিত করা বা পরিচয়পত্র যাচাইয়ের বিকল্প নয়।',
  requestLabel:'Premium Service Request',detailsLabel:'Premium এর বিস্তারিত ও শর্ত দেখুন',
  contactPhone:'01748919251',fee:1000,durationDays:90,assistedConnections:3,
  includedConnections:0,serviceCharge:0,extraConnectionFee:0,
  extraConnectionPolicy:'প্যাকেজের Assisted Connection শেষ হলে নতুন Connection কেনা বা টিমের সঙ্গে যোগাযোগ করতে হবে। আলাদা চার্জ থাকলে অর্ডারের আগে জানানো হবে।',
  adHeadline:'Premium সহায়তায় উপযুক্ত জীবনসঙ্গী খোঁজার যাত্রা শুরু করুন',
  adDescription:'একটি Free Biodata, সঙ্গে ঐচ্ছিক Premium Team Assistance। শর্ত ও মূল্য আগে দেখে নিন।',
  benefits:['পছন্দ অনুযায়ী Biodata Shortlist-এ সহায়তা','যোগাযোগ ও Connection-এর ধাপে টিমের সহযোগিতা','পরিষ্কার সার্ভিস স্ট্যাটাস ও মেয়াদ'],
};
export function resolvePremiumSettings(value:unknown):PremiumSettings {
  if(!value||typeof value!=='object'||Array.isArray(value))return defaultPremiumSettings;
  const v=value as Partial<PremiumSettings>;
  return {...defaultPremiumSettings,...v,
    benefits:Array.isArray(v.benefits)?v.benefits:defaultPremiumSettings.benefits};
}
export const premiumTotal=(settings:PremiumSettings)=>settings.fee+settings.serviceCharge;
export const formatPremiumFee=(amount:number)=>'৳'+new Intl.NumberFormat('bn-BD',{maximumFractionDigits:2}).format(amount);
