// Production-mode footer regression test. All APIs are mocked; no real account data changes.
import http from 'node:http';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const chrome=['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find(fs.existsSync);
assert.ok(chrome,'Chrome is required for visual footer QA');
const puppeteer=require(path.resolve(root,'../backend/node_modules/puppeteer'));

const api=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
 if(pathname==='/public/settings')return res.end(JSON.stringify({
   tradeLicenseNumber:'TEST-TL-123',tiktokUrl:'https://www.tiktok.com/@niqaha.com',
   policies:{terms:true,refund:true,privacy:true},
   messengerUrl:'https://m.me/niqaha',premium:{visible:false},
 }));
 if(pathname==='/pricing'||pathname==='/faq')return res.end('[]');
 if(pathname==='/seo-settings')return res.end(JSON.stringify({settings:{}}));
 return res.end('{}');
});
async function freePort(){
 const server=net.createServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const p=server.address().port;await new Promise(resolve=>server.close(resolve));return p;
}
function rgb(s){
 const matches=s.match(/-?[0-9.]+/g);
 assert.ok(matches&&matches.length>=3,'Expected color: '+s);
 const values=matches.slice(0,3).map(Number);
 if(s.startsWith('rgb('))return values;
 // CSS Color 4 LAB uses the D50 white point. Convert through XYZ into sRGB.
 if(s.startsWith('lab(')){
   const [L,a,b]=values;
   const fy=(L+16)/116;
   const fx=fy+a/500;
   const fz=fy-b/200;
   const inverse=t=>t>6/29?t**3:3*(6/29)**2*(t-4/29);
   const x=0.96422*inverse(fx),y=inverse(fy),z=0.82521*inverse(fz);
   const X=0.9554734*x-0.0230985*y+0.0632593*z;
   const Y=-0.0283697*x+1.0099956*y+0.0210414*z;
   const Z=0.0123140*x-0.0205077*y+1.3303659*z;
   const linear=[
     3.2404542*X-1.5371385*Y-0.4985314*Z,
     -0.9692660*X+1.8760108*Y+0.0415560*Z,
     0.0556434*X-0.2040259*Y+1.0572252*Z,
   ];
   return linear.map(v=>{
     const c=Math.max(0,Math.min(1,v));
     return 255*(c<=0.0031308?12.92*c:1.055*c**(1/2.4)-0.055);
   });
 }
 throw Error('Unsupported computed color: '+s);
}
function luminance(arr){
 const convert=x=>{
   const v=x/255;
   return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;
 };
 const [r,g,b]=arr.map(convert);
 return 0.2126*r+0.7152*g+0.0722*b;
}
function contrast(a,b){
 const l=[luminance(rgb(a)),luminance(rgb(b))].sort((x,y)=>y-x);
 return (l[0]+0.05)/(l[1]+0.05);
}

let next,browser;
try{
 await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
 const site='http://127.0.0.1:'+(await freePort());
 next=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),
    'start','-p',new URL(site).port],{
      cwd:root,windowsHide:true,env:{...process.env,BASE_URL:'http://127.0.0.1:'+api.address().port},
      stdio:['ignore','pipe','pipe'],
 });
 let logs='';next.stdout.on('data',x=>logs+=x.toString());next.stderr.on('data',x=>logs+=x.toString());
 let ready=false;
 for(let i=0;i<90;i++){
   if(next.exitCode!==null)throw Error('Next server stopped: '+logs);
   try{if((await fetch(site+'/login',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,250));
 }
 assert.ok(ready,logs);
 browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
 const page=await browser.newPage();
 await page.evaluateOnNewDocument(()=>{
   try{localStorage.setItem('niqaha_tracking_consent','denied');}catch{}
 });
 for(const {width,height} of [
   {width:320,height:568},{width:390,height:844},{width:768,height:800},
   {width:1440,height:900},{width:1920,height:950},
 ]){
   await page.setViewport({width,height,isMobile:width<768,hasTouch:width<768});
   await page.goto(site+'/login',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForSelector('#site-footer',{timeout:20000});
   await page.waitForFunction(()=>document.querySelector('#site-footer')?.textContent?.includes('TEST-TL-123'),{timeout:12000});
   const details=await page.evaluate(()=>{
     const footer=document.querySelector('#site-footer');
     const headings=[...footer.querySelectorAll('h2')];
     const body=footer.querySelector('[aria-label="Niqaha সম্পর্কে"] p');
     const sections=[
       footer.querySelector('[aria-label="Niqaha সম্পর্কে"]'),
       footer.querySelector('nav[aria-label="ফুটারের দ্রুত লিংক"]'),
       footer.querySelector('[aria-label="সামাজিক যোগাযোগ ও অফিস সময়"]'),
     ];
     return {
       bg:getComputedStyle(footer).backgroundColor,
       heading:getComputedStyle(headings[0]).color,
       text:getComputedStyle(body).color,
       headingFont:getComputedStyle(headings[0]).fontFamily,
       footerWidth:footer.getBoundingClientRect().width,
       footerScrollWidth:footer.scrollWidth,
       headingCount:headings.length,
       sectionRects:sections.map(s=>{
          const b=s.getBoundingClientRect();
          return {left:b.left,right:b.right,width:b.width};
       }),
       linkCount:footer.querySelectorAll('nav a').length,
       socials:footer.querySelectorAll('[aria-label="সামাজিক যোগাযোগ ও অফিস সময়"] a').length,
       office:footer.textContent.includes('শনি - বৃহস্পতি'),
       logo:!!footer.querySelector('img[alt="Niqaha logo"]'),
       licenses:footer.textContent.includes('TEST-TL-123'),
       tiktok:!!footer.querySelector('a[href="https://www.tiktok.com/@niqaha.com"]'),
       cookie:!!footer.querySelector('button'),
     };
   });
   assert.equal(details.bg,'rgb(18, 29, 45)','Footer should be midnight navy');
   assert.ok(contrast(details.heading,details.bg)>=7,'Footer headings contrast is insufficient');
   assert.ok(contrast(details.text,details.bg)>=7,'Footer body contrast is insufficient');
   assert.ok(details.headingCount>=2&&details.linkCount===6);
   assert.ok(details.office&&details.logo&&details.licenses&&details.tiktok&&details.cookie);
   assert.ok(details.footerScrollWidth<=details.footerWidth+2,
     'Footer overflows '+width+'px: '+JSON.stringify(details));
   for(const section of details.sectionRects){
     assert.ok(section.width>0&&section.left>=-2&&section.right<=width+2,
       'Footer section clips outside '+width+'px: '+JSON.stringify(section));
   }
   console.log('PASS footer '+width+'x'+height+': midnight/navy contrast, content, social links and no horizontal overflow.');
 }
 // Cookie preferences remains accessible from the redesign.
 await page.evaluate(()=>{
   const footer=document.querySelector('#site-footer');
   const cookie=[...footer.querySelectorAll('button')]
     .find(button=>button.textContent?.includes('কুকি সেটিংস'));
   if(!cookie)throw Error('Cookie settings button was removed');
   cookie.click();
 });
 await page.waitForSelector('#cookie-consent-title',{timeout:10000});
 console.log('PASS footer cookie settings opens original consent controls.');
}finally{
 if(browser)await browser.close().catch(()=>{});
 if(next)next.kill();
 await new Promise(resolve=>api.close(resolve));
}
