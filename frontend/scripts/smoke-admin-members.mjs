import http from 'node:http';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const chrome=['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find(fs.existsSync);
if(!chrome)throw Error('Chrome is required for admin table browser smoke test');
const puppeteer=require(path.resolve(root,'../backend/node_modules/puppeteer'));
const member={
 _id:'507f1f77bcf86cd799439011',name:'Fatima Example',
 userId:'000995',email:'fatima@example.com',phoneNumber:'01711111111',
 maritalStatus:'single',numberOfConnections:2,completionPercentage:60,
 completionRequiredCount:10,completionAnsweredCount:6,completionSchemaRevision:16,
 memberJourney:'in_progress',biodataStage:'draft',isSubscriber:false,
 isOtpVerified:true,isPublishFromAdmin:false,verificationStatus:'pending',
};
const maritalField='builtin_1111111111111111';
const workField='q_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
let selectedLayout=[{id:'profile-'+ 'f'.repeat(32),label:'ব্যক্তিগত তথ্য',questionIds:[maritalField]}];
const allProfileFields=[
 {id:maritalField,label:'বৈবাহিক অবস্থা',section:'ব্যক্তিগত তথ্য',type:'select'},
 {id:workField,label:'পেশা',section:'কর্মজীবন',type:'text'},
];
const permissions=['users','faq','ai-training','guidelines','contact','visual-editor',
 'seo','blog','images','pricing','questions','settings','upgrades'];
function reply(res,status,data){
 res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
 res.end(JSON.stringify(data));
}
const backend=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const route=url.pathname;
 if(route==='/staff-access/me')return reply(res,200,{role:'admin',isAdmin:true,permissions});
 if(route==='/user/get-all-user-for-admin'){
   const one=[member];const limit=Number(url.searchParams.get('limit')||10);
   return reply(res,200,{data:one,totalItems:1,page:1,limit,totalPages:1,
     hasNextPage:false,hasPreviousPage:false});
 }
 if(route==='/admin/member-columns/profile-layout'&&req.method==='PATCH'){
   let body='';for await(const chunk of req)body+=chunk.toString();
   selectedLayout=JSON.parse(body).columns||[];
   return reply(res,200,{message:'Profile table layout updated',profileColumns:selectedLayout});
 }
 if(route==='/admin/member-columns')return reply(res,200,{
   columns:[{id:'hot-data',label:'Hot Data',type:'choice',options:['Hot','Follow-up','Normal'],
     enabled:true,builtIn:true}],
   values:{[member._id]:{'hot-data':'Hot'}},
   profileColumns:selectedLayout,
   profileValues:{[member._id]:{[maritalField]:'অবিবাহিত',[workField]:'Teacher'}},
   availableFields:allProfileFields,
 });
 if(route==='/public/settings')return reply(res,200,{policies:{},premium:{}});
 if(route==='/seo-settings')return reply(res,200,{settings:{},site:{}});
 if(route==='/seo-settings/sitemap')return reply(res,200,[]);
 if(route==='/web-data')return reply(res,200,{home:{},about:{}});
 if(route==='/visual-content')return reply(res,200,{path:url.searchParams.get('path'),page:{},global:{}});
 return reply(res,200,{});
});
async function availablePort(){
 const server=net.createServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;await new Promise(resolve=>server.close(resolve));
 return port;
}
let next,browser;
try{
 await new Promise(resolve=>backend.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+backend.address().port;
 const site='http://127.0.0.1:'+(await availablePort());
 next=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),
   'start','-p',new URL(site).port],{cwd:root,windowsHide:true,
   env:{...process.env,BASE_URL:base},stdio:['ignore','pipe','pipe']});
 let logs='';
 next.stdout.on('data',x=>logs+=x.toString());
 next.stderr.on('data',x=>logs+=x.toString());
 let ready=false;
 for(let i=0;i<90;i++){
   if(next.exitCode!==null)throw Error('Next failed: '+logs);
   try{const r=await fetch(site+'/login',{signal:AbortSignal.timeout(1000)});
     if(r.ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,250));
 }
 assert.ok(ready,logs);
 browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
 const tab=await browser.newPage();
 await tab.setViewport({width:1440,height:900});
 await tab.setCookie({name:'access_token',value:'smoke-admin',url:site,httpOnly:true});
 await tab.goto(site+'/dashboard',{waitUntil:'domcontentloaded',timeout:30000});
 await tab.waitForFunction(()=>document.body.textContent?.includes('Fatima Example'),
   {timeout:30000});
 await tab.waitForFunction(()=>document.querySelector('tbody')?.textContent?.includes('অবিবাহিত'),
   {timeout:20000});
 const result=await tab.evaluate(()=>{
   const head=[...document.querySelectorAll('table thead th')].map(th=>th.textContent?.trim());
   const row=[...document.querySelectorAll('tbody tr')].find(tr=>tr.textContent?.includes('Fatima Example'));
   return {head,firstCell:row?.querySelector('td')?.textContent,progress:row?.textContent,
     quick:[...document.querySelectorAll('select[aria-label]')].map(x=>x.getAttribute('aria-label'))};
 });
 assert.ok(result.head.some(s=>s?.includes('সদস্যের তথ্য')));
 assert.ok(result.head.some(s=>s?.includes('অগ্রগতি · কানেকশন · সাবস্ক্রাইবার')));
 assert.ok(result.head.some(s=>s?.includes('ব্যক্তিগত তথ্য')));
 assert.ok(!result.head.includes('Hot Data'));
 assert.ok(!result.head.includes('কানেকশন'));
 assert.ok(!result.head.includes('সাবস্ক্রাইবার'));
 assert.ok(!result.head.includes('যোগাযোগ'));
 assert.match(result.firstCell||'',/Fatima Example/);
 assert.match(result.firstCell||'',/fatima@example.com/);
 assert.match(result.firstCell||'',/01711111111/);
 assert.doesNotMatch(result.firstCell||'',/60%/);
 assert.match(result.progress||'',/60%/);
 assert.match(result.progress||'',/6 \/ 10/);
 assert.match(result.progress||'',/অবিবাহিত/);
 assert.doesNotMatch(result.progress||'',/Follow-up/);
 assert.ok(await tab.$('button[aria-label*="প্রোফাইল এডিট করুন"]'));
 assert.ok(await tab.$('button[aria-label*="বায়োডাটা প্রকাশ করুন"]'));
 assert.equal(result.quick.includes('মেম্বারশিপ'),false,'Advanced filters must start collapsed');
 await tab.click('button[aria-label*="অন্যান্য অ্যাকশন"]');
 await tab.waitForSelector('[data-slot="dropdown-menu-content"]',{timeout:7000});
 const menu=await tab.$eval('[data-slot="dropdown-menu-content"]',el=>el.textContent||'');
 assert.doesNotMatch(menu,/স্মার্ট ম্যাচিং/);
 assert.ok(await tab.$('button[aria-label*="স্মার্ট ম্যাচিং খুলুন"]'),
   'Smart matching must be visible outside three-dot menu');
 assert.match(menu,/সদস্য মুছুন/);
 await tab.keyboard.press('Escape');
 const categories=await tab.evaluate(()=>[...document.querySelectorAll('button[aria-label$=" নেভিগেশন"]')]
   .map(el=>el.getAttribute('aria-label')));
 assert.ok(categories.length>=5,'Expected grouped admin sidebar navigation');
 console.log('PASS: Edit, Publish and Smart Matching are visible; less-common actions are in the three-dot menu.');
 console.log('PASS: Real biodata field shown, hidden Hot Data, merged progress/connection/subscriber and grouped sidebar.');
 await tab.click('button[aria-controls="member-quick-filters"]');
 for(const quick of ['মেম্বারশিপ','যাচাই অবস্থা','বৈবাহিক অবস্থা','জেলা','সাজানোর ক্রম'])
   assert.ok(await tab.$('select[aria-label="'+quick+'"]'),'Missing advanced filter '+quick);
 console.log('PASS: Five quick filters remain available on demand.');
 await tab.evaluate(()=>{
   const button=[...document.querySelectorAll('button')].find(el=>el.textContent?.includes('টেবিলের কলাম সাজান'));
   if(!button)throw Error('Biodata column manager missing');button.click();
 });
 await tab.waitForSelector('[role="dialog"]',{timeout:8000});
 await tab.click('button[aria-label="ব্যক্তিগত তথ্য এডিট"]');
 await tab.waitForSelector('section[aria-label="কলাম এডিট"]',{timeout:7000});
 await tab.$eval('section[aria-label="কলাম এডিট"] input[maxlength="55"]',el=>{
   const native=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
   native.call(el,'বায়োডাটা সারাংশ');el.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await tab.evaluate(()=>{
   const item=[...document.querySelectorAll('section[aria-label="কলাম এডিট"] label')]
     .find(el=>el.textContent?.includes('পেশা'));
   if(!item)throw Error('Profession field missing');item.querySelector('input[type="checkbox"]')?.click();
 });
 await tab.waitForFunction(()=>[...document.querySelectorAll('section[aria-label="কলাম এডিট"] label')]
   .some(el=>el.textContent?.includes('পেশা')&&el.querySelector('input[type="checkbox"]')?.checked),
   {timeout:6000});
 await tab.evaluate(()=>{
   const btn=[...document.querySelectorAll('section[aria-label="কলাম এডিট"] button')]
     .find(el=>el.textContent?.includes('কলাম আপডেট'));
   if(!btn)throw Error('Column update missing');btn.click();
 });
 await tab.waitForFunction(()=>[...document.querySelectorAll('[role="dialog"] p')]
   .some(el=>el.textContent==='বায়োডাটা সারাংশ'),{timeout:5000});
 await tab.evaluate(()=>{
   const btn=[...document.querySelectorAll('[role="dialog"] button')]
     .find(el=>el.textContent?.includes('সব কলাম Save করুন'));
   if(!btn)throw Error('Column save missing');btn.click();
 });
 await tab.waitForFunction(()=>[...document.querySelectorAll('table thead th')]
   .some(el=>el.textContent?.trim()==='বায়োডাটা সারাংশ'),{timeout:15000});
 assert.deepEqual(selectedLayout[0].questionIds,[maritalField,workField]);
 assert.equal(selectedLayout[0].label,'বায়োডাটা সারাংশ');
 assert.match(await tab.$eval('tbody',el=>el.textContent||''),/Teacher/);
 assert.match(await tab.$eval('tbody',el=>el.textContent||''),/অবিবাহিত/);
 console.log('PASS: Custom heading and two actual server biodata answers render as badges within a single column.');
 await tab.evaluate(()=>{
   const btn=[...document.querySelectorAll('button')].find(el=>el.textContent?.includes('টেবিলের কলাম সাজান'));
   if(!btn)throw Error('Column manager missing');btn.click();
 });
 await tab.waitForSelector('[role="dialog"]');
 await tab.evaluate(()=>{
   const btn=[...document.querySelectorAll('[role="dialog"] button')].find(el=>el.textContent?.includes('নতুন কলাম'));
   if(!btn)throw Error('Add column missing');btn.click();
 });
 await tab.waitForSelector('section[aria-label="কলাম এডিট"]');
 await tab.$eval('section[aria-label="কলাম এডিট"] input[maxlength="55"]',el=>{
   const native=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
   native.call(el,'অতিরিক্ত তথ্য');el.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await tab.evaluate(()=>{
   const item=[...document.querySelectorAll('section[aria-label="কলাম এডিট"] label')]
     .find(el=>el.textContent?.includes('পেশা'));
   if(!item)throw Error('Field missing');item.querySelector('input[type="checkbox"]')?.click();
 });
 await tab.evaluate(()=>{
   const btn=[...document.querySelectorAll('section[aria-label="কলাম এডিট"] button')]
     .find(el=>el.textContent?.includes('তালিকায় যোগ করুন'));
   if(!btn)throw Error('Add to layout missing');btn.click();
 });
 await tab.waitForSelector('button[aria-label="অতিরিক্ত তথ্য আগে আনুন"]',{timeout:6000});
 await tab.click('button[aria-label="অতিরিক্ত তথ্য আগে আনুন"]');
 await tab.waitForFunction(()=>[...document.querySelectorAll('[role="dialog"] div p')]
   .filter(el=>el.textContent==='অতিরিক্ত তথ্য'||el.textContent==='বায়োডাটা সারাংশ')[0]?.textContent==='অতিরিক্ত তথ্য',
   {timeout:4500});
 await tab.evaluate(()=>{
   const btn=[...document.querySelectorAll('[role="dialog"] button')]
     .find(el=>el.textContent?.includes('সব কলাম Save করুন'));
   if(!btn||btn.disabled)throw Error('Save reordered layout unavailable');btn.click();
 });
 await tab.waitForFunction(()=>!document.querySelector('[role="dialog"]'),{timeout:12000});
 assert.equal(selectedLayout.length,2);
 assert.equal(selectedLayout[0].label,'অতিরিক্ত তথ্য');
 await tab.evaluate(()=>{
   const btn=[...document.querySelectorAll('button')].find(el=>el.textContent?.includes('টেবিলের কলাম সাজান'));
   if(!btn)throw Error('Column manager missing');btn.click();
 });
 await tab.waitForSelector('button[aria-label="অতিরিক্ত তথ্য কলাম সরান"]');
 await tab.click('button[aria-label="অতিরিক্ত তথ্য কলাম সরান"]');
 await tab.waitForFunction(()=>[...document.querySelectorAll('[role="dialog"] p')]
   .filter(el=>el.textContent==='বায়োডাটা সারাংশ'||el.textContent==='অতিরিক্ত তথ্য').length===1,
   {timeout:5000});
 await tab.evaluate(()=>{
   const btn=[...document.querySelectorAll('[role="dialog"] button')]
     .find(el=>el.textContent?.includes('সব কলাম Save করুন'));
   if(!btn||btn.disabled)throw Error('Save removal missing');btn.click();
 });
 await tab.waitForFunction(()=>!document.querySelector('[role="dialog"]'),{timeout:12000});
 assert.equal(selectedLayout.length,1,'Removed column must not persist');
 console.log('PASS: Column add, reorder and removal saved without changing member biodata.');
 await tab.select('select[aria-label="মেম্বারশিপ"]','premium');
 await tab.waitForFunction(()=>new URL(location.href).searchParams.get('accountType')==='premium',{timeout:10000});
 assert.equal(new URL(tab.url()).searchParams.get('accountType'),'premium');
 console.log('PASS: Quick filter updates the member list URL.');
 await tab.setViewport({width:390,height:844,isMobile:true});
 await tab.reload({waitUntil:'domcontentloaded',timeout:30000});
 await tab.waitForFunction(()=>document.body.textContent?.includes('Fatima Example'),{timeout:20000});
 const mobile=await tab.evaluate(()=>({
   text:document.querySelector('ul.md\\:hidden')?.textContent||'',
   filterButton:!!document.querySelector('button[aria-controls="member-quick-filters"]'),
 }));
 assert.match(mobile.text,/fatima@example.com/);
 assert.match(mobile.text,/6 \/ 10/);
 assert.ok(mobile.filterButton);
 console.log('PASS: Mobile member card retains combined contact, progress, service controls, and collapsible filters.');
}finally{
 if(browser)await browser.close().catch(()=>{});
 if(next)next.kill();
 await new Promise(resolve=>backend.close(resolve));
}
