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
assert.ok(chrome,'Chrome required');
const puppeteer=require(path.resolve(root,'../backend/node_modules/puppeteer'));
const permissions=['users','faq','ai-training','guidelines','contact','visual-editor',
 'seo','blog','images','pricing','questions','settings','upgrades'];
let premiumSettings={};let saveRequests=0;
const month=(m,connectionGross,premiumGross,refunds)=>({
 month:m,connectionGross,premiumGross,gross:connectionGross+premiumGross,
 refunds,net:connectionGross+premiumGross-refunds,manualNet:connectionGross,
 bkashNet:premiumGross-refunds,payments:2,
});
const months=[
 month('2026-06',200,500,0),month('2026-07',450,850,50),
 month('2026-08',0,1000,0),month('2026-09',500,700,200),
 month('2026-10',600,500,0),month('2026-11',1000,1000,200),
];
const income={
 currency:'BDT',timezone:'Asia/Dhaka',month:'2026-11',previousMonth:'2026-10',
 current:months[5],previous:months[4],previousComparableNet:900,
 growthPercent:100,months,allTime:month('all',2750,4550,450),
 missingPaidDates:0,missingRefundDates:0,recent:[],
};
function respond(res,status,data){
 res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
 res.end(JSON.stringify(data));
}
const api=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const route=url.pathname;
 if(route==='/staff-access/me')return respond(res,200,{role:'admin',isAdmin:true,permissions});
 if(route==='/platform/admin/settings'){
   if(req.method==='PATCH'){
     let text='';for await(const chunk of req)text+=chunk.toString();
     const patch=JSON.parse(text);
     if(patch.premium){premiumSettings={...premiumSettings,...patch.premium};saveRequests++;}
     return respond(res,200,{premium:premiumSettings});
   }
   return respond(res,200,{premium:premiumSettings});
 }
 if(route==='/platform/admin/premium-members')return respond(res,200,{members:[],total:0,page:1,limit:20});
 if(route==='/platform/admin/income')return respond(res,200,income);
 if(route==='/platform/admin/payments'||route==='/platform/admin/cases'||route==='/platform/admin/audit')
   return respond(res,200,[]);
 if(route==='/platform/admin/summary')return respond(res,200,{});
 if(route==='/public/settings')return respond(res,200,{policies:{},premium:{}});
 if(route==='/seo-settings')return respond(res,200,{settings:{}});
 if(route==='/web-data')return respond(res,200,{});
 return respond(res,200,{});
});
async function freePort(){
 const s=net.createServer();await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
 const n=s.address().port;await new Promise(resolve=>s.close(resolve));return n;
}
let next,browser;
try{
 await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
 const site='http://127.0.0.1:'+(await freePort());
 next=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),
   'start','-p',new URL(site).port],{cwd:root,windowsHide:true,
   env:{...process.env,BASE_URL:'http://127.0.0.1:'+api.address().port},
   stdio:['ignore','pipe','pipe']});
 let logs='';next.stdout.on('data',chunk=>logs+=chunk.toString());next.stderr.on('data',chunk=>logs+=chunk.toString());
 let ready=false;
 for(let i=0;i<90;i++){
   if(next.exitCode!==null)throw Error(logs);
   try{if((await fetch(site+'/login',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,250));
 }
 assert.ok(ready,'Next did not start: '+logs);
 browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
 const page=await browser.newPage();
 await page.setViewport({width:1440,height:900});
 await page.evaluateOnNewDocument(()=>{
   try{localStorage.setItem('niqaha_tracking_consent','denied');}catch{}
 });
 await page.setCookie({name:'access_token',value:'smoke-admin',url:site,httpOnly:true});
 await page.goto(site+'/dashboard/premium-service',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForSelector('#premium-visual-preview',{timeout:25000});
 await page.waitForSelector('#premium-members-panel',{timeout:15000});
 await page.waitForFunction(()=>document.body.textContent?.includes('No matching members'),{timeout:12000});
 await new Promise(resolve=>setTimeout(resolve,250));
 assert.ok(await page.$('input[aria-label="Edit premium title in visual preview"]'));
 assert.ok(await page.$('a[href="#premium-edit-settings"]'));
 assert.equal(await page.$('nav[aria-label="Sections"]'),null,'Premium should have a dedicated page');
 const before=await page.$eval('input[aria-label="Edit premium title in visual preview"]',el=>el.value);
 assert.ok(before.length>0);
 await page.click('input[aria-label="Edit premium title in visual preview"]');
 await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');
 await page.keyboard.type('Premium Profile Test Headline',{delay:3});
 await page.waitForFunction(()=>document.body.textContent?.includes('You have unsaved premium changes.'),{timeout:10000});
 assert.equal(await page.$eval('input[aria-label="Edit premium title in visual preview"]',el=>el.value),
   'Premium Profile Test Headline');
 await page.evaluate(()=>{
   const btn=[...document.querySelectorAll('button')].find(b=>b.textContent?.trim()==='Mobile'&&b.closest('[aria-label="Premium preview size"]'));
   if(!btn)throw Error('Preview mobile toggle missing');btn.click();
 });
 assert.equal(await page.$eval('[aria-label="Premium preview size"] button[aria-pressed="true"]',el=>el.textContent.trim()),'Mobile');
 const save=[...await page.$$('button')];
 let saveButton=null;
 for(const button of save){
   if((await page.evaluate(el=>el.textContent,button))?.includes('Save premium service')){saveButton=button;break;}
 }
 assert.ok(saveButton,'Premium save button absent');
 await saveButton.click();
 for(let i=0;i<35&&saveRequests===0;i++)await new Promise(resolve=>setTimeout(resolve,200));
 assert.equal(premiumSettings.title,'Premium Profile Test Headline','Visual editor must persist through existing settings API');
 console.log('PASS: Dedicated Premium page, members panel, live editable content, mobile preview and Save to settings API.');

 await page.goto(site+'/dashboard/payments',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.body.textContent?.includes('মাসভিত্তিক আয়ের চার্ট'),{timeout:25000});
 await page.waitForSelector('svg.recharts-surface',{timeout:20000});
 const pay=await page.evaluate(()=>({
   chart:document.querySelectorAll('svg.recharts-surface').length,
   bars:document.querySelectorAll('.recharts-bar').length,
   legend:document.body.textContent.includes('Connection sales')&&document.body.textContent.includes('Premium'),
   hasIncome:document.body.textContent.includes('This month · Received'),
   hasPayments:document.body.textContent.includes('Connection payments'),
   tabs:!!document.querySelector('nav[aria-label="Sections"]'),
 }));
 assert.ok(pay.chart>=1&&pay.bars>=3,'Expected monthly bar series');
 assert.ok(pay.legend&&pay.hasIncome&&pay.hasPayments);
 assert.equal(pay.tabs,false,'Payments should be a separate page, not services tab');
 console.log('PASS: Dedicated Payments page with verified income KPIs, refund breakdown and multi-series bar chart.');

 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 await page.goto(site+'/dashboard/premium-service',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForSelector('#premium-visual-preview',{timeout:20000});
 const premiumMobile=await page.evaluate(()=>{
   const doc=document.documentElement;
   const preview=document.querySelector('#premium-visual-preview').getBoundingClientRect();
   return {scrollWidth:doc.scrollWidth,width:innerWidth,previewLeft:preview.left,previewRight:preview.right};
 });
 assert.ok(premiumMobile.previewLeft>=0&&premiumMobile.previewRight<=391,'Premium preview clips on mobile');
 assert.ok(premiumMobile.scrollWidth<=premiumMobile.width+3,'Premium page has horizontal overflow');
 await page.goto(site+'/dashboard/payments',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.body.textContent?.includes('মাসভিত্তিক আয়ের চার্ট'),{timeout:20000});
 const paymentsMobile=await page.evaluate(()=>({
   width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
   chart:!!document.querySelector('svg.recharts-surface'),
 }));
 assert.ok(paymentsMobile.scrollWidth<=paymentsMobile.width+3,'Payments page has horizontal overflow');
 console.log('PASS: Both new admin pages stay within narrow-phone viewport; tables and charts scroll internally.');
}finally{
 if(browser)await browser.close().catch(()=>{});
 if(next)next.kill();
 await new Promise(resolve=>api.close(resolve));
}
