// Isolated UI regression test: essential location questions cannot be disabled.
// Mock backend only; never changes real production questions or member data.
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const chrome=['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find(fs.existsSync);
assert.ok(chrome,'Chrome is required');
const puppeteer=require(path.resolve(root,'../backend/node_modules/puppeteer'));
const fallback=JSON.parse(fs.readFileSync(path.join(root,'lib/profile-question-defaults.json'),'utf8'));
const extra=[
 {id:'builtin_8e65c7400068cbdd',path:'residenceCountry',optionSource:'countries',section:0},
 {id:'builtin_8e65c7400068cbde',path:'address.cityCorporation',optionSource:'cityCorporations',section:1},
 {id:'builtin_8e65c7400068cbdf',path:'address.area',optionSource:'cityAreas',section:1},
].map((q,i)=>({...q,question:q.path,publicLabel:q.path,gender:'both',type:'select',
 options:[],required:false,enabled:true,showPublic:true,order:850+i*10,locked:false}));
const questions=[...fallback.questions,...extra];
const schema={revision:14,sections:fallback.sections,questions};
const protectedFields=[
 'nationality','residenceCountry','address.district','address.upazila',
 'address.cityCorporation','address.area',
];
const send=(res,code,data)=>{
 res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});
 res.end(JSON.stringify(data));
};
const backend=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 if(pathname==='/staff-access/me')return send(res,200,{
   isAdmin:true,role:'admin',permissions:['questions','users','settings','faq'],
 });
 if(pathname==='/profile-questions/admin')return send(res,200,schema);
 if(pathname==='/profile-questions')return send(res,200,schema);
 if(pathname==='/profile-questions/admin/locations'||pathname==='/profile-questions/locations')
   return send(res,200,{entries:[]});
 return send(res,200,{});
});
async function port(){
 const server=net.createServer();
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const p=server.address().port;await new Promise(r=>server.close(r));return p;
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
 for(let i=0;i<90;i++){
   if(next.exitCode!==null)throw Error('Next crashed: '+logs);
   try{if((await fetch(site+'/login',{signal:AbortSignal.timeout(1000)})).ok){
     ready=true;break;
   }}catch{}
   await new Promise(r=>setTimeout(r,250));
 }
 assert.ok(ready,logs);
 browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
 const page=await browser.newPage();
 await page.setViewport({width:1400,height:900});
 await page.setCookie(
   {name:'access_token',value:'smoke-admin',url:site,httpOnly:true},
   {name:'user',value:JSON.stringify({_id:'507f1f77bcf86cd799439011',name:'Admin',role:'admin'}),url:site,httpOnly:true},
 );
 await page.goto(site+'/dashboard/user-question',{waitUntil:'domcontentloaded',timeout:30000});
 const first=questions.find(q=>q.path==='nationality');
 await page.waitForSelector('[data-question-id="'+first.id+'"]',{timeout:25000});
 for(const pathName of protectedFields){
   const q=questions.find(q=>q.path===pathName);
   assert.ok(q,'Missing '+pathName);
   await page.$eval('[data-question-id="'+q.id+'"]',button=>button.click());
   await page.waitForFunction(field=>
     document.querySelector('section[aria-label="Edit question"]')?.textContent?.includes(field),
     {timeout:12000},pathName);
   const data=await page.evaluate(()=>{
     const section=document.querySelector('section[aria-label="Edit question"]');
     const archive=[...section.querySelectorAll('button')].find(b=>b.textContent.trim()==='Hide');
     return {
       protected:section.textContent.includes('Protected location'),
       archive:archive?.disabled,
       enabled:section.querySelector('#qb-enabled')?.disabled,
       required:section.querySelector('#qb-required')?.disabled,
       types:[...section.querySelectorAll('[aria-label="Answer type"] [role="radio"]')].map(el=>el.disabled),
       audiences:[...section.querySelectorAll('[aria-label="Asked to"] [role="radio"]')].map(el=>el.disabled),
     };
   });
   assert.ok(data.protected,pathName+' missing protected badge');
   assert.equal(data.archive,true,pathName+' can be archived');
   assert.equal(data.enabled,true,pathName+' can be hidden');
   assert.equal(data.required,false,pathName+' required setting should remain editable');
   assert.ok(data.types.length>1&&data.types.every(Boolean),pathName+' input type can change');
   assert.ok(data.audiences.length>1&&data.audiences.every(Boolean),pathName+' gender can change');
 }
 console.log('PASS: all six essential location fields cannot be hidden, archived, retyped or gender-restricted.');
 console.log('PASS: admins can still change whether each location field is required.');
}finally{
 if(browser)await browser.close().catch(()=>{});
 if(next)next.kill();
 await new Promise(r=>backend.close(r));
}
