// Isolated production Next.js + fake NestJS backend + Chrome (optional).
// Never connects to or modifies the real Niqaha database.
// Usage: npm run build && node scripts/smoke-seo.mjs
import http from 'node:http';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const configs=new Map();
const seen=new Map();
const doc=scope=>{
  if(!configs.has(scope))configs.set(scope,{
    scope,revision:0,draft:{},published:{},updatedAt:null,publishedAt:null,
  });
  return configs.get(scope);
};
const reply=(res,status,data)=>{
  res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
  res.end(JSON.stringify(data));
};
const backend=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/staff-access/me'){
  if(req.headers.access_token==='smoke-admin')return reply(res,200,{
    role:'admin',isAdmin:true,
    permissions:['users','faq','guidelines','contact','visual-editor','seo','blog','images','pricing','questions','settings','upgrades'],
  });
  return reply(res,401,{message:'Unauthorized'});
  }
  if(!u.pathname.startsWith('/seo-settings'))return reply(res,404,{message:'Not found'});
  if(u.pathname==='/seo-settings/sitemap'){
    return reply(res,200,[...configs.values()].filter(d=>d.publishedAt&&d.scope!=='@site').map(d=>({
      path:d.scope,settings:d.published,updatedAt:d.publishedAt,
    })));
  }
  if(u.pathname==='/seo-settings'&&req.method==='GET'){
    const scope=u.searchParams.get('path')||'/';
    seen.set(scope,(seen.get(scope)||0)+1);
    if(scope==='/guidelines')return reply(res,200,{}); // Simulate an outdated backend.
    if(scope==='/contact')return reply(res,503,{message:'Backend temporarily unavailable'});
    const exact=configs.get(scope);
    const template=configs.get(u.searchParams.get('template'));
    return reply(res,200,{scope,settings:exact?.published||template?.published||{},
      site:configs.get('@site')?.published||{}});
  }
  if(u.pathname.startsWith('/seo-settings/admin')){
    if(req.headers.access_token!=='smoke-admin')return reply(res,401,{message:'Admin login required'});
    if(u.pathname==='/seo-settings/admin/list'&&req.method==='GET')
      return reply(res,200,[...configs.values()].map(d=>({
        scope:d.scope,revision:d.revision,updatedAt:d.updatedAt,
        published:!!d.publishedAt,
        hasUnpublishedChanges:JSON.stringify(d.draft)!==JSON.stringify(d.published),
      })));
    if(req.method==='GET'){
      const scope=u.searchParams.get('path')||'/';
      const d=doc(scope);
      return reply(res,200,{...d,hasUnpublishedChanges:JSON.stringify(d.draft)!==JSON.stringify(d.published)});
    }
    let raw='';
    for await(const chunk of req)raw+=chunk.toString();
    const input=JSON.parse(raw||'{}'),d=doc(input.scope);
    if(input.revision!==d.revision)return reply(res,409,{message:'Revision conflict'});
    if(req.method==='PUT'){
      d.revision++;d.draft=input.settings;d.updatedAt=new Date().toISOString();
    }else if(req.method==='POST'&&u.pathname.endsWith('/publish')){
      d.published=structuredClone(d.draft);d.publishedAt=new Date().toISOString();
    }else return reply(res,405,{message:'Method not allowed'});
    return reply(res,200,{...d,hasUnpublishedChanges:JSON.stringify(d.draft)!==JSON.stringify(d.published)});
  }
  return reply(res,404,{message:'Not found'});
});
async function port(){
  const server=net.createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const p=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  return p;
}
async function get(url,init){
  const res=await fetch(url,{...init,signal:AbortSignal.timeout(13000)});
  return {res,body:await res.text()};
}
let next,browser;
try{
  await new Promise(resolve=>backend.listen(0,'127.0.0.1',resolve));
  const backendUrl='http://127.0.0.1:'+backend.address().port;
  const frontPort=await port(),origin='http://127.0.0.1:'+frontPort;
  next=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','-p',String(frontPort)],{
    cwd:root,env:{...process.env,BASE_URL:backendUrl},windowsHide:true,
    stdio:['ignore','pipe','pipe'],
  });
  let logs='';
  next.stdout.on('data',v=>logs+=v.toString());
  next.stderr.on('data',v=>logs+=v.toString());
  let ready=false;
  for(let i=0;i<80;i++){
    if(next.exitCode!==null)throw Error(logs);
    try{const result=await fetch(origin+'/api/seo-settings?path=%2Fabout',{signal:AbortSignal.timeout(800)});
      if(result.ok){ready=true;break;}}
    catch{}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  assert.ok(ready,'Next production server failed: '+logs);
  const denied=await get(origin+'/api/seo-settings?admin=1&path=%2Fabout');
  assert.equal(denied.res.status,401);
  console.log('PASS: SEO admin proxy rejects visitors without credentials.');

  const page=async route=>get(origin+route,{headers:{'User-Agent':'Googlebot'}});
  let about=await page('/about');
  assert.equal(about.res.status,200);
  assert.ok(about.body.includes('আমাদের সম্পর্কে | Niqaha.com'));
  const incomplete=await page('/guidelines');
  assert.equal(incomplete.res.status,200);
  assert.ok(incomplete.body.includes('ব্যবহারের নির্দেশনা | Niqaha.com'));
  const unavailable=await page('/contact');
  assert.equal(unavailable.res.status,200);
  assert.ok(unavailable.body.includes('যোগাযোগ | Niqaha.com'));
  console.log('PASS: an outdated/missing SEO backend never breaks existing page rendering.');
  const baseline=seen.get('/about')||0;
  for(let n=0;n<6;n++)await page('/about');
  assert.equal(seen.get('/about'),baseline,'Repeated visitors called the backend despite caching');
  console.log('PASS: original per-page SEO is the fallback and six visitors reuse the cache.');

  const write=(method,input)=>get(origin+'/api/seo-settings',{
    method,headers:{'Content-Type':'application/json','Cookie':'access_token=smoke-admin','Origin':origin},
    body:JSON.stringify(input),
  });
  let response=await write('PUT',{
    scope:'/about',revision:0,settings:{title:'Custom About SEO | Niqaha',
      description:'Advanced metadata for the About page from the admin panel',
      canonical:'/about',openGraph:{title:'About Share Preview',image:'/logo.png'},
      twitter:{card:'summary_large_image'},
      structuredData:JSON.stringify({'@context':'https://schema.org','@type':'WebPage',
        name:'Safe </script> example'}),robots:{index:true},
      sitemap:{include:true,priority:0.9,changeFrequency:'weekly'},
    },
  });
  assert.equal(response.res.status,200,response.body);
  assert.ok(!(await page('/about')).body.includes('Custom About SEO'));
  response=await write('POST',{scope:'/about',revision:1});
  assert.equal(response.res.status,200,response.body);
  about=await page('/about');
  assert.match(about.body,/Custom About SEO/);
  assert.match(about.body,/About Share Preview/);
  assert.match(about.body,/canonical/);
  assert.match(about.body,/schema.org/);
  assert.ok(about.body.includes('u003c')&& !about.body.includes('Safe </script> example'),
    'Custom structured data should be HTML-script safe');
  console.log('PASS: private drafts, publish invalidation, title, OG, canonical, and safe JSON-LD.');

  const sitemap=await get(origin+'/sitemap.xml');
  assert.ok(sitemap.body.includes('https://niqaha.com/about'));
  const hide=await write('PUT',{scope:'/about',revision:1,settings:{robots:{index:false},sitemap:{include:false}}});
  assert.equal(hide.res.status,200,hide.body);
  assert.equal((await write('POST',{scope:'/about',revision:2})).res.status,200);
  const xml=await get(origin+'/sitemap.xml');
  assert.ok(!xml.body.includes('https://niqaha.com/about'),xml.body.slice(0,1500));
  assert.match((await page('/about')).body,/noindex/);
  console.log('PASS: noindex settings remove the page from sitemap and search metadata.');

  for(const route of ['/login','/dashboard','/profile','/biodata/507f1f77bcf86cd799439011']){
    const result=await page(route);
    assert.ok(result.body.includes('noindex'),route+' has no noindex');
  }
  console.log('PASS: account/dashboard/profile/biodata routes enforce noindex.');

  response=await write('PUT',{scope:'@site',revision:0,settings:{
    siteName:'Niqaha Global',verification:{google:'google-seo-test',bing:'bing-seo-test'},
    openGraph:{image:'/logo.png'},
  }});
  assert.equal(response.res.status,200,response.body);
  assert.equal((await write('POST',{scope:'@site',revision:1})).res.status,200);
  const home=await page('/');
  assert.ok(home.body.includes('google-seo-test'));
  console.log('PASS: global search verification is rendered after publish.');

  const templateSaved=await write('PUT',{scope:'/policies/[kind]',revision:0,
    settings:{title:'Shared Policy SEO Metadata',robots:{index:false},sitemap:{include:false}}});
  assert.equal(templateSaved.res.status,200,templateSaved.body);
  assert.equal((await write('POST',{scope:'/policies/[kind]',revision:1})).res.status,200);
  const termsTemplate=await page('/policies/terms');
  assert.equal(termsTemplate.res.status,200);
  assert.ok(termsTemplate.body.includes('Shared Policy SEO Metadata'));
  assert.ok(termsTemplate.body.includes('noindex'));
  assert.ok(!(await get(origin+'/sitemap.xml')).body.includes('https://niqaha.com/policies/terms'));
  const exactDraft=await write('PUT',{scope:'/policies/terms',revision:0,
    settings:{title:'Specific Terms SEO',robots:{index:true},sitemap:{include:true}}});
  assert.equal(exactDraft.res.status,200,exactDraft.body);
  assert.ok((await page('/policies/terms')).body.includes('Shared Policy SEO Metadata'),
    'An unpublished specific draft must not hide a live template');
  assert.equal((await write('POST',{scope:'/policies/terms',revision:1})).res.status,200);
  assert.ok((await page('/policies/terms')).body.includes('Specific Terms SEO'));
  assert.ok((await get(origin+'/sitemap.xml')).body.includes('https://niqaha.com/policies/terms'));
  console.log('PASS: policy template noindex, per-URL override and inherited sitemap rules.');

  const chromePaths=['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'];
  const chrome=chromePaths.find(fs.existsSync);
  let puppeteer;
  try{puppeteer=require(path.resolve(root,'../backend/node_modules/puppeteer'));}catch{}
  if(chrome&&puppeteer){
    browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
    const tab=await browser.newPage();
    await tab.setCookie({name:'access_token',value:'smoke-admin',url:origin,httpOnly:true});
    await tab.goto(origin+'/dashboard/seo',{waitUntil:'domcontentloaded',timeout:30000});
    await tab.waitForFunction(()=>document.body.textContent.includes('Every page. Every detail.'),{timeout:20000});
    await tab.waitForFunction(()=>document.querySelector('button')!==null,{timeout:10000});
    await tab.evaluate(()=>{
      const target=[...document.querySelectorAll('button')].find(b=>b.textContent?.includes('/about'));
      if(!target)throw Error('About page not present in admin SEO catalog');
      target.click();
    });
    await tab.waitForFunction(()=>document.body.textContent.includes('Selected SEO configuration'),{timeout:10000});
    await tab.waitForFunction(()=>{
      const label=[...document.querySelectorAll('label')].find(x=>x.textContent?.includes('Meta title'));
      return label?.querySelector('input')?.value!==undefined;
    },{timeout:10000});
    const value=await tab.evaluate(()=>[...document.querySelectorAll('label')]
      .find(x=>x.textContent?.includes('Meta title'))?.querySelector('input')?.value);
    assert.ok(value!==undefined);
    await tab.waitForFunction(()=>document.body.textContent.includes('Revision 2'),{timeout:15000});
    console.log('PASS: Chrome admin SEO studio lists pages and loads saved settings.');
    await tab.evaluate(()=>{
      const input=[...document.querySelectorAll('label')]
        .find(x=>x.textContent?.includes('Meta title'))?.querySelector('input');
      if(!input)throw Error('Title editor input not found');
      input.focus();
    });
    await tab.keyboard.type('Edited directly in Chrome SEO manager');
    await tab.waitForFunction(()=>[...document.querySelectorAll('button')]
      .some(b=>b.textContent?.includes('Save draft')&&!b.disabled),{timeout:10000});
    await tab.evaluate(()=>{
      const button=[...document.querySelectorAll('button')].find(b=>
        b.textContent?.includes('Save draft')&&!b.disabled);
      if(!button)throw Error('Save draft button unavailable');
      button.click();
    });
    await tab.waitForFunction(()=>document.body.textContent.includes('Draft saved to MongoDB'),{timeout:15000});
    assert.equal(configs.get('/about').draft.title,'Edited directly in Chrome SEO manager');
    tab.on('dialog',async dialog=>dialog.accept());
    await tab.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent?.trim()==='Publish'&&!b.disabled),{timeout:12000});
    await tab.evaluate(()=>{
      const button=[...document.querySelectorAll('button')].find(b=>
        b.textContent?.trim()==='Publish'&&!b.disabled);
      if(!button)throw Error('Publish button unavailable: '+JSON.stringify([...document.querySelectorAll('button')].filter(b=>b.textContent?.includes('Publish')).map(b=>({text:b.textContent,disabled:b.disabled})))+' :: '+document.body.textContent.slice(-500));
      button.click();
    });
    await tab.waitForFunction(()=>document.body.textContent.includes('Published!'),{timeout:15000});
    assert.ok((await page('/about')).body.includes('Edited directly in Chrome SEO manager'));
    console.log('PASS: Chrome save draft and publish change actual HTML metadata.');

    await tab.evaluate(()=>{
      const button=[...document.querySelectorAll('button')].find(b=>
        b.textContent?.includes('Restore original defaults'));
      if(!button)throw Error('Reset to defaults missing');
      button.click();
    });
    await tab.evaluate(()=>{
      const button=[...document.querySelectorAll('button')].find(b=>
        b.textContent?.includes('Save draft')&&!b.disabled);
      if(!button)throw Error('Reset save button missing');
      button.click();
    });
    await tab.waitForFunction(()=>document.body.textContent.includes('Draft saved to MongoDB'),{timeout:15000});
    await tab.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent?.trim()==='Publish'&&!b.disabled),{timeout:12000});
    await tab.evaluate(()=>{
      const button=[...document.querySelectorAll('button')].find(b=>
        b.textContent?.trim()==='Publish'&&!b.disabled);
      if(!button)throw Error('Reset publish missing');
      button.click();
    });
    await tab.waitForFunction(()=>document.body.textContent.includes('Published!'),{timeout:15000});
    const restored=await page('/about');
    assert.ok(restored.body.includes('আমাদের সম্পর্কে | Niqaha.com'));
    assert.ok(!restored.body.includes('Edited directly in Chrome SEO manager'));
    console.log('PASS: Chrome reset + publish restores original coded metadata.');
  }else console.log('INFO: Chrome UI test skipped (Puppeteer/Chrome unavailable).');
}finally{
  if(browser)await browser.close().catch(()=>{});
  if(next)next.kill();
  await new Promise(resolve=>backend.close(resolve));
}
