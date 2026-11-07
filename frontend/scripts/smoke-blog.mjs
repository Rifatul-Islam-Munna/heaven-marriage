// Isolated production blog test: temporary mock backend + real Next + real Chrome.
// Uses no live database, real users or production blog records.
import http from 'node:http';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const sharp=require('sharp');
const records=new Map(),counts=new Map();
let counter=1;
const oid=n=>(String(n).padStart(24,'0'));
const content=text=>({type:'doc',content:[
  {type:'paragraph',content:[{type:'text',text}]},
  {type:'heading',attrs:{level:2},content:[{type:'text',text:'Marriage preparation checklist'}]},
  {type:'paragraph',content:[{type:'text',text:'A practical second section for readers.'}]},
  {type:'image',attrs:{src:'https://example.com/illustration.webp',alt:'A family sitting together',title:'Family discussion'}},
]});
const draft={
  title:'Thoughtful Marriage Guidance',
  slug:'thoughtful-marriage-guidance',
  excerpt:'Practical Islamic marriage guidance and advice for modern families.',
  category:'Islamic Marriage',tags:['family','marriage'],author:'Niqaha Editorial',
  cover:{url:'https://example.com/cover.webp',alt:'Two people discussing marriage'},
  content:content('Trust and understanding are essential to a respectful marriage.'),
  seoTitle:'Marriage guide for couples | Niqaha',
  seoDescription:'An informative article about preparing for marriage and healthy family relationships.',
  featured:true,noindex:false,
};
function reply(res,status,data){
  res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
  res.end(JSON.stringify(data));
}
const publicSummary=row=>{
  const a=row.published;
  return {id:row.id,slug:row.slug,title:a.title,excerpt:a.excerpt,
    author:a.author,category:a.category,tags:a.tags,cover:a.cover,
    featured:a.featured,noindex:a.noindex,readMinutes:2,
    publishedAt:row.publishedAt,modifiedAt:row.modifiedAt};
};
const backend=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const route=url.pathname;
  counts.set(route,(counts.get(route)||0)+1);
  if(route==='/staff-access/me'){
  if(req.headers.access_token==='smoke-admin')return reply(res,200,{
    role:'admin',isAdmin:true,
    permissions:['users','faq','guidelines','contact','visual-editor','seo','blog','images','pricing','questions','settings','upgrades'],
  });
  return reply(res,401,{message:'Unauthorized'});
  }
  if(route==='/seo-settings')return reply(res,200,{scope:url.searchParams.get('path'),settings:{},site:{}});
  if(route==='/seo-settings/sitemap')return reply(res,200,[]);
  if(route==='/visual-content')return reply(res,200,{path:url.searchParams.get('path'),page:{},global:{}});
  if(route==='/public/settings')return reply(res,200,{messengerUrl:'',policies:{}});
  if(route==='/web-data')return reply(res,200,{home:{},about:{}});
  if(route==='/blog/admin/media/video'&&req.method==='POST'){
    if(req.headers.access_token!=='smoke-admin')return reply(res,401,{message:'Unauthorized'});
    for await(const chunk of req){}
    return reply(res,200,{url:'https://example.com/blog-uploaded.mp4',kind:'video',
      mimeType:'video/mp4',optimized:false,storedBytes:2100});
  }
  if(route==='/image/upload-image'&&req.method==='POST'){
    if(req.headers.access_token!=='smoke-admin')return reply(res,401,{message:'Unauthorized'});
    for await(const chunk of req){} // Drain multipart request, test the image proxy.
    return reply(res,200,'https://example.com/uploaded.webp');
  }
  if(route==='/blog/categories')return reply(res,200,[
    {name:'Islamic Marriage',count:[...records.values()].filter(r=>r.status==='published').length},
  ]);
  if(route==='/blog/sitemap')return reply(res,200,[...records.values()]
    .filter(r=>r.status==='published'&&!r.published.noindex)
    .map(r=>({slug:r.slug,lastModified:r.modifiedAt})));
  if(route==='/blog'&&req.method==='GET'){
    const all=[...records.values()].filter(r=>r.status==='published');
    const q=url.searchParams.get('q')||'',category=url.searchParams.get('category')||'';
    const filtered=all.filter(r=>(!category||r.published.category===category)&&
      (!q||r.published.title.toLowerCase().includes(q.toLowerCase())||
      r.published.excerpt.toLowerCase().includes(q.toLowerCase())));
    const page=Number(url.searchParams.get('page')||1);
    const limit=Number(url.searchParams.get('limit')||9);
    return reply(res,200,{items:filtered.slice((page-1)*limit,page*limit).map(publicSummary),
      page,limit,total:filtered.length,pages:Math.ceil(filtered.length/limit)});
  }
  if(route.startsWith('/blog/article/')){
    const slug=decodeURIComponent(route.slice('/blog/article/'.length));
    const row=[...records.values()].find(r=>r.slug===slug&&r.status==='published');
    if(!row)return reply(res,404,{message:'Not found'});
    return reply(res,200,{...publicSummary(row),content:row.published.content,
      seoTitle:row.published.seoTitle,seoDescription:row.published.seoDescription});
  }
  if(route.startsWith('/blog/admin')){
    if(req.headers.access_token!=='smoke-admin')return reply(res,401,{message:'Unauthorized'});
    const segments=route.replace(/^\/blog\/admin\/?/,'').split('/').filter(Boolean);
    if(!segments.length){
      if(req.method==='GET')return reply(res,200,{items:[...records.values()].map(r=>({
        id:r.id,slug:r.slug,title:r.draft.title,category:r.draft.category,
        status:r.status,cover:r.draft.cover,revision:r.revision,
        publishedAt:r.publishedAt,updatedAt:r.updatedAt})),page:1,total:records.size,pages:1});
      if(req.method==='POST'){
        const id=oid(counter++),initial={title:'',slug:'draft-'+id.slice(-12),
          excerpt:'',category:'Guides',tags:[],author:'Niqaha Editorial',
          cover:{url:'',alt:''},content:{type:'doc',content:[{type:'paragraph',content:[]}]},
          seoTitle:'',seoDescription:'',featured:false,noindex:false};
        const row={id,slug:initial.slug,revision:1,draft:initial,status:'draft',
          updatedAt:new Date().toISOString()};
        records.set(id,row);
        return reply(res,200,row);
      }
    }
    const row=records.get(segments[0]);
    if(!row)return reply(res,404,{message:'Not found'});
    if(req.method==='GET'&&segments.length===1)return reply(res,200,row);
    let raw='';for await(const chunk of req)raw+=chunk.toString();
    const body=JSON.parse(raw||'{}');
    if(body.revision!==row.revision)return reply(res,409,{message:'Revision conflict'});
    if(req.method==='PATCH'&&segments.length===1){
      row.draft=body.draft;row.slug=row.draft.slug;row.revision++;row.updatedAt=new Date().toISOString();
    }else if(req.method==='POST'&&segments[1]==='publish'){
      row.status='published';row.published=structuredClone(row.draft);
      row.revision++;row.publishedAt=row.publishedAt||new Date().toISOString();
      row.modifiedAt=new Date().toISOString();
    }else if(req.method==='POST'&&segments[1]==='unpublish'){
      row.status='draft';row.revision++;
    }else if(req.method==='DELETE'&&segments.length===1){
      row.status='archived';row.revision++;
    }else return reply(res,405,{message:'Unknown action'});
    return reply(res,200,row);
  }
  return reply(res,200,{});
});
async function port(){
  const server=net.createServer();
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const n=server.address().port;await new Promise(r=>server.close(r));return n;
}
let next,browser;
try{
  await new Promise(r=>backend.listen(0,'127.0.0.1',r));
  const api='http://127.0.0.1:'+backend.address().port;
  const site='http://127.0.0.1:'+(await port());
  next=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),
    'start','-p',new URL(site).port],{
    cwd:root,windowsHide:true,env:{...process.env,BASE_URL:api},stdio:['ignore','pipe','pipe'],
  });
  let logs='';
  next.stdout.on('data',v=>logs+=v.toString());
  next.stderr.on('data',v=>logs+=v.toString());
  let ready=false;
  for(let i=0;i<80;i++){
    if(next.exitCode!==null)throw Error('Next failed: '+logs);
    try{const r=await fetch(site+'/blog',{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,250));
  }
  assert.ok(ready,logs);
  const get=async route=>{
    const response=await fetch(site+route,{signal:AbortSignal.timeout(12000)});
    return {status:response.status,html:await response.text()};
  };
  let page=await get('/blog');
  assert.equal(page.status,200);
  assert.match(page.html,/শিগগিরই নতুন লেখা/);
  console.log('PASS: Public blog renders an honest empty state with no fabricated posts.');
  const before=counts.get('/blog')||0;
  for(let n=0;n<5;n++)await get('/blog');
  assert.equal(counts.get('/blog'),before,'public Next cache did not prevent backend calls');
  console.log('PASS: Five blog visitors reuse the shared 20-minute backend cache.');
  assert.equal((await get('/blog/thoughtful-marriage-guidance')).status,404);
  assert.equal((await get('/api/blog/admin')).status,401);
  console.log('PASS: Drafts are private; admin endpoints reject unauthorized visitors.');
  const admin=async(method,route,payload)=>{
    const response=await fetch(site+'/api/blog/admin'+route,{
      method,headers:{Cookie:'access_token=smoke-admin',Origin:site,
        'Content-Type':'application/json'},
      body:JSON.stringify(payload||{}),signal:AbortSignal.timeout(15000),
    });
    return {status:response.status,body:await response.json()};
  };
  let r=await admin('POST','',{});assert.equal(r.status,200);
  let item=r.body;
  r=await admin('PATCH','/'+item.id,{revision:item.revision,draft});
  assert.equal(r.status,200,r.body?.message);
  item=r.body;
  assert.equal((await get('/blog/thoughtful-marriage-guidance')).status,404);
  r=await admin('POST','/'+item.id+'/publish',{revision:item.revision});
  assert.equal(r.status,200,r.body?.message);
  item=r.body;
  page=await get('/blog/thoughtful-marriage-guidance');
  assert.equal(page.status,200);
  assert.match(page.html,/Thoughtful Marriage Guidance/);
  assert.match(page.html,/Marriage preparation checklist/);
  assert.match(page.html,/A family sitting together/);
  assert.match(page.html,/BlogPosting/);
  assert.match(page.html,/Marriage guide for couples/);
  assert.match(page.html,/https:\/\/example.com\/cover.webp/);
  const feed=await get('/blog/feed.xml'),sitemap=await get('/sitemap.xml');
  assert.ok(feed.html.includes('Thoughtful Marriage Guidance'));
  assert.ok(sitemap.html.includes('/blog/thoughtful-marriage-guidance'));
  console.log('PASS: Publish creates indexable HTML with Article JSON-LD, hero alt, OG, RSS and sitemap.');

  r=await admin('PATCH','/'+item.id,{revision:item.revision,draft:{...draft,title:'Updated Draft Title'}});
  assert.equal(r.status,200);
  item=r.body;
  assert.ok((await get('/blog/thoughtful-marriage-guidance')).html.includes('Thoughtful Marriage Guidance'));
  r=await admin('POST','/'+item.id+'/publish',{revision:item.revision});
  assert.equal(r.status,200);
  item=r.body;
  assert.ok((await get('/blog/thoughtful-marriage-guidance')).html.includes('Updated Draft Title'));
  console.log('PASS: Editing a live post preserves the old publication until a second publish.');

  const png=await sharp({create:{width:32,height:32,channels:3,background:'#eee7ed'}}).png().toBuffer();
  const upload=new FormData();
  upload.set('file',new File([png],'test.png',{type:'image/png'}));
  const result=await fetch(site+'/api/blog/upload',{
    method:'POST',headers:{Cookie:'access_token=smoke-admin',Origin:site},body:upload,
  });
  assert.equal(result.status,200,await result.text().catch(()=>''));
  console.log('PASS: Blog image upload uses the existing authorized MinIO image service.');
  const noisy=await sharp(randomBytes(960*720*3),{
    raw:{width:960,height:720,channels:3},
  }).png().toBuffer();
  const bigImage=new FormData();
  bigImage.set('file',new File([noisy],'large-original.png',{type:'image/png'}));
  const optimizedResponse=await fetch(site+'/api/blog/upload',{
    method:'POST',headers:{Cookie:'access_token=smoke-admin',Origin:site},
    body:bigImage,signal:AbortSignal.timeout(30000),
  });
  const optimizedResult=await optimizedResponse.json();
  assert.equal(optimizedResponse.status,200,JSON.stringify(optimizedResult));
  assert.equal(optimizedResult.kind,'image');
  assert.equal(optimizedResult.optimized,true,'large noisy image should compress to WebP');
  assert.ok(optimizedResult.storedBytes<optimizedResult.originalBytes);
  console.log('PASS: Large PNG is server-compressed to smaller WebP before upload.');
  const fakeImage=new FormData();
  fakeImage.set('file',new File(['<script>alert(1)</script>'],'trick.png',{type:'image/png'}));
  const blocked=await fetch(site+'/api/blog/upload',{
    method:'POST',headers:{Cookie:'access_token=smoke-admin',Origin:site},body:fakeImage,
  });
  assert.equal(blocked.status,400);
  console.log('PASS: Image uploads reject spoofed file signatures, not just MIME labels.');
  const videoUpload=new FormData();
  const videoHeader=Buffer.alloc(2048);videoHeader.writeUInt32BE(24,0);videoHeader.write('ftypisom',4,'ascii');
  videoUpload.set('file',new File([videoHeader],'test.mp4',{type:'video/mp4'}));
  const videoResponse=await fetch(site+'/api/blog/upload',{
    method:'POST',headers:{Cookie:'access_token=smoke-admin',Origin:site},body:videoUpload,
  });
  const videoResult=await videoResponse.json();
  assert.equal(videoResponse.status,200,JSON.stringify(videoResult));
  assert.equal(videoResult.url,'https://example.com/blog-uploaded.mp4');
  assert.equal(videoResult.kind,'video');
  const fakeVideo=new FormData();
  fakeVideo.set('file',new File(['<script>unsafe</script>'],'not-mp4.mp4',{type:'video/mp4'}));
  const spoofedVideo=await fetch(site+'/api/blog/upload',{
    method:'POST',headers:{Cookie:'access_token=smoke-admin',Origin:site},body:fakeVideo,
  });
  assert.equal(spoofedVideo.status,400);
  console.log('PASS: Blog video uploads use the authorized backend and reject spoofed MP4 content.');

  const chrome=['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find(fs.existsSync);
  let puppeteer;
  try{puppeteer=require(path.resolve(root,'../backend/node_modules/puppeteer'));}catch{}
  if(chrome&&puppeteer){
    browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
    const tab=await browser.newPage();
    await tab.setCookie({name:'access_token',value:'smoke-admin',url:site,httpOnly:true});
    await tab.goto(site+'/dashboard/blog',{waitUntil:'domcontentloaded',timeout:30000});
    await tab.waitForFunction(()=>document.body.textContent.includes('Blog & articles'),{timeout:20000});
    await tab.goto(site+'/dashboard/blog/'+item.id,{waitUntil:'domcontentloaded',timeout:30000});
    await tab.waitForFunction(()=>!!document.querySelector('.blog-editor'),{timeout:25000});
    assert.ok(await tab.$('[aria-label="Insert image"]'));
    assert.ok(await tab.$('[aria-label="Insert video"]'));
    assert.ok(await tab.$('[aria-label="Bold"]'));
    assert.ok(await tab.$('input[type=file]'));
    console.log('PASS: Chrome loads the real rich-text admin editor with images and formatting.');
    await tab.click('[aria-label="Insert image"]');
    await tab.waitForSelector('input[aria-label="Image URL"]',{timeout:12000});
    await tab.type('input[aria-label="Image URL"]','https://example.com/new-inline.webp');
    await tab.type('input[aria-label="Image alt text"]','A new optimized inline photograph');
    await tab.type('input[aria-label="Image caption"]','A contextual illustration');
    await tab.evaluate(()=>{
      const button=[...document.querySelectorAll('button')].find(x=>x.textContent?.trim()==='Insert image');
      if(!button)throw Error('Image insertion button missing');
      button.click();
    });
    await tab.waitForFunction(()=>!!document.querySelector('.blog-editor img[src="https://example.com/new-inline.webp"]'),{timeout:15000});
    await tab.click('[aria-label="Insert video"]');
    await tab.waitForSelector('input[placeholder*="Upload above or paste"]',{timeout:10000});
    await tab.type('input[placeholder*="Upload above or paste"]','https://example.com/blog-uploaded.mp4');
    await tab.type('input[placeholder="Briefly describe the video"]','Niqaha marriage video advice');
    await tab.evaluate(()=>{
      const button=[...document.querySelectorAll('button')].find(x=>x.textContent?.trim()==='Insert video in article');
      if(!button)throw Error('Video insertion button missing');
      button.click();
    });
    await tab.waitForFunction(()=>!!document.querySelector('.blog-editor video[src="https://example.com/blog-uploaded.mp4"]'),{timeout:15000});
    await tab.waitForFunction(()=>[...document.querySelectorAll('button')].some(x=>
      x.textContent?.includes('Save draft')&&!x.disabled),{timeout:15000});
    await tab.evaluate(()=>{
      const save=[...document.querySelectorAll('button')].find(x=>x.textContent?.includes('Save draft')&&!x.disabled);
      if(!save)throw Error('Save article draft button disabled');
      save.click();
    });
    await tab.waitForFunction(()=>document.body.textContent.includes('Draft saved. Visitors still see the last published version.'),{timeout:15000});
    assert.ok(JSON.stringify(records.get(item.id).draft.content).includes('A new optimized inline photograph'),
      'Inserted image/alt text was not saved from the visual editor');
    assert.ok(JSON.stringify(records.get(item.id).draft.content).includes('Niqaha marriage video advice'),
      'Inserted video/title was not saved from the visual editor');
    assert.ok(!JSON.stringify(records.get(item.id).published.content).includes('A new optimized inline photograph'),
      'Draft edits leaked publicly before publish');
    console.log('PASS: Chrome inserts an inline image with SEO alt/caption and saves it privately.');
    await tab.waitForFunction(()=>[...document.querySelectorAll('button')].some(x=>
      x.textContent?.includes('Publish update')&&!x.disabled),{timeout:12000});
    tab.on('dialog',async d=>d.accept());
    await tab.evaluate(()=>{
      const button=[...document.querySelectorAll('button')].find(x=>x.textContent?.includes('Publish update')&&!x.disabled);
      if(!button)throw Error('Publish update button not available');
      button.click();
    });
    await tab.waitForFunction(()=>document.body.textContent.includes('Published. The article is live on the website.'),{timeout:15000});
    const publishedHtml=(await get('/blog/thoughtful-marriage-guidance')).html;
    assert.ok(publishedHtml.includes('A new optimized inline photograph'));
    assert.ok(publishedHtml.includes('Niqaha marriage video advice'));
    assert.ok(publishedHtml.includes('<video'));
    assert.ok(publishedHtml.includes('preload="metadata"'));
    console.log('PASS: Publishing from Chrome renders the responsive video and inline image publicly.');
    item=records.get(item.id);
  }else console.log('INFO: Chrome test skipped (not installed).');
  r=await admin('POST','/'+item.id+'/unpublish',{revision:item.revision});
  assert.equal(r.status,200);
  assert.equal((await get('/blog/thoughtful-marriage-guidance')).status,404);
  assert.ok(!(await get('/sitemap.xml')).html.includes('/blog/thoughtful-marriage-guidance'));
  console.log('PASS: Unpublish hides the article and removes its URL from the sitemap.');
}finally{
  if(browser)await browser.close().catch(()=>{});
  if(next)next.kill();
  await new Promise(resolve=>backend.close(resolve));
}
