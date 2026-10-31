import 'server-only';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { publicMetadata,privateMetadata,SITE_URL } from '@/lib/seo';
import { visualPageCatalog } from '@/lib/visual-page-catalog';
import { isPrivateSeoPath,type SeoPublicDoc,type SeoSettings } from './seo-settings-types';

export const SEO_CACHE_TAG='seo-published-content-v1';
const interval=20*60;
const empty=(path:string):SeoPublicDoc=>({scope:path,settings:{},site:{}});
export function seoTemplate(path:string){
  const pieces=path.split('/');
  for(const entry of visualPageCatalog){
    if(!entry.dynamic)continue;
    const parts=entry.path.split('/');
    if(parts.length===pieces.length&&parts.every((item,i)=>
      (item.startsWith('[')&&item.endsWith(']'))||item===pieces[i]))return entry.path;
  }
  return '';
}
const cached=unstable_cache(async(path:string,template:string,base:string):Promise<SeoPublicDoc>=>{
  if(!base)return empty(path);
  const params=new URLSearchParams({path});
  if(template&&template!==path)params.set('template',template);
  const response=await fetch(base.replace(/\/$/,'')+'/seo-settings?'+params.toString(),{
    cache:'no-store',signal:AbortSignal.timeout(7000),
  });
  if(!response.ok)throw Error('SEO API unavailable');
  return response.json() as Promise<SeoPublicDoc>;
},['seo-content-v1'],{revalidate:interval,tags:[SEO_CACHE_TAG]});
const cachedSitemap=unstable_cache(async(base:string):Promise<{path:string;settings:SeoSettings;updatedAt:string|null}[]>=>{
  if(!base)return [];
  const response=await fetch(base.replace(/\/$/,'')+'/seo-settings/sitemap',{
    cache:'no-store',signal:AbortSignal.timeout(7000),
  });
  if(!response.ok)throw Error('SEO sitemap unavailable');
  return response.json();
},['seo-sitemap-v1'],{revalidate:interval,tags:[SEO_CACHE_TAG]});
export async function getPublishedSeo(path:string,template=seoTemplate(path)):Promise<SeoPublicDoc>{
  if(!process.env.BASE_URL)return empty(path);
  try{
    const data=await cached(path,template,process.env.BASE_URL);
    // Older backend versions and optional mock services might return {}.
    // Never let malformed SEO data interrupt rendering of an existing page.
    if(!data||typeof data!=='object')return empty(path);
    return {scope:path,
      settings:data.settings&&typeof data.settings==='object'&&!Array.isArray(data.settings)?data.settings:{},
      site:data.site&&typeof data.site==='object'&&!Array.isArray(data.site)?data.site:{},
    };
  }catch{return empty(path);}
}
export async function getSitemapOverrides(){
  if(!process.env.BASE_URL)return [];
  try{
    const data=await cachedSitemap(process.env.BASE_URL);
    return Array.isArray(data)?data.filter(item=>item&&typeof item.path==='string'&&item.settings&&typeof item.settings==='object'):[];
  }catch{return [];}
}
const absolute=(path:string)=>path.startsWith('/')?SITE_URL+path:path;
export function mergeSeoMetadata(path:string,fallback:Metadata,values:SeoPublicDoc):Metadata{
  const page=values.settings||{},site=values.site||{};
  const title=page.title||fallback.title||'Niqaha.com';
  const description=page.description||fallback.description||'Niqaha.com';
  const ogFallback=(fallback.openGraph as {images?:Array<{url:string|URL}>|string[]})?.images;
  const firstImage=Array.isArray(ogFallback)?ogFallback[0]:undefined;
  const originalImage=typeof firstImage==='string'?firstImage:
    firstImage&&typeof firstImage==='object'?String(firstImage.url):'/opengraph-image';
  // Each article's featured image should beat the site-wide default share
  // image. Explicit per-page overrides still win.
  const article=Boolean((fallback.openGraph as {type?:string})?.type==='article');
  const image=page.openGraph?.image||(article?originalImage:site.openGraph?.image||originalImage);
  const socialImage=page.twitter?.image||page.openGraph?.image||
    (article?originalImage:site.twitter?.image||site.openGraph?.image||originalImage);
  const merged:Metadata={
    ...fallback,
    metadataBase:new URL(SITE_URL),
    title,description,
    ...(page.keywords?.length?{keywords:page.keywords}:{}),
    ...(page.author?{authors:[{name:page.author}]}:{}),
    alternates:{
      ...(fallback.alternates||{}),
      canonical:page.canonical||fallback.alternates?.canonical||path,
      ...(page.languages&&Object.keys(page.languages).length?{languages:page.languages}:{}),
    },
    openGraph:{
      ...fallback.openGraph,
      type:page.openGraph?.type||(fallback.openGraph as {type?:'article'|'website'})?.type||'website',
      title:page.openGraph?.title||page.title||String(title),
      description:page.openGraph?.description||page.description||String(description),
      url:absolute(page.canonical||path),
      siteName:site.siteName||page.siteName||'Niqaha.com',
      locale:page.openGraph?.locale||'bn_BD',
      images:[{url:image,width:1200,height:630,
        alt:page.openGraph?.imageAlt||'Niqaha.com — Islamic Matrimony'}],
    },
    twitter:{
      ...fallback.twitter,
      card:page.twitter?.card||'summary_large_image',
      title:page.twitter?.title||page.openGraph?.title||page.title||String(title),
      description:page.twitter?.description||page.description||String(description),
      images:[socialImage],
      ...(page.twitter?.site?{site:page.twitter.site}:{}),
      ...(page.twitter?.creator?{creator:page.twitter.creator}:{}),
    },
    ...(site.verification?{verification:{
      ...(site.verification.google?{google:site.verification.google}:{}),
      ...(site.verification.bing?{other:{'msvalidate.01':site.verification.bing}}:{}),
    }}:{}),
    ...(page.robots?{robots:{
      ...page.robots,
      ...(page.robots.maxSnippet!==undefined?{'max-snippet':page.robots.maxSnippet}:{}),
      ...(page.robots.maxImagePreview?{'max-image-preview':page.robots.maxImagePreview}:{})
    }}:{}),
  };
  if(isPrivateSeoPath(path)){
    merged.robots=privateMetadata.robots;
    merged.openGraph=undefined;
    merged.twitter=undefined;
    merged.alternates=undefined;
  }
  return merged;
}
export async function seoMetadata(path:string,fallback:Metadata=publicMetadata('Niqaha.com','ইসলামিক ম্যাট্রিমনি।',path)){
  return mergeSeoMetadata(path,fallback,await getPublishedSeo(path));
}
export async function publicSeoJsonLd(path:string){
  if(isPrivateSeoPath(path))return null;
  const data=await getPublishedSeo(path),value=data.settings.structuredData;
  if(!value)return null;
  try{
    return JSON.stringify(JSON.parse(value))
      .replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
      .replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028')
      .replace(/\u2029/g,'\\u2029');
  }catch{return null;}
}
