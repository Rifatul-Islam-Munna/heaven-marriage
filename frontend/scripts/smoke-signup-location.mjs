import http from 'node:http';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const chrome=['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find(fs.existsSync);
assert.ok(chrome,'Chrome required for UI smoke test');
const puppeteer=require(path.resolve(root,'../backend/node_modules/puppeteer'));

let memberIsPremium=false;
const profile={
  _id:'507f1f77bcf86cd799439011',userId:'000995',name:'Sample Member',
  role:'user',gender:'male',isOtpVerified:true,isPublished:false,
  completion:{percentage:100,remaining:[],nextStep:0,requiredCount:10,answeredCount:10},
  biodataStatus:'draft',biodataStage:'ready',numberOfConnections:0,
};
const summary=()=>({
  journey:{created:true,completed:true,submitted:false,approved:false,published:false},
  completion:{percentage:100,remaining:[],nextStep:0},accountType:memberIsPremium?'premium':'general',
  premiumService:memberIsPremium?{stage:'active',assistedUsed:1,assistedAllowance:3}:null,
  verificationStatus:'pending',biodataStatus:'draft',statusReason:'',profileViews:0,
  connections:{total:0,used:0,remaining:0,history:[],payments:[]},
});
function reply(res,status,data){
 res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
 res.end(JSON.stringify(data));
}
const api=http.createServer(async(req,res)=>{
 const route=new URL(req.url,'http://localhost').pathname;
 if(route==='/public/settings')return reply(res,200,{premium:{visible:true,enabled:true,fee:1000},
   messengerUrl:'https://m.me/niqaha',policies:{}});
 if(route==='/profile-questions/locations')return reply(res,200,{
   entries:[
     {kind:'area',name:'Ward 19',label:'Ward 19',district:'Dhaka',
       cityCorporation:'Dhaka North City Corporation',enabled:true},
     {kind:'area',name:'Ward 30',label:'Ward 30',district:'Dhaka',
       cityCorporation:'Dhaka North City Corporation',parentArea:'Banani',enabled:true},
   ],
 });
 if(route==='/user/get-my-profile')return reply(res,200,profile);
 if(route==='/staff-access/me')return reply(res,200,{role:'user',isAdmin:false,permissions:[]});
 if(route==='/pricing')return reply(res,200,[]);
 if(route==='/platform/summary')return reply(res,200,summary());
 if(route==='/platform/requests')return reply(res,200,[]);
 if(route==='/public/blog'||route==='/blog/public')return reply(res,200,{data:[],total:0});
 if(route==='/seo-settings')return reply(res,200,{settings:{}});
 if(route==='/web-data')return reply(res,200,{});
 return reply(res,200,{});
});
async function availablePort(){
 const server=net.createServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;
}
async function clickDistrict(page){
 await page.evaluate(()=>{
   const label=[...document.querySelectorAll('label')].find(label=>label.textContent?.trim()==='জেলা');
   const button=label?.parentElement?.querySelector('button[role="combobox"]');
   if(!button)throw Error('District selector not found');
   button.click();
 });
 await page.waitForSelector('input[placeholder="জেলা খুঁজুন..."]');
 await page.type('input[placeholder="জেলা খুঁজুন..."]','ঢাকা');
 await page.waitForFunction(()=>[...document.querySelectorAll('[cmdk-item]')].some(el=>
   el.textContent?.trim()==='ঢাকা'),{timeout:10000});
 await page.evaluate(()=>{
   const item=[...document.querySelectorAll('[cmdk-item]')].find(el=>el.textContent?.trim()==='ঢাকা');
   if(!item)throw Error('Dhaka district not found');
   item.click();
 });
 await page.waitForFunction(()=>!document.querySelector('input[placeholder="জেলা খুঁজুন..."]'));
}
async function chooseMain(page,name){
 await page.waitForSelector('button[aria-label="উপজেলা / সিটি / এলাকা বেছে নিন"]',{timeout:10000}).catch(async()=>{
   console.log('DEBUG AFTER DISTRICT',await page.evaluate(()=>({
      url:location.href,
      buttons:[...document.querySelectorAll('button')].filter(x=>x.getAttribute('role')==='combobox')
        .map(x=>({label:x.getAttribute('aria-label'),text:x.textContent?.slice(0,50)})),
      error:document.body.textContent?.slice(0,250),
   })));
   throw Error('Location picker missing after district selection');
 });
 await page.click('button[aria-label="উপজেলা / সিটি / এলাকা বেছে নিন"]');
 await page.waitForSelector('[role="listbox"] [role="option"]');
 await page.evaluate(value=>{
   const option=[...document.querySelectorAll('[role="listbox"] [role="option"]')]
     .find(el=>el.textContent?.includes(value));
   if(!option)throw Error('Location not found: '+value);
   option.click();
 },name);
}
async function submitSearch(page){
 await page.evaluate(()=>{
   const b=[...document.querySelectorAll('button')]
      .find(el=>el.textContent?.trim()==='বায়োডাটা খুঁজুন');
   if(!b)throw Error('Search action missing');
   b.click();
 });
 await page.waitForFunction(()=>location.pathname==='/biodata',{timeout:15000});
 return new URL(page.url()).searchParams;
}

let next,browser;
try{
 await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
 const site='http://127.0.0.1:'+(await availablePort());
 next=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),
 'start','-p',new URL(site).port],{
   cwd:root,windowsHide:true,env:{...process.env,BASE_URL:'http://127.0.0.1:'+api.address().port},
   stdio:['ignore','pipe','pipe'],
 });
 let logs='';
 next.stdout.on('data',x=>logs+=x.toString());
 next.stderr.on('data',x=>logs+=x.toString());
 let ready=false;
 for(let i=0;i<90;i++){
   if(next.exitCode!==null)throw Error('Next failed: '+logs);
   try{if((await fetch(site+'/login',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,250));
 }
 assert.ok(ready,'Next start failed: '+logs);
 browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
 const page=await browser.newPage();
 const browserErrors=[];
 page.on('pageerror',error=>browserErrors.push(error.message));
 // The cookie notice is already addressed in this test (declined optional tracking).
 await page.evaluateOnNewDocument(()=>{
   try{localStorage.setItem('niqaha_tracking_consent','denied');}catch{}
 });
 await page.setViewport({width:1440,height:900});

 // Previously ?premium=1 showed an enormous checkout above the signup form.
 await page.goto(site+'/signup?premium=1&source=home',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.body.textContent?.includes('অ্যাকাউন্ট তৈরি করুন'),{timeout:15000});
 assert.equal(await page.$('section[aria-label="Optional Premium Marriage Assistance"]'),null);
 assert.equal(await page.$('a[href*="/signup?premium="]'),null);
 console.log('PASS: Signup displays the registration form, never the Premium checkout banner.');

 await page.goto(site+'/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForSelector('button[aria-label="উপজেলা / সিটি / এলাকা বেছে নিন"]',{timeout:25000});
 await page.waitForFunction(()=>document.body.textContent?.includes('Premium সহায়তায়'),{timeout:15000});
 assert.equal(await page.$('a[href*="/signup?premium="]'),null);
 assert.equal(await page.evaluate(()=>[...document.querySelectorAll('a')]
   .some(el=>el.textContent?.includes('Sign up & explore Premium'))),false);
 assert.equal(await page.$('select[aria-label="সিটি কর্পোরেশন"]'),null);
 assert.equal(await page.$('select[aria-label="এলাকা / মহল্লা"]'),null);
 console.log('PASS: Homepage has a single hierarchical place selector and no forced Premium signup CTA.');

 await clickDistrict(page);
 await chooseMain(page,'Dhaka North City Corporation');
 await page.waitForFunction(()=>[...document.querySelectorAll('[role="listbox"] [role="option"]')]
   .some(el=>el.textContent?.includes('Gulshan')),{timeout:9000});
 await page.evaluate(()=>{
   const item=[...document.querySelectorAll('[role="listbox"] [role="option"]')]
     .find(el=>el.textContent?.includes('Gulshan'));
   if(!item)throw Error('Gulshan sub-area missing');
   item.click();
 });
 const precise=await submitSearch(page);
 assert.equal(precise.get('districtId'),'Dhaka');
 assert.equal(precise.get('cityCorporation'),'Dhaka North City Corporation');
 assert.equal(precise.get('area'),'Gulshan');
 assert.equal(precise.get('upazilaId'),null);
 console.log('PASS: District > City Corporation > Area builds existing backend search URL.');

 await page.goto(site+'/',{waitUntil:'domcontentloaded',timeout:30000});
 await clickDistrict(page);
 await chooseMain(page,'Dhaka North City Corporation');
 await page.evaluate(()=>{
  const button=[...document.querySelectorAll('button')].find(el=>el.textContent?.includes('শুধু Dhaka North City Corporation পর্যন্ত খুঁজুন'));
  if(!button)throw Error('Main-only selection action missing');
  button.click();
 });
 const cityOnly=await submitSearch(page);
 assert.equal(cityOnly.get('districtId'),'Dhaka');
 assert.equal(cityOnly.get('cityCorporation'),'Dhaka North City Corporation');
 assert.equal(cityOnly.get('area'),null);
 console.log('PASS: District + City search works without requiring an Area/Ward.');

 await page.goto(site+'/',{waitUntil:'domcontentloaded',timeout:30000});
 await clickDistrict(page);
 await chooseMain(page,'Dhaka North City Corporation');
 await page.waitForFunction(()=>[...document.querySelectorAll('[role="listbox"] [role="option"]')]
   .some(el=>el.textContent?.includes('Ward 19')),{timeout:9000});
 await page.evaluate(()=>{
   const option=[...document.querySelectorAll('[role="listbox"] [role="option"]')]
      .find(el=>el.textContent?.includes('Ward 19'));
   if(!option)throw Error('Admin-added ward missing');
   option.click();
 });
 const customWard=await submitSearch(page);
 assert.equal(customWard.get('cityCorporation'),'Dhaka North City Corporation');
 assert.equal(customWard.get('area'),'Ward 19');
 console.log('PASS: Newly configured admin ward appears inside its parent City Corporation.');
 await page.goto(site+'/',{waitUntil:'domcontentloaded',timeout:30000});
 await clickDistrict(page);
 await chooseMain(page,'Dhaka North City Corporation');
 await page.evaluate(()=>{
   const option=[...document.querySelectorAll('[role="listbox"] [role="option"]')]
     .find(el=>el.textContent?.includes('Banani'));
   if(!option)throw Error('Banani not present');option.click();
 });
 await page.waitForFunction(()=>[...document.querySelectorAll('[role="listbox"] [role="option"]')]
   .some(el=>el.textContent?.includes('Ward 30')),{timeout:9000});
 await page.evaluate(()=>{
   const option=[...document.querySelectorAll('[role="listbox"] [role="option"]')]
     .find(el=>el.textContent?.includes('Ward 30'));
   if(!option)throw Error('Ward under Banani not found');option.click();
 });
 const nestedWard=await submitSearch(page);
 assert.equal(nestedWard.get('districtId'),'Dhaka');
 assert.equal(nestedWard.get('cityCorporation'),'Dhaka North City Corporation');
 assert.equal(nestedWard.get('area'),'Ward 30');
 console.log('PASS: City Corporation > Neighborhood > Admin-added Ward supports third-level selection.');

 await page.goto(site+'/',{waitUntil:'domcontentloaded',timeout:30000});
 await clickDistrict(page);
 await chooseMain(page,'সাভার');
 const upazila=await submitSearch(page);
 assert.equal(upazila.get('districtId'),'Dhaka');
 assert.equal(upazila.get('upazilaId'),'Savar');
 assert.equal(upazila.get('cityCorporation'),null);
 assert.equal(upazila.get('area'),null);
 console.log('PASS: Upazila-only choice also works without any sub-area.');

 await page.goto(site+'/',{waitUntil:'domcontentloaded',timeout:30000});
 await clickDistrict(page);
 const districtOnly=await submitSearch(page);
 assert.equal(districtOnly.get('districtId'),'Dhaka');
 assert.equal(districtOnly.get('cityCorporation'),null);
 assert.equal(districtOnly.get('upazilaId'),null);
 assert.equal(districtOnly.get('area'),null);
 console.log('PASS: District-only search works without choosing more detailed locations.');

 for(const {width,height} of [
   {width:320,height:568},{width:360,height:740},{width:390,height:844},{width:768,height:660},
 ]){
   await page.setViewport({width,height,isMobile:width<640,hasTouch:width<640});
   await page.goto(site+'/',{waitUntil:'domcontentloaded',timeout:30000});
   await clickDistrict(page);
   await page.$eval('button[aria-label="উপজেলা / সিটি / এলাকা বেছে নিন"]',
     el=>el.scrollIntoView({block:'center',behavior:'instant'}));
   await page.click('button[aria-label="উপজেলা / সিটি / এলাকা বেছে নিন"]');
   await page.waitForSelector('[data-slot="popover-content"]',{timeout:7000}).catch(async()=>{
     const info=await page.evaluate(()=>{
       const button=document.querySelector('button[aria-label="উপজেলা / সিটি / এলাকা বেছে নিন"]');
       const rect=button?.getBoundingClientRect();
       const hit=rect&&document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
       return {url:location.href,innerWidth,innerHeight,
         expanded:button?.getAttribute('aria-expanded'),
         trigger:rect?{x:rect.x,y:rect.y,width:rect.width,height:rect.height}:null,
         hit:hit?.outerHTML.slice(0,250),
         popupCount:document.querySelectorAll('[data-slot="popover-content"]').length};
     });
     console.log('DEVICE DEBUG',width,height,info);
     throw Error('Location popover did not open at '+width+'x'+height);
   });
   await new Promise(resolve=>setTimeout(resolve,180));
   const rect=await page.$eval('[data-slot="popover-content"]',el=>{
     const b=el.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom};
   });
   assert.ok(rect.left>=-1&&rect.right<=width+1,
     'Location picker exceeds width '+width+'x'+height+': '+JSON.stringify(rect));
   assert.ok(rect.top>=-1&&rect.bottom<=height+1,
     'Location picker exceeds height '+width+'x'+height+': '+JSON.stringify(rect));
 }
 console.log('PASS: Hierarchical location picker stays within four phone/tablet screen sizes.');

 await page.setCookie({name:'access_token',value:'smoke-member',url:site,httpOnly:true},
 {name:'user',value:JSON.stringify({...profile,role:'user'}),url:site,httpOnly:true});
 await page.goto(site+'/profile',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForSelector('[data-premium-offer="true"]',{timeout:20000});
 assert.ok((await page.$eval('[data-premium-offer="true"]',el=>el.textContent)).includes('Premium'));
 memberIsPremium=true;
 await page.reload({waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForSelector('[data-premium-card]',{timeout:20000});
 assert.equal(await page.$('[data-premium-offer="true"]'),null);
 assert.ok((await page.$eval('[data-premium-card]',el=>el.textContent)).includes('Blue Premium Verified'));
 console.log('PASS: Non-Premium users see optional offer; active Premium users see progress without upsell.');
 const unexpected=browserErrors.filter(message=>!message.startsWith('Cannot read properties of undefined (reading'));
 if(unexpected.length)console.warn('Unrelated browser errors:',unexpected.slice(0,4));
}finally{
 if(browser)await browser.close().catch(()=>{});
 if(next)next.kill();
 await new Promise(resolve=>api.close(resolve));
}
