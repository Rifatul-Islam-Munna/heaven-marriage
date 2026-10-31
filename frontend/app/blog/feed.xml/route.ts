import {blogListing} from '@/lib/blog-server';
export const dynamic='force-dynamic';
const escape=(value:string)=>value.replace(/[&<>"']/g,ch=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'
})[ch]||ch);
export async function GET(){
  const data=await blogListing({limit:24});
  const items=data.items.map(post=>{
    const url='https://niqaha.com/blog/'+encodeURIComponent(post.slug);
    return '<item><title>'+escape(post.title)+'</title>'+
      '<link>'+escape(url)+'</link><guid isPermaLink="true">'+escape(url)+'</guid>'+
      '<description>'+escape(post.excerpt)+'</description>'+
      '<pubDate>'+new Date(post.publishedAt).toUTCString()+'</pubDate>'+
      '<category>'+escape(post.category)+'</category></item>';
  }).join('');
  const xml='<?xml version="1.0" encoding="UTF-8"?>'+
    '<rss version="2.0"><channel>'+
    '<title>Niqaha Journal</title><link>https://niqaha.com/blog</link>'+
    '<description>Islamic marriage and family guidance</description>'+
    '<language>bn-BD</language>'+items+'</channel></rss>';
  return new Response(xml,{headers:{'Content-Type':'application/rss+xml; charset=utf-8',
    'Cache-Control':'no-store'}});
}
