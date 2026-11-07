// Isolated browser test: the member sees the same required answer count as admin.
// Uses mock member data; does not touch production or a real user account.
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const chrome=[
 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].find(fs.existsSync);
if(!chrome)throw Error('Chrome unavailable');
const puppeteer=require(path.resolve(root,'../backend/node_modules/puppeteer'));
const q1='q_'+'a'.repeat(32),q2='q_'+'b'.repeat(32);
const schema={
 revision:51,sections:[{id:2,title:'Personal details'}],
 questions:[q1,q2].map((id,i)=>({
  id,question:i===0?'First required question':'Second required question',
  publicLabel:i===0?'First required question':'Second required question',
  section:2,gender:'both',type:'text',options:[],optionSource:'',
  required:true,enabled:true,locked:false,order:i+1,showPublic:false,
 })),
};
const answers={[q1]:'Already answered'};
const requiredProgress=()=>{
 const answeredCount=[q1,q2].filter(id=>!!answers[id]).length;
 return {percentage:answeredCount*50,requiredCount:2,answeredCount,
   schemaRevision:51,remaining:answeredCount===2?[]:[q2],nextStep:answeredCount===2?-1:2};
};
const user=()=>({
 _id:'507f1f77bcf86cd799439011',name:'Sample Member',role:'user',
 userId:'000995',gender:'female',biodataStatus:'draft',
 isPublished:false,isPublishFromAdmin:false,verificationStatus:'pending',
 numberOfConnections:2,isOtpVerified:true,
 dynamicAnswers:{...answers},
 completion:requiredProgress(),
 completionPercentage:requiredProgress().percentage,
 completionRequiredCount:2,
 completionAnsweredCount:requiredProgress().answeredCount,
 completionSchemaRevision:51,biodataStage:requiredProgress().percentage===100?'ready':'draft',
});
function respond(res,status,data){
 res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
 res.end(JSON.stringify(data));
}
const backend=http.createServer(async(req,res)=>{
 const route=new URL(req.url,'http://localhost').pathname;
 if(route==='/profile-questions')return respond(res,200,schema);
 if(route==='/user/get-my-profile')return respond(res,200,user());
 if(route==='/user/update-user'&&req.method==='PATCH'){
  let body='';for await(const chunk of req)body+=chunk.toString();
  const data=JSON.parse(body);
  if(data.dynamicAnswers)Object.assign(answers,data.dynamicAnswers);
  return respond(res,200,{message:'Saved',data:user(),
   completion:requiredProgress(),biodataStage:user().biodataStage});
 }
 if(route==='/platform/summary')return respond(res,200,null);
 if(route==='/platform/requests'||route==='/platform/deletion-request')return respond(res,200,[]);
 if(route==='/public/settings')return respond(res,200,{premium:{visible:false},messengerUrl:''});
 if(route==='/seo-settings')return respond(res,200,{settings:{}});
 if(route==='/web-data')return respond(res,200,{});
 return respond(res,200,null);
});
async function port(){
 const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));
 const id=s.address().port;await new Promise(r=>s.close(r));return id;
}
let next,browser;
try{
 await new Promise(r=>backend.listen(0,'127.0.0.1',r));
 const site='http://127.0.0.1:'+(await port());
 next=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start',
   '-p',new URL(site).port],{cwd:root,windowsHide:true,
   env:{...process.env,BASE_URL:'http://127.0.0.1:'+backend.address().port},
   stdio:['ignore','pipe','pipe']});
 let logs='';
 next.stdout.on('data',d=>logs+=d.toString());
 next.stderr.on('data',d=>logs+=d.toString());
 let ready=false;
 for(let n=0;n<75;n++){
  if(next.exitCode!==null)throw Error(logs);
  try{if((await fetch(site+'/login',{signal:AbortSignal.timeout(1000)})).ok){
    ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 assert.ok(ready,logs);
 browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
 const page=await browser.newPage();
 await page.setViewport({width:390,height:844,isMobile:true});
 await page.setCookie({name:'access_token',value:'smoke-member',httpOnly:true,url:site},
   {name:'user',value:JSON.stringify({_id:user()._id,role:'user',name:'Sample Member'}),httpOnly:true,url:site});
 await page.goto(site+'/profile',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.body.textContent?.includes('আবশ্যিক উত্তর: 1 / 2'),{timeout:30000});
 const first=await page.evaluate(()=>document.body.textContent||'');
 assert.match(first,/50%/);
 assert.match(first,/আবশ্যিক উত্তর: 1 \/ 2/);
 console.log('PASS: User dashboard and sidebar show backend 50% and 1/2 required answers.');
 await page.goto(site+'/profile/my-profile',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.body.textContent?.includes('আবশ্যিক প্রশ্নের উত্তর:'),{timeout:30000});
 const form=await page.evaluate(()=>document.body.textContent||'');
 assert.match(form,/আবশ্যিক প্রশ্নের উত্তর: ১ \/ ২/);
 console.log('PASS: User biodata editor shows the same 1/2 required-answer progress.');
 await page.evaluate(()=>{
  const start=[...document.querySelectorAll('button')].find(b=>b.textContent?.includes('যেখানে থেমেছিলেন'));
  if(!start)throw Error('Continue biodata button unavailable');
  start.click();
 });
 await page.waitForFunction(()=>document.body.textContent?.includes('Second required question'),{timeout:12000});
 await page.type('input[placeholder="আপনার উত্তর লিখুন..."]','Second answer saved');
 for(let n=0;n<50&&!answers[q2];n++)await new Promise(r=>setTimeout(r,200));
 assert.equal(answers[q2],'Second answer saved');
 await page.goto(site+'/profile',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.body.textContent?.includes('আবশ্যিক উত্তর: 2 / 2'),{timeout:20000});
 assert.match(await page.evaluate(()=>document.body.textContent||''),/100%/);
 console.log('PASS: Saving required answer updates backend and member dashboard to 100% (2/2).');
}finally{
 if(browser)await browser.close().catch(()=>{});
 if(next)next.kill();
 await new Promise(r=>backend.close(r));
}
