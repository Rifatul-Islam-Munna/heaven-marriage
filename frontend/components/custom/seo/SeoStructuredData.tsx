import {getPublishedSeo,publicSeoJsonLd} from '@/lib/seo-settings-server';
import {isPrivateSeoPath} from '@/lib/seo-settings-types';

const asScript=(value:string)=>JSON.stringify(JSON.parse(value))
  .replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026')
  .replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');

export default async function SeoStructuredData({path}: {path:string}){
  if(isPrivateSeoPath(path))return null;
  const json=await publicSeoJsonLd(path);
  if(!json)return null;
  return <script id={'seo-jsonld-'+path.replace(/[^a-z0-9]/gi,'-')}
    type="application/ld+json" dangerouslySetInnerHTML={{__html:json}} />;
}
export async function SeoSiteStructuredData(){
  const config=await getPublishedSeo('/');
  const raw=config.site.structuredData;
  if(!raw)return null;
  try{return <script id="seo-site-jsonld" type="application/ld+json"
    dangerouslySetInnerHTML={{__html:asScript(raw)}}/>;}
  catch{return null;}
}
