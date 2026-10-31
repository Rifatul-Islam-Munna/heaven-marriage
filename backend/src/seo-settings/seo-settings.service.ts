import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

export type SeoSettings = {
  title?: string; description?: string; keywords?: string[];
  canonical?: string; author?: string; siteName?: string;
  robots?: {index?:boolean;follow?:boolean;noarchive?:boolean;nosnippet?:boolean;noimageindex?:boolean;maxSnippet?:number;maxImagePreview?:'none'|'standard'|'large'};
  openGraph?: {title?:string;description?:string;image?:string;imageAlt?:string;type?:'website'|'article';locale?:string};
  twitter?: {title?:string;description?:string;image?:string;card?:'summary'|'summary_large_image';site?:string;creator?:string};
  languages?: Record<string,string>;structuredData?:string;
  verification?:{google?:string;bing?:string};
  sitemap?:{include?:boolean;changeFrequency?:'always'|'hourly'|'daily'|'weekly'|'monthly'|'yearly'|'never';priority?:number};
};
export type SeoRecord = {scope:string;draft:SeoSettings;published:SeoSettings;revision:number;updatedAt?:Date;publishedAt?:Date};

export function normalizeSeoScope(value:unknown):string {
  if(value==='@site')return '@site';
  if(typeof value!=='string'||value.length>1250)throw new BadRequestException('Invalid SEO page');
  const scope=value==='/'?'/':value.replace(/\/$/,'');
  const segments=scope.slice(1).split('/').filter(Boolean);
  if(!scope.startsWith('/')||scope.startsWith('//')||segments.length>12||
    /^\/(?:api|_next)(?:\/|$)/.test(scope))
    throw new BadRequestException('Invalid SEO page path');
  for(const segment of segments){
    if(/^\[[a-zA-Z][a-zA-Z0-9_]*\]$/.test(segment))continue;
    if(!/^(?:[a-zA-Z0-9_-]|%[a-fA-F0-9]{2})+$/.test(segment))
      throw new BadRequestException('Invalid SEO URL segment');
    let decoded:string;
    try{decoded=decodeURIComponent(segment);}catch{throw new BadRequestException('Invalid URL encoding');}
    if(!decoded||/[/\\?#\x00-\x1f]/.test(decoded)||decoded==='.'||decoded==='..'||
      !/^[\p{L}\p{M}\p{N}_-]+$/u.test(decoded))
      throw new BadRequestException('Invalid SEO URL characters');
  }
  return scope;
}
const obj=(value:unknown,label:string):Record<string,unknown>=>{
  if(value===undefined||value===null)return {};
  if(typeof value!=='object'||Array.isArray(value))throw new BadRequestException('Invalid '+label);
  return value as Record<string,unknown>;
};
const str=(value:unknown,name:string,max=180):string|undefined=>{
  if(value===undefined||value===null||value==='')return;
  if(typeof value!=='string'||value.length>max)throw new BadRequestException('Invalid '+name);
  return value.trim()||undefined;
};
const bool=(value:unknown,name:string):boolean|undefined=>{
  if(value===undefined)return;
  if(typeof value!=='boolean')throw new BadRequestException('Invalid '+name);
  return value;
};
const url=(value:unknown,name:string):string|undefined=>{
  const v=str(value,name,2048);
  if(!v)return;
  if(v.startsWith('/')&&!v.startsWith('//')&&!/[\s<>"'\\]/.test(v))return v;
  try{
    const u=new URL(v);
    if(u.protocol!=='https:'||u.username||u.password||u.hash)throw Error();
    return u.toString();
  }catch{throw new BadRequestException('Invalid '+name+' URL (HTTPS or relative path required)');}
};
export function validateSeoSettings(input:unknown):SeoSettings {
  const s=obj(input,'SEO settings'),result:SeoSettings={};
  for(const k of ['title','description','author','siteName'] as const){
    const v=str(s[k],k,k==='description'?500:180);
    if(v)result[k]=v;
  }
  if(s.canonical!==undefined){
    const canonical=url(s.canonical,'canonical');
    if(canonical?.startsWith('https://')&&new URL(canonical).hostname!=='niqaha.com')
      throw new BadRequestException('Canonical URL must stay on niqaha.com');
    if(canonical)result.canonical=canonical;
  }
  if(s.keywords!==undefined){
    if(!Array.isArray(s.keywords)||s.keywords.length>30)
      throw new BadRequestException('Keywords must be a list');
    result.keywords=s.keywords.map(v=>str(v,'keyword',80)).filter((x):x is string=>!!x);
  }
  if(s.robots!==undefined){
    const r=obj(s.robots,'robots'),out:NonNullable<SeoSettings['robots']>={};
    for(const k of ['index','follow','noarchive','nosnippet','noimageindex'] as const){
      const v=bool(r[k],'robots '+k);if(v!==undefined)out[k]=v;
    }
    if(r.maxSnippet!==undefined){
      const n=Number(r.maxSnippet);
      if(!Number.isInteger(n)||n< -1||n>10000)throw new BadRequestException('Invalid snippet limit');
      out.maxSnippet=n;
    }
    if(r.maxImagePreview!==undefined){
      if(!['none','standard','large'].includes(String(r.maxImagePreview)))
        throw new BadRequestException('Invalid image preview');
      out.maxImagePreview=r.maxImagePreview as 'none'|'standard'|'large';
    }
    result.robots=out;
  }
  if(s.openGraph!==undefined){
    const o=obj(s.openGraph,'Open Graph'),out:NonNullable<SeoSettings['openGraph']>={};
    for(const k of ['title','description','imageAlt','locale'] as const){
      const v=str(o[k],'OG '+k,k==='description'?500:300);if(v)out[k]=v;
    }
    const image=url(o.image,'OG image');if(image)out.image=image;
    if(o.type!==undefined){
      if(!['website','article'].includes(String(o.type)))throw new BadRequestException('Invalid OG type');
      out.type=o.type as 'website'|'article';
    }
    result.openGraph=out;
  }
  if(s.twitter!==undefined){
    const t=obj(s.twitter,'social preview'),out:NonNullable<SeoSettings['twitter']>={};
    for(const k of ['title','description','site','creator'] as const){
      const v=str(t[k],'social '+k,k==='description'?500:180);if(v)out[k]=v;
    }
    const image=url(t.image,'social image');if(image)out.image=image;
    if(t.card!==undefined){
      if(!['summary','summary_large_image'].includes(String(t.card)))
        throw new BadRequestException('Invalid social card');
      out.card=t.card as 'summary'|'summary_large_image';
    }
    result.twitter=out;
  }
  if(s.languages!==undefined){
    const languages=obj(s.languages,'hreflang'),out:Record<string,string>={};
    if(Object.keys(languages).length>25)throw new BadRequestException('Too many languages');
    for(const [key,value]of Object.entries(languages)){
      if(!/^(?:[a-z]{2,3}(?:-[a-zA-Z]{2,4})?|x-default)$/.test(key))
        throw new BadRequestException('Invalid language code');
      const href=url(value,'hreflang');if(href)out[key]=href;
    }
    result.languages=out;
  }
  if(s.structuredData!==undefined&&s.structuredData!==''){
    const value=str(s.structuredData,'structured data',20000);
    if(value){
      let parsed:unknown;
      try{parsed=JSON.parse(value);}catch{throw new BadRequestException('Structured data must be valid JSON');}
      const nodes=Array.isArray(parsed)?parsed:[parsed];
      if(!nodes.length||nodes.length>30||nodes.some(node=>!node||typeof node!=='object'||Array.isArray(node)))
        throw new BadRequestException('Structured data needs JSON-LD objects');
      for(const node of nodes){
        const context=(node as Record<string,unknown>)['@context'];
        if(context!==undefined&&!['https://schema.org','http://schema.org'].includes(String(context)))
          throw new BadRequestException('Structured data must use schema.org');
      }
      result.structuredData=JSON.stringify(parsed);
    }
  }
  if(s.verification!==undefined){
    const v=obj(s.verification,'verification'),out:NonNullable<SeoSettings['verification']>={};
    for(const k of ['google','bing'] as const){const x=str(v[k],k+' verification',150);if(x)out[k]=x;}
    result.verification=out;
  }
  if(s.sitemap!==undefined){
    const v=obj(s.sitemap,'sitemap'),out:NonNullable<SeoSettings['sitemap']>={};
    const include=bool(v.include,'sitemap inclusion');if(include!==undefined)out.include=include;
    if(v.priority!==undefined){
      const n=Number(v.priority);
      if(!Number.isFinite(n)||n<0||n>1)throw new BadRequestException('Sitemap priority must be 0 to 1');
      out.priority=n;
    }
    if(v.changeFrequency!==undefined){
      if(!['always','hourly','daily','weekly','monthly','yearly','never'].includes(String(v.changeFrequency)))
        throw new BadRequestException('Invalid change frequency');
      out.changeFrequency=v.changeFrequency as typeof out.changeFrequency;
    }
    result.sitemap=out;
  }
  if(JSON.stringify(result).length>29000)throw new BadRequestException('SEO data too large');
  return result;
}
const equal=(a:unknown,b:unknown)=>JSON.stringify(a??{})===JSON.stringify(b??{});
@Injectable()
export class SeoSettingsService implements OnModuleInit {
  constructor(@InjectConnection()private readonly db:Connection){}
  private get collection(){return this.db.collection<SeoRecord>('seo_page_settings');}
  async onModuleInit(){await this.collection.createIndex({scope:1},{unique:true,name:'unique_seo_scope'});}
  private find(scope:string){return this.collection.findOne({scope});}
  async publicPage(path:unknown,template?:unknown){
    const scope=normalizeSeoScope(path);
    const fallback=typeof template==='string'&&template!==scope?normalizeSeoScope(template):null;
    if(fallback&&(!fallback.includes('[')||fallback.split('/').length!==scope.split('/').length))
      throw new BadRequestException('Invalid SEO route template');
    const [exact,parent,site]=await Promise.all([
      this.find(scope),fallback?this.find(fallback):Promise.resolve(null),this.find('@site'),
    ]);
    // A newly saved draft has published: {}. It must not shadow a live
    // template before the admin actually publishes an override.
    const settings=exact?.published&&Object.keys(exact.published).length
      ?exact.published:parent?.published??{};
    return {scope,settings,site:site?.published??{}};
  }
  async publicSitemap(){
    const records=await this.collection.find({scope:{$ne:'@site'}},{
      projection:{scope:1,published:1,publishedAt:1},
    }).limit(2000).toArray();
    return records.filter(v=>v.published&&Object.keys(v.published).length)
      .map(v=>({path:v.scope,settings:v.published,updatedAt:v.publishedAt??null}));
  }
  async adminPage(path:unknown){
    const scope=normalizeSeoScope(path),item=await this.find(scope);
    return {scope,draft:item?.draft??{},published:item?.published??{},
      revision:item?.revision??0,updatedAt:item?.updatedAt??null,publishedAt:item?.publishedAt??null,
      hasUnpublishedChanges:!equal(item?.draft,item?.published)};
  }
  async list(){
    const docs=await this.collection.find({},{
      projection:{scope:1,draft:1,published:1,revision:1,updatedAt:1,publishedAt:1},
    }).sort({updatedAt:-1}).limit(500).toArray();
    return docs.map(v=>({scope:v.scope,revision:v.revision,
      hasUnpublishedChanges:!equal(v.draft,v.published),
      published:!!v.publishedAt,updatedAt:v.updatedAt??null}));
  }
  async save(actorId:string,data:unknown){
    const body=obj(data,'SEO draft'),scope=normalizeSeoScope(body.scope);
    const revision=Number(body.revision);
    if(!Number.isSafeInteger(revision)||revision<0)throw new BadRequestException('Invalid revision');
    const draft=validateSeoSettings(body.settings);
    try{
      const result=await this.collection.updateOne(
        {scope,revision},
        {$set:{draft,revision:revision+1,updatedAt:new Date()},$setOnInsert:{scope,published:{}}},
        {upsert:revision===0},
      );
      if(!result.matchedCount&&!result.upsertedCount)throw new ConflictException('SEO changed in another tab; refresh.');
    }catch(error:any){
      if(error?.code===11000)throw new ConflictException('SEO changed in another tab; refresh.');
      throw error;
    }
    await this.audit(actorId,scope,'draft.save');
    return this.adminPage(scope);
  }
  async publish(actorId:string,data:unknown){
    const body=obj(data,'SEO publish'),scope=normalizeSeoScope(body.scope);
    const revision=Number(body.revision);
    if(!Number.isSafeInteger(revision)||revision<0)throw new BadRequestException('Invalid revision');
    const found=await this.find(scope);
    if(!found)throw new NotFoundException('Save a draft first');
    if(found.revision!==revision)throw new ConflictException('SEO changed; refresh.');
    const result=await this.collection.updateOne({scope,revision},
      [{$set:{published:{$ifNull:['$draft',{}]},publishedAt:'$$NOW'}}]);
    if(!result.matchedCount)throw new ConflictException('SEO changed; refresh.');
    await this.audit(actorId,scope,'publish');
    return this.adminPage(scope);
  }
  private async audit(actorId:string,scope:string,action:string){
    await this.db.collection('seo_settings_audit').insertOne({
      actorId,scope,action,createdAt:new Date(),
    });
  }
}
