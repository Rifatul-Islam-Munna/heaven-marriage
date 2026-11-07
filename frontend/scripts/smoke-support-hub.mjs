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
assert.ok(chrome,'Chrome needed for floating support hub smoke test');
const puppeteer=require(path.resolve(root,'../backend/node_modules/puppeteer'));
const mock=http.createServer(async(req,res)=>{
 const route=new URL(req.url,'http://localhost').pathname;
 res.setHeader('Content-Type','application/json');
 if(route==='/public/settings')return res.end(JSON.stringify({
   messengerUrl:'https://m.me/niqaha',premium:{visible:false},policies:{}
 }));
 if(route==='/seo-settings')return res.end(JSON.stringify({settings:{}}));
 if(route==='/support/remaining')return res.end(JSON.stringify({remaining:10,limit:10}));
 if(route==='/visual-content')return res.end(JSON.stringify({page:{},global:{}}));
 res.end(JSON.stringify({}));
});
async function openPort(){
 const s=net.createServer();
 await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
 const n=s.address().port;
 await new Promise(resolve=>s.close(resolve));return n;
}
let next,browser;
try{
 await new Promise(resolve=>mock.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+mock.address().port;
 const site='http://127.0.0.1:'+(await openPort());
 next=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),
    'start','-p',new URL(site).port],{cwd:root,windowsHide:true,
    env:{...process.env,BASE_URL:base},stdio:['ignore','pipe','pipe']});
 let logs='';
 next.stdout.on('data',x=>logs+=x.toString());
 next.stderr.on('data',x=>logs+=x.toString());
 let ready=false;
 for(let i=0;i<100;i++){
   if(next.exitCode!==null)throw Error('next start crashed: '+logs);
   try{if((await fetch(site+'/login',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,250));
 }
 assert.ok(ready,logs);
 browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
 const tab=await browser.newPage();
 await tab.setViewport({width:1440,height:900});
 await tab.goto(site+'/login',{waitUntil:'domcontentloaded',timeout:30000});
 await tab.waitForSelector('[data-support-hub]',{timeout:25000});
 await tab.waitForFunction(()=>{
   const m=document.querySelector('[data-support-messenger]');
   return !!m&&m.getAttribute('href')==='https://m.me/niqaha';
 },{timeout:15000});
 const desktop=await tab.evaluate(()=>{
   const hub=document.querySelector('[data-support-hub]');
   const root=hub.getBoundingClientRect();
   const hidden=getComputedStyle(document.getElementById('niqaha-contact-actions')).display==='none';
   return {count:document.querySelectorAll('[data-support-hub]').length,
     hidden,right:innerWidth-root.right,left:root.left,
     face:!!hub.querySelector('[data-support-ai-avatar] svg'),
     menuExpanded:hub.querySelector('[data-support-more]').getAttribute('aria-expanded'),
     oldLeftButton:!!document.querySelector('button[aria-label="Open free customer support chatbot"]')};
 });
 assert.equal(desktop.count,1);
 assert.ok(desktop.right>=0&&desktop.right<40&&desktop.left>900,'Hub must anchor right');
 assert.ok(desktop.face);
 assert.ok(desktop.hidden);
 assert.equal(desktop.menuExpanded,'false');
 assert.equal(desktop.oldLeftButton,false);
 await tab.click('[data-support-more]');
 await tab.waitForFunction(()=>{
   const menu=document.getElementById('niqaha-contact-actions');
   return getComputedStyle(menu).display!=='none'&&!!menu.querySelector('[data-support-messenger]');
 });
 const contacts=await tab.evaluate(()=>({
   messenger:document.querySelector('[data-support-messenger]')?.getAttribute('href'),
   phone:document.querySelector('[data-support-call]')?.getAttribute('href'),
   expanded:document.querySelector('[data-support-more]')?.getAttribute('aria-expanded'),
 }));
 assert.equal(contacts.messenger,'https://m.me/niqaha');
 assert.match(contacts.phone||'',/^tel:\+880/);
 assert.equal(contacts.expanded,'true');
 await tab.click('[data-support-ai-avatar]');
 await tab.waitForSelector('[role="dialog"][aria-label="Niqaha customer support assistant"]');
 assert.equal(await tab.$eval('[data-support-more]',el=>el.getAttribute('aria-expanded')),'false');
 assert.equal(await tab.$eval('[data-support-ai-avatar]',el=>el.getAttribute('aria-expanded')),'true');
 await tab.click('[data-support-ai-avatar]');
 assert.equal(await tab.$('[role="dialog"][aria-label="Niqaha customer support assistant"]'),null);
 console.log('PASS: Desktop right dock, smile avatar, expand/collapse, Messenger and phone, AI chat open/close.');
 await tab.setViewport({width:390,height:700,isMobile:true});
 await tab.reload({waitUntil:'domcontentloaded',timeout:30000});
 await tab.waitForSelector('[data-support-hub]');
 const mobile=await tab.evaluate(()=>{
   const r=document.querySelector('[data-support-hub]').getBoundingClientRect();
   return {right:innerWidth-r.right,bottom:innerHeight-r.bottom,top:r.top,left:r.left,width:r.width};
 });
 assert.ok(mobile.right>=0&&mobile.right<=24,'Mobile dock must be right-aligned');
 assert.ok(mobile.bottom>=70,'Mobile dock should clear bottom navigation');
 await tab.click('[data-support-more]');
 const expandedRect=await tab.$eval('[data-support-hub]',el=>{
   const r=el.getBoundingClientRect();
   return {top:r.top,right:innerWidth-r.right};
 });
 assert.ok(expandedRect.top>=0,'Contact menu must fit in mobile viewport');
 await tab.click('[data-support-ai-avatar]');
 const dialogRect=await tab.$eval('[role="dialog"][aria-label="Niqaha customer support assistant"]',el=>{
   const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};
 });
 assert.ok(dialogRect.left>=0&&dialogRect.right<=390,'Mobile chat width must fit viewport');
 assert.ok(dialogRect.top>=0,'Mobile chat must fit above dock');
 console.log('PASS: Mobile right-aligned dock, bottom navigation clearance, expandable contacts and chat viewport.');
 await tab.click('button[aria-label="Close support chat"]');
 for(const {width,height} of [
   {width:320,height:480},{width:320,height:568},{width:360,height:640},
   {width:390,height:844},{width:768,height:500},{width:1024,height:500},
   {width:1440,height:900},
 ]){
   await tab.setViewport({width,height,isMobile:width<1024,hasTouch:width<1024});
   await tab.reload({waitUntil:'domcontentloaded',timeout:30000});
   await tab.waitForSelector('[data-support-hub]',{timeout:20000});
   const collapsed=await tab.$eval('[data-support-ai-avatar]',el=>{
     const r=el.getBoundingClientRect();
     return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,animated:getComputedStyle(el).animationName};
   });
   assert.ok(collapsed.left>=0&&collapsed.right<=width,'Avatar should fit '+width+'x'+height);
   assert.ok(collapsed.top>=0&&collapsed.bottom<=height,'Avatar should be visible '+width+'x'+height);
   assert.notEqual(collapsed.animated,'none','Avatar should animate by default');
   const button=await tab.$('[data-support-more]');
   if(button){
     await button.click();
     const expanded=await tab.$eval('[data-support-hub]',el=>{
       const r=el.getBoundingClientRect();
       return {top:r.top,right:r.right};
     });
     assert.ok(expanded.top>=0,'Expanded menu clips above '+width+'x'+height);
   }
   await tab.click('[data-support-ai-avatar]');
   const rect=await tab.$eval('[role="dialog"][aria-label="Niqaha customer support assistant"]',el=>{
     const r=el.getBoundingClientRect();
     return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};
   });
   assert.ok(rect.left>=-1&&rect.right<=width+1,'Chat clips horizontally at '+width+'x'+height);
   assert.ok(rect.top>=-1&&rect.bottom<=height+1,'Chat clips vertically at '+width+'x'+height);
   if(width<1024 && (width<640||height<620)){
     assert.ok(rect.bottom<=height-65,'Compact chat must clear bottom nav at '+width+'x'+height);
   }
   await tab.click('button[aria-label="Close support chat"]');
 }
 await tab.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 const motion=await tab.$eval('[data-support-ai-avatar]',el=>({
   glow:getComputedStyle(el,'::before').animationName,
   robot:getComputedStyle(el.querySelector('svg')).animationName,
 }));
 assert.equal(motion.glow,'none');
 assert.equal(motion.robot,'none');
 console.log('PASS: AI avatar, contact menu and chat fit seven mobile/tablet/landscape/desktop sizes.');
 console.log('PASS: Reduced-motion accessibility setting disables animations.');
}finally{
 if(browser)await browser.close().catch(()=>{});
 if(next)next.kill();
 await new Promise(resolve=>mock.close(resolve));
}
