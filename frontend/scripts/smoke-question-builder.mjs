// npm run build && node scripts/smoke-question-builder.mjs
// Isolated test: fake backend + real production Next.js + real Chrome/Puppeteer.
// Never modifies a real user or production database.
import http from 'node:http';
import net from 'node:net';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const schema=JSON.parse(fs.readFileSync(path.join(root,'lib/profile-question-defaults.json'),'utf8'));
let current={...structuredClone(schema),revision:0}, savedCount=0, gender='female';
let savedAnswers={}, updatedProfileCount=0;
let newId='';
const userId='507f1f77bcf86cd799439011';
const user=()=>({
 _id:userId,userId:'000123',name:'Sample Person',gender,role:'user',age:30,
 isPublished:true,isPublishFromAdmin:true,verificationStatus:'approved',
 address:{district:'Dhaka',upazila:'Dhanmondi'},personalInformation:{height:5.6,skinTone:'ফর্সা'},
 dynamicAnswers:savedAnswers,
});
const publicProfile=()=>{
 const data=structuredClone(user()), viewerGender=data.gender;
 delete data.dynamicAnswers;
 data.publicAnswers={};
 const readPath=key=>key.split('.').reduce((value,part)=>value?.[part],user());
 const kind=type=>type==='checkbox'?'boolean':type==='multi_checkbox'?'array':
  type==='number'?'number':'string';
 for(const q of current.questions){
   const original=schema.questions.find(row=>row.id===q.id);
   const changedType=!!(q.path&&original&&kind(q.type)!==kind(original.type));
   const moved=!!(q.path&&original&&original.section!==q.section);
   const eligible=q.enabled&&q.showPublic&&(q.gender==='both'||q.gender===viewerGender);
   if(eligible&&(!q.path||moved||changedType)){
     const answer=q.path&&!changedType?readPath(q.path):savedAnswers[q.id];
     if(answer!==undefined&&answer!==null&&answer!=='')data.publicAnswers[q.id]=answer;
   }
   if(q.path&&(!eligible||moved||changedType)){
     const parts=q.path.split('.');
     if(parts.length===1)delete data[parts[0]];
     else if(data[parts[0]])delete data[parts[0]][parts[1]];
   }
 }
 data.publicQuestionSchema=current;
 return data;
};
function respond(res,code,data){
 res.writeHead(code,{'Content-Type':'application/json'});
 res.end(JSON.stringify(data));
}
const backend=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/staff-access/me'){
   if(req.headers.access_token==='smoke-admin')return respond(res,200,{role:'admin',isAdmin:true,permissions:['users','faq','guidelines','contact','visual-editor','seo','blog','images','pricing','questions','settings','upgrades']});
   return respond(res,401,{message:'Unauthorized'});
 }
 if(u.pathname==='/profile-questions'&&req.method==='GET')return respond(res,200,current);
 if(u.pathname==='/profile-questions/admin'){
  if(req.headers.access_token!=='smoke-admin')return respond(res,401,{message:'Unauthorized'});
  if(req.method==='GET')return respond(res,200,current);
  if(req.method==='PUT'){
   let raw='';for await(const c of req)raw+=c.toString();
   const incoming=JSON.parse(raw);
   if(incoming.revision!==current.revision)return respond(res,409,{message:'Revision conflict'});
   current={...incoming,revision:current.revision+1};savedCount++;
   newId=current.questions.find(q=>q.id.startsWith('q_'))?.id||'';
   return respond(res,200,current);
  }
 }
 if(u.pathname==='/user/get-my-profile')return respond(res,200,user());
 if(u.pathname==='/user/update-user'&&req.method==='PATCH'){
   let raw='';for await(const chunk of req)raw+=chunk.toString();
   const payload=JSON.parse(raw);
   if(payload.dynamicAnswers){savedAnswers={...savedAnswers,...payload.dynamicAnswers};updatedProfileCount++;}
   return respond(res,200,{message:'Draft saved',data:user()});
 }
 if(u.pathname==='/user/get-one-user')return respond(res,200,publicProfile());
 if(u.pathname==='/public/settings')return respond(res,200,{messengerUrl:'',policies:{}});
 if(u.pathname==='/web-data')return respond(res,200,{home:{},about:{}});
 if(u.pathname.startsWith('/platform/visit/'))return respond(res,200,{ok:true});
 return respond(res,200,{});
});
async function port(){
 const server=net.createServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const n=server.address().port;
 await new Promise(resolve=>server.close(resolve));
 return n;
}
let proc, browser;
try{
 await new Promise(resolve=>backend.listen(0,'127.0.0.1',resolve));
 const back=backend.address().port;
 const nextPort=await port();
 const origin='http://127.0.0.1:'+nextPort;
 proc=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','-p',String(nextPort)],{
  cwd:root,env:{...process.env,BASE_URL:'http://127.0.0.1:'+back},
  stdio:['ignore','pipe','pipe'],windowsHide:true,
 });
 let logs='';
 proc.stdout.on('data',data=>logs+=data.toString());
 proc.stderr.on('data',data=>logs+=data.toString());
 let ready=false;
 for(let i=0;i<70;i++){
  if(proc.exitCode!==null)throw Error(logs);
  try{const r=await fetch(origin+'/api/profile-questions',{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}
  catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 assert.ok(ready,'Next server failed: '+logs);
 const orig=await(await fetch(origin+'/api/profile-questions')).json();
 assert.ok(orig.questions.length>=75);
 console.log('PASS: original male/female questions appear as default registry.');

 const denied=await fetch(origin+'/api/profile-questions?admin=1');
 assert.equal(denied.status,401);
 console.log('PASS: unauthorized question changes blocked.');

 const puppeteer=require(path.resolve(root,'../backend/node_modules/puppeteer'));
 const chromePaths=['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'];
 const chrome=chromePaths.find(fs.existsSync);
 assert.ok(chrome,'Chrome not installed for UI test');
 browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
 const page=await browser.newPage();
 await page.setCookie({
  name:'access_token',value:'smoke-admin',httpOnly:true,url:origin,
 },{name:'user',value:JSON.stringify({_id:userId,name:'Admin',role:'admin'}),httpOnly:true,url:origin});
 await page.goto(origin+'/dashboard/user-question',{waitUntil:'domcontentloaded',timeout:25000});
 await page.waitForFunction(()=>document.body.textContent?.includes('Profile question builder'),{timeout:22000});
 await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent?.includes('Refresh')&&!b.disabled),{timeout:22000});
 await page.evaluate(()=>{
  const button=[...document.querySelectorAll('button')].find(b=>b.textContent?.includes('Add new'));
  if(!button)throw Error('Add new missing');
  button.click();
 });
 await page.waitForFunction(()=>document.querySelector('textarea[rows="3"]')?.value==='নতুন প্রশ্ন',{timeout:7000});
 await page.waitForSelector('textarea[rows="3"]');
 await page.focus('textarea[rows="3"]');
 await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');
 await page.keyboard.type('Which book do you like most?');
 await page.focus('input[placeholder="Example: Age"]');
 await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');
 await page.keyboard.type('Favorite Book');
 const selects=await page.$$('select');
 assert.ok(selects.length>=5,'Expected section/gender/type controls');
 await selects[3].select('female'); // Gender selector inside question settings
 const checkboxes=await page.$$('input[type="checkbox"]');
 assert.ok(checkboxes.length>=3);
 await checkboxes[2].click(); // Display on public page
 await page.evaluate(()=>{
  const button=[...document.querySelectorAll('button')].find(b=>b.textContent?.includes('Save all changes'));
  if(!button)throw Error('Save all missing');
  button.click();
 });
 await page.waitForFunction(()=>document.body.textContent?.includes('All questions saved to the database')||
  document.body.textContent?.includes('Saved in MongoDB'),{timeout:15000});
 assert.equal(savedCount,1);
 assert.ok(newId);
 assert.equal(current.questions.find(q=>q.id===newId)?.question,'Which book do you like most?');
 assert.equal(current.questions.find(q=>q.id===newId)?.publicLabel,'Favorite Book');
 assert.equal(current.questions.find(q=>q.id===newId)?.gender,'female');
 assert.equal(current.questions.find(q=>q.id===newId)?.showPublic,true);
 console.log('PASS: Chrome admin builder creates, configures and saves a question.');

 const refreshed=await(await fetch(origin+'/api/profile-questions')).json();
 assert.ok(refreshed.questions.some(q=>q.id===newId),
  'Admin save must immediately invalidate public schema cache');
 console.log('PASS: question definitions are cached and invalidated on admin save.');

 await page.goto(origin+'/profile/my-profile',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForSelector('[data-profile-question="'+newId+'"]',{timeout:25000});
 await page.evaluate(id=>{
   const input=document.querySelector('[data-profile-question="'+id+'"] input');
   if(!input)throw Error('Answer input not rendered');
   input.focus();
 },newId);
 await page.keyboard.type('Al-Quran');
 for(let attempt=0;attempt<30&&!savedAnswers[newId];attempt++)
   await new Promise(resolve=>setTimeout(resolve,200));
 assert.equal(savedAnswers[newId],'Al-Quran');
 assert.ok(updatedProfileCount>0);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('[data-profile-question="'+newId+'"] input',{timeout:25000});
 await page.waitForFunction(id=>document.querySelector('[data-profile-question="'+id+'"] input')?.value==='Al-Quran',{timeout:12000},newId);
 console.log('PASS: added question appears, saves its answer, and reloads it from the profile.');

 gender='male';
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelectorAll('[data-profile-question]').length>2,{timeout:20000});
 // Data requests may be briefly cached by the browser's React Query state.
 await new Promise(r=>setTimeout(r,900));
 assert.equal(await page.$('[data-profile-question="'+newId+'"]'),null,
  'Female-only question must not appear for male user');
 console.log('PASS: female-only question is absent for male users.');

 gender='female';
 await page.goto(origin+'/biodata/'+userId,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.body.textContent?.includes('Favorite Book'),{timeout:20000});
 assert.ok((await page.evaluate(()=>document.body.textContent)).includes('Al-Quran'));
 console.log('PASS: public biodata uses the admin-defined public label and saved answer.');

 // Old core fields are editable too. Check the actual admin controls, not just a mocked API.
 await page.goto(origin+'/dashboard/user-question',{waitUntil:'domcontentloaded',timeout:25000});
 await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent?.includes('Refresh')&&!b.disabled),{timeout:20000});
 const changedPaths=['age','gender','maritalStatus','personalInformation.height','pledge.youGordianKnowsThis'];
 for(const field of changedPaths){
   const question=current.questions.find(q=>q.path===field);
   assert.ok(question,'Expected built-in question: '+field);
   await page.evaluate(id=>{
     const item=document.querySelector('[data-question-id="'+id+'"]');
     if(!item)throw Error('Question not listed: '+id);
     item.click();
   },question.id);
   await page.waitForFunction(question=>
     document.querySelector('textarea[rows="3"]')?.value===question,{timeout:6000},question.question);
   await page.evaluate(()=>{
     const label=name=>[...document.querySelectorAll('label')]
       .find(el=>el.textContent?.includes(name));
     const enabled=label('Show in form')?.querySelector('input[type="checkbox"]');
     const required=label('Required answer')?.querySelector('input[type="checkbox"]');
     if(!enabled||!required)throw Error('Missing question settings');
     if(required.disabled||enabled.disabled)throw Error('Old mandatory question is still locked');
     if(enabled.checked)enabled.click();
     if(required.checked)required.click();
   });
   if(field==='age'){
     await page.evaluate(()=>{
       const selects=[...document.querySelectorAll('select')];
       const type=selects.find(s=>[...s.options].some(o=>o.value==='multi_checkbox'));
       if(!type)throw Error('Missing input-type selector');
       type.value='textarea';
       type.dispatchEvent(new Event('change',{bubbles:true}));
     });
   }
 }
 await page.evaluate(()=>{
   const save=[...document.querySelectorAll('button')].find(b=>b.textContent?.includes('Save all changes'));
   if(!save)throw Error('Save button missing');
   save.click();
 });
 await page.waitForFunction(()=>document.body.textContent?.includes('Saved in MongoDB'),{timeout:6000})
  .catch(async error=>{
    console.log('DEBUG save state',JSON.stringify({
      savedCount,
      revision:current.revision,
      messages:await page.evaluate(()=>[...document.querySelectorAll('[role="status"]')].map(el=>el.textContent)),
      age:current.questions.find(q=>q.path==='age'),
      controls:await page.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>b.textContent?.includes('Save all')).map(b=>({disabled:b.disabled,text:b.textContent}))),
    }));
    throw error;
  });
 for(const field of changedPaths){
   const q=current.questions.find(item=>item.path===field);
   assert.equal(q.enabled,false,'Old question must be removable: '+field);
   assert.equal(q.required,false,'Old question must be optional: '+field);
 }
 assert.equal(current.questions.find(q=>q.path==='age').type,'textarea');
 console.log('PASS: Chrome changes default age, gender, marital status, height, and pledge requirements.');

 const ageQuestion=current.questions.find(q=>q.path==='age');
 await page.goto(origin+'/profile/my-profile',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.querySelectorAll('[data-profile-question]').length>3,{timeout:20000});
 assert.equal(await page.$('[data-profile-question="'+ageQuestion.id+'"]'),null);
 console.log('PASS: removed required age field is absent from the real member form.');

 // The public page must follow a fresh admin revision, not an old 20-minute
 // cached schema. Old answers must stay in the (fake) member database.
 const publishSchema=async mutate=>{
   const payload={...current,questions:current.questions.map(q=>mutate(q))};
   const response=await page.evaluate(async data=>{
     const r=await fetch('/api/profile-questions',{method:'PUT',credentials:'same-origin',
       headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
     return {status:r.status,body:await r.text()};
   },payload);
   assert.equal(response.status,200,response.body);
 };
 await publishSchema(q=>q.id===newId?{...q,showPublic:false}:q);
 assert.equal(savedAnswers[newId],'Al-Quran');
 await page.goto(origin+'/biodata/'+userId,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.body.textContent?.includes('বায়োডাটা নং'),{timeout:18000});
 assert.equal(await page.$('[data-public-question="'+newId+'"]'),null);
 assert.equal(await page.evaluate(()=>document.body.textContent?.includes('জন্মসন')),false,
   'An archived age question must not leak through the sidebar summary');
 console.log('PASS: private new answer and archived old age are hidden from public biodata.');

 await publishSchema(q=>q.id===newId?{...q,showPublic:true,enabled:false}:q);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.body.textContent?.includes('বায়োডাটা নং'),{timeout:18000});
 assert.equal(await page.$('[data-public-question="'+newId+'"]'),null);
 assert.equal(savedAnswers[newId],'Al-Quran');
 console.log('PASS: removed question disappears publicly but its existing answer survives.');

 await publishSchema(q=>q.id===newId?{...q,enabled:true,showPublic:true,
   publicLabel:'Book read'}:q);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('[data-public-question="'+newId+'"]',{timeout:18000});
 const row=await page.$eval('[data-public-question="'+newId+'"]',element=>element.textContent);
 assert.match(row,/Book read/);
 assert.match(row,/Al-Quran/);
 assert.equal(savedAnswers[newId],'Al-Quran');
 console.log('PASS: restoring an edited question shows the original saved answer with its new public label.');

}finally{
 if(browser)await browser.close().catch(()=>{});
 if(proc)proc.kill();
 await new Promise(resolve=>backend.close(resolve));
}
