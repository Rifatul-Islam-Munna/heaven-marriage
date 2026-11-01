import type {MetadataRoute} from 'next';
import {getSitemapOverrides,seoTemplate} from '@/lib/seo-settings-server';
import {blogSitemap} from '@/lib/blog-server';
import {SITE_ORIGIN,isPrivateSeoPath} from '@/lib/seo-settings-types';
import {visualPageCatalog} from '@/lib/visual-page-catalog';

export const dynamic='force-dynamic';
const original=['/','/about','/biodata','/contact','/faq',
  '/guidelines','/pricing','/premium','/blog','/policies/terms',
  '/policies/refund','/policies/privacy'];
const known=new Set(visualPageCatalog.filter(p=>!p.dynamic).map(p=>p.path));
for(const policy of ['/policies/terms','/policies/privacy','/policies/refund'])known.add(policy);

/** True when the admin switched premium off; on any error keep the page listed. */
async function premiumHidden():Promise<boolean>{
  const base=process.env.BASE_URL;
  if(!base)return false;
  try{
    const r=await fetch(base.replace(/\/$/,'')+'/public/settings',{cache:'no-store',signal:AbortSignal.timeout(5000)});
    if(!r.ok)return false;
    const s=await r.json() as {premium?:{visible?:boolean}};
    return s.premium?.visible===false;
  }catch{return false;}
}

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const [overrides,articles,hidePremium]=await Promise.all([getSitemapOverrides(),blogSitemap(),premiumHidden()]);
  const map=new Map(overrides.map(item=>[item.path,item]));
  const paths=new Set([...original,...overrides.filter(o=>o.settings.sitemap?.include===true).map(o=>o.path)]);
  if(hidePremium)paths.delete('/premium');
  const result:MetadataRoute.Sitemap=[];
  for(const path of paths){
    if(!known.has(path)||isPrivateSeoPath(path)||path.includes('['))continue;
    const exact=map.get(path),inherited=map.get(seoTemplate(path));
    const item=exact?.settings&&Object.keys(exact.settings).length?exact:inherited;
    const seo=item?.settings;
    if(seo?.sitemap?.include===false||seo?.robots?.index===false)continue;
    const canonical=seo?.canonical;
    const url=canonical
      ? canonical.startsWith('/')?SITE_ORIGIN+canonical:canonical
      : SITE_ORIGIN+(path==='/'?'':path);
    result.push({
      url,
      changeFrequency:seo?.sitemap?.changeFrequency||(path==='/'?'weekly':'monthly'),
      priority:seo?.sitemap?.priority??(path==='/'?1:0.7),
      ...(item?.updatedAt?{lastModified:new Date(item.updatedAt)}:{}),
    });
  }
  for(const article of articles){
    const path='/blog/'+encodeURIComponent(article.slug);
    const exact=map.get(path),inherited=map.get('/blog/[slug]');
    const value=exact?.settings&&Object.keys(exact.settings).length?exact:inherited;
    const settings=value?.settings;
    if(settings?.robots?.index===false||settings?.sitemap?.include===false)continue;
    const canonical=settings?.canonical;
    const url=canonical?(canonical.startsWith('/')?SITE_ORIGIN+canonical:canonical):SITE_ORIGIN+path;
    result.push({url,changeFrequency:settings?.sitemap?.changeFrequency||'monthly',
      priority:settings?.sitemap?.priority??0.65,
      ...(article.lastModified?{lastModified:new Date(article.lastModified)}:{})});
  }
  return result;
}
