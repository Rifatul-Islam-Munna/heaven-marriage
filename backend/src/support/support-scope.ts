import {normalizeSupportText,supportTokens,type SupportDocument} from './support-retrieval';

/**
 * Fail-closed, deterministic gate. A mention of "Niqaha" or "premium" does
 * not grant permission for a different request (poems, coding, news, etc.).
 */
const manipulation=[
 /ignore\s+(?:all\s+)?(?:previous|above|your|system)\s+(?:instructions|rules|prompt)/iu,
 /(?:system|developer|assistant)\s*(?:prompt|message|instruction|role)/iu,
 /(?:jailbreak|role\s*play|roleplay|pretend\s+to\s+be|act\s+as\s+(?:a|an)|override\s+(?:rules|policy))/iu,
 /(?:নির্দেশনা\s*(?:ভুলে\s*যাও|উপেক্ষা\s*কর)|নিয়ম\s*ভাঙ|নিয়ম\s*ভাঙ)/u,
 /(?:decode|encode)\s*(?:base64|rot13|hex)/iu,
];
const otherServices=[
 /\b(?:write|generate|create|make|compose|draft|translate|summarize|solve|calculate|compute)\b.{0,75}\b(?:code|script|program|essay|story|poem|song|lyrics|resume|cv|recipe|homework|exam|assignment|novel|image|video|email|blog)\b/iu,
 /\b(?:python|javascript|typescript|sql|node\.js|next\.js|react|api\s+key|hacking|exploit|malware|crack|ddos)\b/iu,
 /\b(?:football|cricket|nba|stock\s+market|bitcoin|crypto\s+price|weather|election|politics|president|latest\s+news|movie|celebrity|cooking|biryani)\b/iu,
 /\b(?:medical\s+advice|diagnose|medicine|treatment|legal\s+advice|investment\s+advice|mental\s+health\s+advice)\b/iu,
 /(?:কোড\s*(?:লিখ|দাও)|গল্প\s*(?:লিখ|বল)|কবিতা\s*(?:লিখ|বল)|রেসিপি|রান্না|অনুবাদ\s*কর|ফুটবল|ক্রিকেট|খেলা\s*সংবাদ|নির্বাচন|রাজনীতি|শেয়ার\s*বাজার|শেয়ার\s*বাজার|ভবিষ্যদ্বাণী)/u,
];
const topicMarkers=[
 'niqaha','নিকাহা','niqahabd','biodata','bio data','বায়োডাটা','বায়োডাটা',
 'signup','sign up','register','registration','নিবন্ধন','রেজিস্ট্রেশন','লগইন','login',
 'premium','প্রিমিয়াম','প্রিমিয়াম','matchmaking','matching','ম্যাচিং',
 'connection','কানেকশন','shortlist','শর্টলিস্ট',
 'published','publish','পাবলিশ','প্রকাশ','প্রোফাইল','profile','verified','badge',
 'payment','পেমেন্ট','bkash','বিকাশ','refund','রিফান্ড','pricing','price','দাম','মূল্য','প্যাকেজ',
 'faq','guideline','গাইডলাইন','নীতিমালা','নির্দেশিকা','privacy','গোপনীয়তা',
 'contact','যোগাযোগ','office','অফিস','ফোন','নাম্বার','কল','whatsapp','হোয়াটসঅ্যাপ','হোয়াটসঅ্যাপ',
 'otp','পাসওয়ার্ড','password','service','সার্ভিস','সেবা','member','সদস্য','বিবাহ','বিয়ে','বিয়ে','halal','হালাল',
];
export function isPlatformSupportQuestion(question:string):boolean{
 if(typeof question!=='string'||question.length>600)return false;
 const normalized=normalizeSupportText(question);
 if(normalized.length<3||manipulation.some(re=>re.test(normalized))||
    otherServices.some(re=>re.test(normalized)))return false;
 // Look for a platform term rather than accepting any prompt that matches one
 // word in a dynamically supplied admin article.
 return topicMarkers.some(marker=>{
   const m=normalizeSupportText(marker);
   if(/[a-z0-9]/i.test(m))return new RegExp('(^|[^a-z0-9])'+
     m.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^a-z0-9])','i').test(normalized);
   return normalized.includes(m);
 });
}
/** Reject generated answers that bring in unsupported URLs, facts, prices or unrelated tasks. */
export function generatedSupportAnswerIsGrounded(answer:string,evidence:readonly SupportDocument[]):boolean{
 if(typeof answer!=='string'||answer.trim().length<10||answer.length>900)return false;
 const normalized=normalizeSupportText(answer);
 if(manipulation.some(re=>re.test(normalized))||otherServices.some(re=>re.test(normalized)))return false;
 const facts=evidence.map(d=>d.answer).join(' ');
 const urls=answer.match(/(?:https?:\/\/|www\.)[^\s)]+/giu)||[];
 if(urls.some(url=>!/^https?:\/\/(?:www\.)?niqaha\.com\b/i.test(url)))return false;
 // Numbers in generated output must actually occur in the approved evidence.
 const reported=answer.match(/[0-9\u09e6-\u09ef]+(?:\.[0-9\u09e6-\u09ef]+)?/gu)||[];
 const sourceNumbers=new Set(facts.match(/[0-9\u09e6-\u09ef]+(?:\.[0-9\u09e6-\u09ef]+)?/gu)||[]);
 if(reported.some(number=>!sourceNumbers.has(number)))return false;
 const reference=new Set(supportTokens(facts));
 const content=supportTokens(answer).filter(token=>token.length>=4);
 if(!content.length)return false;
 const overlap=content.filter(token=>reference.has(token)).length/content.length;
 // Be conservative: when in doubt, use the pre-approved answer verbatim.
 return overlap>=0.78;
}
