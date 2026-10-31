export type SeoSettings = {
  title?:string;description?:string;keywords?:string[];canonical?:string;
  author?:string;siteName?:string;
  robots?:{index?:boolean;follow?:boolean;noarchive?:boolean;nosnippet?:boolean;
    noimageindex?:boolean;maxSnippet?:number;maxImagePreview?:'none'|'standard'|'large'};
  openGraph?:{title?:string;description?:string;image?:string;imageAlt?:string;
    type?:'website'|'article';locale?:string};
  twitter?:{title?:string;description?:string;image?:string;card?:'summary'|'summary_large_image';
    site?:string;creator?:string};
  languages?:Record<string,string>;structuredData?:string;
  verification?:{google?:string;bing?:string};
  sitemap?:{include?:boolean;changeFrequency?:'always'|'hourly'|'daily'|
    'weekly'|'monthly'|'yearly'|'never';priority?:number};
};
export type SeoAdminDoc = {
  scope:string;revision:number;draft:SeoSettings;published:SeoSettings;
  updatedAt:string|null;publishedAt:string|null;hasUnpublishedChanges:boolean;
};
export type SeoPublicDoc = {scope:string;settings:SeoSettings;site:SeoSettings};
export type SeoListItem = {scope:string;revision:number;published:boolean;
  updatedAt:string|null;hasUnpublishedChanges:boolean};
export const SITE_ORIGIN='https://niqaha.com';
export function isPrivateSeoPath(path:string){
  return /^\/(?:dashboard|profile|payment|login|signup|otp|forgot)(?:\/|$)/.test(path)||
    /^\/biodata\/[^/]+$/.test(path);
}
export function validSeoPath(path:string){
  if(path==='@site')return true;
  if(path.length>1250||!path.startsWith('/')||path.startsWith('//')||
    /^\/(?:api|_next)(?:\/|$)/.test(path))return false;
  const segments=path.slice(1).split('/').filter(Boolean);
  if(segments.length>12||path!=='/'&&path.endsWith('/'))return false;
  for(const segment of segments){
    if(/^\[[a-zA-Z][a-zA-Z0-9_]*\]$/.test(segment))continue;
    if(!/^(?:[a-zA-Z0-9_-]|%[a-fA-F0-9]{2})+$/.test(segment))return false;
    try{
      const decoded=decodeURIComponent(segment);
      if(!decoded||/[/\\?#\x00-\x1f]/.test(decoded)||decoded==='.'||decoded==='..'||
        !/^[\p{L}\p{M}\p{N}_-]+$/u.test(decoded))return false;
    }catch{return false;}
  }
  return true;
}
