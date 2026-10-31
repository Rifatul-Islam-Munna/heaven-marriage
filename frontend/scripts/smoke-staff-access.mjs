// Isolated staff RBAC test with the production Next.js server and mock NestJS.
// No real accounts or production databases are accessed.
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const ALL=['users','faq','guidelines','contact','visual-editor','seo','blog','images','pricing','questions','settings','upgrades'];
const accountId='507f1f77bcf86cd799439011';
const sessions={
 'token-admin':{role:'admin',permissions:ALL,isAdmin:true},
 'token-seo':{role:'seo',permissions:['seo'],isAdmin:false},
 'token-blog':{role:'blog',permissions:['blog'],isAdmin:false},
 'token-manager':{role:'manager',permissions:['faq'],isAdmin:false},
 'token-user':{role:'user',permissions:[],isAdmin:false},
};
const account=()=>({id:accountId,name:'Test staff member',email:'staff@example.com',
 phoneNumber:'01799999999',role:sessions['token-manager'].role,permissions:sessions['token-manager'].permissions});
const send=(res,code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const backend=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1');
 const token=req.headers.access_token||'',who=sessions[token];
 if(u.pathname==='/seo-settings')return send(res,200,{scope:u.searchParams.get('path'),settings:{},site:{}});
 if(u.pathname==='/seo-settings/sitemap'||u.pathname==='/blog/sitemap'||u.pathname==='/blog/categories')return send(res,200,[]);
 if(u.pathname==='/blog')return send(res,200,{items:[],page:1,pages:0,total:0,limit:9});
 if(u.pathname==='/visual-content')return send(res,200,{path:'/',page:{},global:{}});
 if(u.pathname==='/staff-access/me')
  return who?send(res,200,who):send(res,401,{message:'Sign in first'});
 if(u.pathname.startsWith('/staff-access/admin')){
  if(token!=='token-admin')return send(res,403,{message:'Forbidden'});
  if(u.pathname.endsWith('/staff'))return send(res,200,[{id:'507f1f77bcf86cd799439010',
    name:'Main admin',role:'admin',permissions:ALL,email:'owner@example.com',phoneNumber:''},account()]);
  if(u.pathname.endsWith('/search'))return send(res,200,[account()]);
  if(req.method==='PATCH'&&u.pathname.endsWith(accountId)){
   let raw='';for await(const chunk of req)raw+=String(chunk);
   const data=JSON.parse(raw);
   sessions['token-manager']={role:data.role,permissions:data.permissions,isAdmin:false};
   return send(res,200,account());
  }
 }
 if(u.pathname.startsWith('/seo-settings/admin')){
  if(!who?.permissions.includes('seo'))return send(res,403,{message:'SEO forbidden'});
  if(u.pathname.endsWith('/list'))return send(res,200,[]);
  return send(res,200,{scope:'/',draft:{},published:{},revision:0,
    updatedAt:null,publishedAt:null,hasUnpublishedChanges:false});
 }
 if(u.pathname.startsWith('/blog/admin')){
  if(!who?.permissions.includes('blog'))return send(res,403,{message:'Blog forbidden'});
  return send(res,200,{items:[],page:1,pages:0,total:0,limit:30});
 }
 if(u.pathname==='/faq')return send(res,200,[]);
 if(u.pathname==='/public/settings')return send(res,200,{messengerUrl:'',policies:{}});
 if(u.pathname==='/web-data')return send(res,200,{home:{},about:{}});
 return send(res,404,{message:'Unknown test endpoint'});
});
async function openPort(){
 const server=net.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const n=server.address().port;await new Promise(resolve=>server.close(resolve));return n;
}
let proc,browser;
try{
 await new Promise(resolve=>backend.listen(0,'127.0.0.1',resolve));
 const site='http://127.0.0.1:'+(await openPort());
 proc=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','-p',new URL(site).port],{
  cwd:root,windowsHide:true,env:{...process.env,BASE_URL:'http://127.0.0.1:'+backend.address().port},
  stdio:['ignore','pipe','pipe'],
 });
 let logs='';proc.stdout.on('data',s=>logs+=s.toString());proc.stderr.on('data',s=>logs+=s.toString());
 let ready=false;
 for(let i=0;i<70;i++){
  if(proc.exitCode!==null)throw Error('Server quit: '+logs);
  try{const r=await fetch(site+'/api/staff-access/me',{signal:AbortSignal.timeout(600)});
    if(r.status===401){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,270));
 }
 assert.ok(ready,logs);
 const load=async(route,token,redirect='manual')=>{
  const response=await fetch(site+route,{
    headers:{Cookie:'access_token='+token},
    redirect,signal:AbortSignal.timeout(12000),
  });
  return {status:response.status,location:response.headers.get('location'),
    body:await response.text()};
 };
 const denied=async(route,token)=>{
   const response=await load(route,token);
   assert.equal(response.status,307,route+' was not redirected (status '+response.status+')');
   assert.ok(response.location?.includes('/profile')||response.location?.includes('/login'),
     route+' redirect to wrong location: '+response.location);
 };
 assert.equal((await load('/dashboard/access','token-admin')).status,200);
 assert.equal((await load('/dashboard/seo','token-seo')).status,200);
 await denied('/dashboard/blog','token-seo');
 await denied('/dashboard/access','token-seo');
 assert.equal((await load('/dashboard/blog','token-blog')).status,200);
 await denied('/dashboard/seo','token-blog');
 await denied('/dashboard/access','token-blog');
 assert.equal((await load('/dashboard/faq','token-manager')).status,200);
 await denied('/dashboard/blog','token-manager');
 await denied('/dashboard/seo','token-manager');
 await denied('/dashboard/access','token-manager');
 await denied('/dashboard/seo','token-user');
 console.log('PASS: admin, SEO, Blog, Manager and User page gates deny unauthorized direct URLs.');
 const s=await load('/dashboard','token-seo');
 assert.equal(s.status,307);
 assert.ok(s.location?.includes('/dashboard/seo'));
 const m=await load('/dashboard','token-manager');
 assert.equal(m.status,307);
 assert.ok(m.location?.includes('/dashboard/faq'));
 console.log('PASS: dashboard landing redirects staff to their first permitted section.');
 const noStaff=await load('/api/staff-access/admin/staff','token-seo');
 assert.equal(noStaff.status,403);
 const noAssign=await fetch(site+'/api/staff-access/admin/'+accountId,{
   method:'PATCH',headers:{Cookie:'access_token=token-blog','Content-Type':'application/json',Origin:site},
   body:JSON.stringify({role:'manager',permissions:ALL}),
 });
 assert.equal(noAssign.status,403);
 console.log('PASS: the staff assignment API refuses SEO/Blog callers.');
 const change=await fetch(site+'/api/staff-access/admin/'+accountId,{
   method:'PATCH',headers:{Cookie:'access_token=token-admin','Content-Type':'application/json',Origin:site},
   body:JSON.stringify({role:'manager',permissions:['seo','blog']}),
 });
 assert.equal(change.status,200,await change.text().catch(()=>''));
 assert.equal((await load('/dashboard/seo','token-manager')).status,200);
 assert.equal((await load('/dashboard/blog','token-manager')).status,200);
 await denied('/dashboard/faq','token-manager');
 await denied('/dashboard/access','token-manager');
 console.log('PASS: manager grants and revocations change access on the very next request.');
 const chrome=['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find(fs.existsSync);
 let puppeteer;try{puppeteer=require(path.resolve(root,'../backend/node_modules/puppeteer'));}catch{}
 if(chrome&&puppeteer){
   browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
   const tab=await browser.newPage();
   await tab.setCookie({name:'access_token',value:'token-admin',url:site,httpOnly:true});
   await tab.goto(site+'/dashboard/access',{waitUntil:'domcontentloaded',timeout:30000});
   await tab.waitForFunction(()=>document.body.textContent.includes('The right access.'),{timeout:18000});
   await tab.waitForFunction(()=>document.body.textContent.includes('Test staff member'),{timeout:12000});
   await tab.evaluate(()=>{
     const target=[...document.querySelectorAll('button')].find(b=>b.textContent?.includes('Test staff member'));
     if(!target)throw Error('Role editor staff row missing');target.click();
   });
   await tab.waitForFunction(()=>document.body.textContent.includes('Manager page permissions'),{timeout:10000});
   assert.ok(await tab.$('input[type=checkbox]'));
   console.log('PASS: Chrome admin staff editor renders current grants and manager checkboxes.');
   await tab.evaluate(()=>{
     const target=[...document.querySelectorAll('label')].find(x=>x.textContent?.includes('প্রশ্নোত্তর'));
     const input=target?.querySelector('input[type="checkbox"]');
     if(!input)throw Error('FAQ manager permission missing');
     input.click();
   });
   await tab.waitForFunction(()=>[...document.querySelectorAll('button')]
     .some(x=>x.textContent?.includes('Save access')&&!x.disabled),{timeout:10000});
   await tab.evaluate(()=>{
     const save=[...document.querySelectorAll('button')].find(x=>
       x.textContent?.includes('Save access')&&!x.disabled);
     if(!save)throw Error('Save access button disabled');
     save.click();
   });
   await tab.waitForFunction(()=>document.body.textContent.includes('Role and page access saved'),{timeout:12000});
   assert.ok(sessions['token-manager'].permissions.includes('faq'));
   assert.equal((await load('/dashboard/faq','token-manager')).status,200);
   console.log('PASS: Admin checkbox change in Chrome saves new manager page access to backend.');
   await tab.goto(site+'/dashboard/seo',{waitUntil:'domcontentloaded',timeout:30000});
   assert.ok(await tab.$('a[href="/dashboard/access"]'));
   const seo=await browser.newPage();
   await seo.setCookie({name:'access_token',value:'token-seo',url:site,httpOnly:true});
   await seo.goto(site+'/dashboard/seo',{waitUntil:'domcontentloaded',timeout:30000});
   await seo.waitForFunction(()=>document.body.textContent.includes('Every page. Every detail.'),{timeout:16000});
   assert.equal(await seo.$('a[href="/dashboard/blog"]'),null);
   assert.equal(await seo.$('a[href="/dashboard/access"]'),null);
   console.log('PASS: SEO staff sidebar excludes blog and staff permission administration.');
 }else console.log('INFO: Chrome UI not available; HTTP route tests passed.');
}finally{
 if(browser)await browser.close().catch(()=>{});
 if(proc)proc.kill();
 await new Promise(resolve=>backend.close(resolve));
}
