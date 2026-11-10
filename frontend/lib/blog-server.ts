import 'server-only';
import {cache} from 'react';
import {unstable_cache} from 'next/cache';
import type {BlogList,BlogPost,BlogCard,BlogCategory} from './blog-types';

export const BLOG_CACHE_TAG='blog-published-v1';
const TWENTY_MINUTES=1200;
const emptyList:BlogList={items:[],total:0,page:1,pages:0,limit:9};
async function backend(path:string){
  if(!process.env.BASE_URL)throw Error('Blog backend unavailable');
  const response=await fetch(process.env.BASE_URL.replace(/\/$/,'')+path,
    {cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Blog backend returned '+response.status);
  return response.json();
}
const cachedList=unstable_cache(async(base:string,page:number,category:string,q:string,limit:number):Promise<BlogList>=>{
  const query=new URLSearchParams({page:String(page),limit:String(limit)});
  if(category)query.set('category',category);
  if(q)query.set('q',q);
  return backend('/blog?'+query.toString());
},['blog-published-list-v1'],{revalidate:TWENTY_MINUTES,tags:[BLOG_CACHE_TAG]});
// Do not cache a missing article: editors can publish a slug that was requested before
// publication. A cached 404 would keep that published URL broken for visitors.
// React cache deduplicates metadata/page reads within one request only.
const currentPost=cache(async(slug:string):Promise<BlogPost|null>=>{
  const base=process.env.BASE_URL;
  if(!base)throw Error('Blog backend unavailable');
  let decoded=slug;
  // Next can supply either the Unicode slug or its URL-encoded representation.
  // Handle one or two encoded layers without changing the canonical public URL.
  for(let i=0;i<2&&/%[0-9a-f]{2}/i.test(decoded);i++){
    try{decoded=decodeURIComponent(decoded);}catch{return null;}
  }
  if(!decoded||decoded.length>200||/[\\/]/.test(decoded))return null;
  const response=await fetch(base.replace(/\/$/,'')+'/blog/article/'+encodeURIComponent(decoded),{
    cache:'no-store',signal:AbortSignal.timeout(8000),
  });
  if(response.status===404||response.status===400)return null;
  if(!response.ok)throw Error('Blog article backend returned '+response.status);
  return response.json() as Promise<BlogPost>;
});
const cachedCategories=unstable_cache(async(base:string):Promise<BlogCategory[]>=>{
  return backend('/blog/categories');
},['blog-categories-v1'],{revalidate:TWENTY_MINUTES,tags:[BLOG_CACHE_TAG]});
const cachedSitemap=unstable_cache(async(base:string):Promise<{slug:string;lastModified:string}[]>=>{
  return backend('/blog/sitemap');
},['blog-sitemap-v1'],{revalidate:TWENTY_MINUTES,tags:[BLOG_CACHE_TAG]});
export async function blogListing({page=1,category='',q='',limit=9}:{
  page?:number;category?:string;q?:string;limit?:number}={}):Promise<BlogList>{
  if(!process.env.BASE_URL)return emptyList;
  try{
    const item=await cachedList(process.env.BASE_URL,Math.max(1,Math.min(10000,page)),category.slice(0,90),
      q.slice(0,90),Math.max(1,Math.min(24,limit)));
    if(!Array.isArray(item?.items))return emptyList;
    return item;
  }catch{return emptyList;}
}
export async function blogArticle(slug:string):Promise<BlogPost|null>{
  return currentPost(slug);
}
export async function blogCategories():Promise<BlogCategory[]>{
  if(!process.env.BASE_URL)return [];
  try{const data=await cachedCategories(process.env.BASE_URL);return Array.isArray(data)?data:[];}
  catch{return [];}
}
export async function blogSitemap():Promise<{slug:string;lastModified:string}[]>{
  if(!process.env.BASE_URL)return [];
  try{const data=await cachedSitemap(process.env.BASE_URL);return Array.isArray(data)?data:[];}
  catch{return [];}
}
export async function relatedBlogPosts(post:BlogPost):Promise<BlogCard[]>{
  const collection=await blogListing({category:post.category,limit:8});
  return collection.items.filter(item=>item.slug!==post.slug).slice(0,3);
}
