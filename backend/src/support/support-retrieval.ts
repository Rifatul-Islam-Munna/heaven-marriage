export type SupportDocument={id:string;question:string;answer:string;keywords:string[];
  category:string;url:string;title?:string};
export type SupportResult={documents:SupportDocument[];relevant:boolean};
export function normalizeSupportText(value:string){
 return value.normalize('NFKC').toLocaleLowerCase('en').replace(/[\u200b-\u200f]/gu,'').trim();
}
const stop=new Set(['the','and','or','how','what','where','can','are','do','does','it','is','please',
 'আমি','আমার','আপনি','আপনার','আমাদের','এখানে','কি','কী','কেন','কিভাবে','করবো','করতে','হবে',
 'হয়','যদি','আর','একটু','জন্য','এর','এই','আমাকে','বলবেন','হয়েছে','দিতে','চাই']);
export function supportTokens(text:string):string[]{
 return (normalizeSupportText(text).match(/[\p{L}\p{N}]+/gu)||[])
   .filter(x=>x.length>=2&&!stop.has(x));
}
export const supportSiteFacts:SupportDocument[]=[
 {id:'contact',category:'contact',title:'Contact and office times',url:'/contact',
 question:'কখন কীভাবে কল করব যোগাযোগ নম্বর অফিস টাইম শুক্রবার support phone whatsapp office hours',
 answer:'Niqaha.com অফিস শনিবার–বৃহস্পতিবার সকাল ৯টা থেকে রাত ৯টা (বাংলাদেশ সময়)। শুক্রবার অফিস বন্ধ; জরুরি প্রয়োজনে ফোনে যোগাযোগ করতে পারেন। সাধারণ প্রশ্ন ও পেমেন্ট: 01748919251 (+8801748919251)। পাত্রদের জন্য 01927877581; পাত্রীদের জন্য 01610371038 (ফোন বা WhatsApp)। Email: niqahabd@gmail.com। অফিস: Sylhet, Bishwanath, Dashghar।',
 keywords:['contact','call','phone','office','hours','number','whatsapp','সময়','টাইম','অফিস','যোগাযোগ','কল','ফোন','নাম্বার','শুক্রবার','হটলাইন','support']},
 {id:'signup',category:'signup',title:'Free registration',url:'/signup',
 question:'signup registration how to register account OTP google sign in free',
 answer:'Niqaha-তে Signup করতে নাম, ফোন অথবা email, gender এবং একটি password দিয়ে account তৈরি করুন। OTP verify করুন; Google Sign-in-এর অপশনও আছে। Signup ও সাধারণ বায়োডাটা তৈরির জন্য Premium নেওয়া বাধ্যতামূলক নয়। পাসওয়ার্ড বা OTP কাউকে শেয়ার করবেন না।',
 keywords:['signup','register','registration','otp','google','sign','account','সাইন','রেজিস্ট্রেশন','অ্যাকাউন্ট','পাসওয়ার্ড','পাসওয়ার্ড','লগইন','নিবন্ধন']},
 {id:'biodata',category:'biodata',title:'Biodata preparation and review',url:'/biodata',
 question:'biodata submit edit publish verify approval free profile verification',
 answer:'Signup-এর পরে নিজের Biodata ধাপে ধাপে পূরণ ও Submit করতে পারবেন। Admin টিম রিভিউ করে Publish করলে সাধারণ বায়োডাটায় Pink Reviewed/Verified badge দেখা যায়। বায়োডাটা Public হওয়া এবং Premium subscription সম্পূর্ণ আলাদা। ব্যক্তিগত তথ্যের নিয়ন্ত্রণ ও যোগাযোগ আনলক করার নিয়ম প্রযোজ্য।',
 keywords:['biodata','bio','submit','publish','profile','verified','ভেরিফাই','বায়োডাটা','বায়োডাটা','জমা','প্রকাশ','প্রোফাইল','পাবলিশ','ব্যাক্তিগত']},
 {id:'connections',category:'connection',title:'Connections and pricing',url:'/pricing',
 question:'connection balance package payment price unlock match shortlist contact number',
 answer:'বায়োডাটা দেখা, Shortlist করা এবং যোগাযোগের তথ্য আনলক করা এক জিনিস নয়। যোগাযোগের তথ্য আনলক করতে সাধারণ Connection credit লাগতে পারে; Connection package-এর বর্তমান মূল্য এবং পরিমাণ /pricing পেজে রয়েছে। অবশিষ্ট Connection ও ব্যবহার হিসাব Member Dashboard-এ দেখতে পারবেন। Premium-এর included connection থাকলে সেগুলো বর্ণিত শর্ত অনুযায়ী দেওয়া হয়।',
 keywords:['connection','connect','shortlist','unlock','pricing','payment','package','price','credit','wallet','পেমেন্ট','কানেকশন','যোগাযোগ','আনলক','প্যাকেজ','মূল্য','দাম','শর্টলিস্ট','ব্যালেন্স','ম্যাচিং']},
 {id:'premium',category:'premium',title:'Premium assisted service',url:'/premium',
 question:'premium premium membership premium blue verified assistance matching team service',
 answer:'Premium হলো ঐচ্ছিক টিম-সহায়তাপ্রাপ্ত Matrimony Service। টিম সদস্যের পছন্দ অনুযায়ী Biodata Shortlist ও Connection-এ সহায়তা করে। Active Premium-এ Blue Premium badge দেখা যায়; প্রকাশিত সাধারণ Biodata-তে Pink Reviewed badge। Premium Price, Duration, Assisted Connections, Included Wallet Connections এবং Extra Charge Admin-controlled এবং /premium পেজে দেখতে পাবেন। Premium নেওয়া বা টাকা দেওয়া মানে জীবনসঙ্গী নিশ্চিত নয়।',
 keywords:['premium','assisted','service','membership','blue','badge','প্রিমিয়াম','প্রিমিয়াম','টিম','সার্ভিস','ব্লু','ব্যাজ','ফি','সেবা','সাবস্ক্রাইবার']},
 {id:'about',category:'about',title:'About Niqaha',url:'/about',
 question:'about niqaha service islamic matchmaking marriage site how does it work',
 answer:'Niqaha একটি ইসলামিক ম্যাট্রিমনি প্ল্যাটফর্ম। সদস্যরা নিজের বায়োডাটা তৈরি করেন, সম্ভাব্য জীবনসঙ্গীর বায়োডাটা খুঁজেন ও পছন্দের তালিকায় রাখেন। নিরাপদ যোগাযোগে সাহায্য করতে Connection System আছে। Optional Premium Service নিলে টিম shortlist ও যোগাযোগের ধাপে ব্যক্তিগত সহায়তা দেয়।',
 keywords:['about','niqaha','marriage','marry','halal','matching','বিয়ে','বিয়ে','বিবাহ','নিকাহ','দাম্পত্য','হালাল','নিখুঁত']},
 {id:'guidelines',category:'guidelines',title:'Guidelines and safety',url:'/guidelines',
 question:'guidelines safety privacy terms policy rules profile how safe',
 answer:'সাইট ব্যবহারের নীতি, বায়োডাটা পূরণের নির্দেশনা, গোপনীয়তা ও যোগাযোগের নিয়ম /guidelines এবং /policies পেজে দেখুন। কারও password, OTP বা সংবেদনশীল ব্যক্তিগত তথ্য Chatbot-এ দেবেন না। সন্দেহজনক প্রোফাইল রিপোর্ট করুন এবং টাকা দেওয়ার আগে প্রকাশিত মূল্য ও refund policy দেখুন।',
 keywords:['guide','guidelines','rules','policy','refund','privacy','safe','নির্দেশনা','নিয়ম','নিয়ম','নীতিমালা','সুরক্ষা','নিরাপত্তা','গোপনীয়তা','ফেরত','রিফান্ড']},
];
const topicWords=new Set(supportSiteFacts.flatMap(doc=>doc.keywords.map(normalizeSupportText)));
export function findSupportDocuments(question:string,extra:SupportDocument[],max=5):SupportResult {
 const normalized=normalizeSupportText(question);
 const tokens=supportTokens(question);
 if(!tokens.length)return {documents:[],relevant:false};
 const records=[...extra,...supportSiteFacts];
 const scores=records.map(doc=>{
   const qs=normalizeSupportText(doc.question);
   const aliases=doc.keywords.map(normalizeSupportText);
   const docTokens=new Set(supportTokens(doc.question+' '+doc.title+' '+aliases.join(' ')));
   let score=0;
   for(const alias of aliases)if(alias.length>=3&&normalized.includes(alias))score+=6;
   for(const token of tokens)if(docTokens.has(token))score+=2;
   if(qs.includes(normalized)&&normalized.length>6)score+=12;
   return {doc,score};
 }).sort((a,b)=>b.score-a.score);
 const relevant=tokens.some(t=>topicWords.has(t)||[...topicWords].some(k=>k.length>=4&&t.includes(k))) ||
   scores.some(x=>x.score>=6 && !supportSiteFacts.includes(x.doc));
 const documents=scores.filter(x=>x.score>0).slice(0,max).map(x=>x.doc);
 return {documents:relevant?documents:[],relevant};
}
