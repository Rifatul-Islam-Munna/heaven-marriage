import 'server-only';
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
const cachedPost=unstable_cache(async(base:string,slug:string):Promise<BlogPost|null>=>{
  try{return await backend('/blog/article/'+encodeURIComponent(slug)) as BlogPost;}
  catch{return null;}
},['blog-published-one-v1'],{revalidate:TWENTY_MINUTES,tags:[BLOG_CACHE_TAG]});
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
  if(!process.env.BASE_URL)return null;
  return cachedPost(process.env.BASE_URL,slug);
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
