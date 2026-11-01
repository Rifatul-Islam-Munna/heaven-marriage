import type {Route} from 'next';
import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft,ArrowRight,BookOpen,CalendarDays,ChevronDown,ChevronRight,Clock3,Heart} from 'lucide-react';
import {blogArticle,relatedBlogPosts} from '@/lib/blog-server';
import {blogDate,publicBlogPath} from '@/lib/blog-types';
import {publicMetadata} from '@/lib/seo';
import {seoMetadata} from '@/lib/seo-settings-server';
import SeoStructuredData from '@/components/custom/seo/SeoStructuredData';
import BlogContent,{articleHeadings} from '@/components/custom/blog/BlogContent';
import BlogCard from '@/components/custom/blog/BlogCard';
import ShareArticle from '@/components/custom/blog/ShareArticle';

export const dynamic='force-dynamic';
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {slug}=await params,post=await blogArticle(slug);
  if(!post)return {title:'নিবন্ধ পাওয়া যায়নি | Niqaha',robots:{index:false,follow:false}};
  const path=publicBlogPath(post.slug);
  const base=publicMetadata(post.seoTitle||post.title,
    post.seoDescription||post.excerpt,path);
  const enhanced:Metadata={...base,openGraph:{
    type:'article',url:'https://niqaha.com'+path,
    title:post.seoTitle||post.title,description:post.seoDescription||post.excerpt,
    locale:'bn_BD',siteName:'Niqaha.com',
    publishedTime:post.publishedAt,modifiedTime:post.modifiedAt,
    authors:[post.author],
    images:post.cover.url?[{url:post.cover.url,alt:post.cover.alt,width:1200,height:630}]:base.openGraph?.images,
  },twitter:{card:'summary_large_image',title:post.seoTitle||post.title,
    description:post.seoDescription||post.excerpt,
    images:[post.cover.url||'/opengraph-image']},
    ...(post.noindex?{robots:{index:false,follow:false}}:{})};
  const metadata=await seoMetadata(path,enhanced);
  if(post.noindex)metadata.robots={index:false,follow:false};
  return metadata;
}

export default async function BlogArticlePage({params}:Props){
  const {slug}=await params,post=await blogArticle(slug);
  if(!post)notFound();
  const related=await relatedBlogPosts(post);
  const headings=articleHeadings(post.content);
  const path=publicBlogPath(post.slug);
  const schema={
    '@context':'https://schema.org','@type':'BlogPosting',
    headline:post.title,description:post.excerpt,
    image:post.cover.url?[post.cover.url]:undefined,
    datePublished:post.publishedAt,dateModified:post.modifiedAt,
    inLanguage:'bn-BD',
    mainEntityOfPage:{'@type':'WebPage','@id':'https://niqaha.com'+path},
    author:{'@type':'Person',name:post.author},
    publisher:{'@type':'Organization',name:'Niqaha.com',
      logo:{'@type':'ImageObject',url:'https://niqaha.com/logo.png'}},
  };
  const breadcrumb={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
    {'@type':'ListItem',position:1,name:'Home',item:'https://niqaha.com'},
    {'@type':'ListItem',position:2,name:'Blog',item:'https://niqaha.com/blog'},
    {'@type':'ListItem',position:3,name:post.title,item:'https://niqaha.com'+path},
  ]};
  return <main className="min-h-screen bg-background text-foreground">
    <SeoStructuredData path={path}/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{
      __html:JSON.stringify([schema,breadcrumb]).replace(/</g,'\\u003c')}}/>

    <section className="relative overflow-hidden border-b border-pink-100 bg-gradient-to-br from-pink-50 via-purple-50/30 to-background">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-16 size-72 rounded-full bg-pink-200/25 blur-3xl"/>
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-0 size-80 rounded-full bg-purple-200/25 blur-3xl"/>
      <div className="container relative mx-auto max-w-6xl px-4 pb-14 pt-8 sm:px-6 md:pb-20 md:pt-12">
        <nav aria-label="ব্রেডক্রাম্ব" className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
          <Link href="/" className="shrink-0 transition-colors hover:text-primary">হোম</Link>
          <ChevronRight size={14} className="shrink-0" aria-hidden/>
          <Link href="/blog" className="shrink-0 transition-colors hover:text-primary">ব্লগ</Link>
          <ChevronRight size={14} className="shrink-0" aria-hidden/>
          <span aria-current="page" className="min-w-0 truncate font-medium text-foreground">{post.title}</span>
        </nav>
        <div className="mx-auto mt-9 max-w-4xl text-center md:mt-11">
          <Link href={('/blog?category='+encodeURIComponent(post.category)) as Route}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-pink-100 bg-pink-100 px-4 py-1.5 text-sm font-semibold text-pink-700 transition-colors hover:border-pink-200 hover:bg-pink-200/70">
            <Heart size={15} fill="currentColor" aria-hidden/>{post.category}
          </Link>
          <h1 className="mt-5 break-words font-heading text-3xl font-bold leading-[1.35] tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
            {post.title}
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg md:leading-9">
            {post.excerpt}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[13px] font-medium text-muted-foreground sm:text-sm">
            <span className="font-bold text-foreground">{post.author}</span>
            <time dateTime={post.publishedAt} className="inline-flex items-center gap-1.5">
              <CalendarDays size={16} className="text-pink-600" aria-hidden/>{blogDate(post.publishedAt)}
            </time>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={16} className="text-pink-600" aria-hidden/>{post.readMinutes} মিনিটে পড়ুন
            </span>
            <ShareArticle title={post.title}/>
          </div>
        </div>
      </div>
    </section>

    <div className="container mx-auto max-w-6xl px-4 pb-16 sm:px-6 md:pb-24">
      {post.cover.url&&<figure className="relative -mt-7 overflow-hidden rounded-2xl border-4 border-white bg-pink-50 shadow-[0_18px_55px_rgba(157,52,102,0.12)] sm:-mt-9 sm:rounded-3xl">
        <Image unoptimized priority width={1400} height={840} src={post.cover.url} alt={post.cover.alt}
          sizes="(max-width: 768px) 100vw, 1152px" className="max-h-[560px] w-full object-cover"/>
        <figcaption className="sr-only">{post.cover.alt}</figcaption>
      </figure>}

      <div className={`grid items-start gap-9 lg:grid-cols-[minmax(0,1fr)_265px] lg:gap-14 ${post.cover.url?'mt-9 md:mt-12':'mt-12'}`}>
        <article className="min-w-0">
          {headings.length>0&&<details className="group mb-8 rounded-2xl border border-pink-100 bg-pink-50/50 p-4 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              <BookOpen size={17} className="text-pink-600" aria-hidden/> এই লেখায়
              <ChevronDown size={17} className="ml-auto text-pink-600 transition-transform group-open:rotate-180" aria-hidden/>
            </summary>
            <ol className="mt-4 space-y-3 border-t border-pink-100 pt-4">
              {headings.map(item=><li key={item.id} style={{paddingLeft:(item.level-2)*12}}>
                <a href={'#'+item.id} className="block text-sm leading-6 text-muted-foreground hover:text-primary">{item.text}</a>
              </li>)}
            </ol>
          </details>}
          <BlogContent document={post.content}/>
          {post.tags.length>0&&<div className="mt-10 flex flex-wrap items-center gap-2 border-t border-pink-100 pt-6">
            <span className="mr-1 text-sm font-semibold text-foreground">বিষয়:</span>
            {post.tags.map(tag=><Link key={tag} href={('/blog?q='+encodeURIComponent(tag)) as Route}
              className="rounded-full border border-pink-100 bg-pink-50 px-3.5 py-1.5 text-xs font-semibold text-pink-700 transition-colors hover:border-pink-300 hover:bg-pink-100">
              #{tag}
            </Link>)}
          </div>}
          <div className="mt-9 flex flex-col items-start justify-between gap-5 rounded-3xl border border-pink-100 bg-gradient-to-r from-pink-50 via-purple-50/30 to-white p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <span className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-pink-600">
                <Heart size={14} fill="currentColor" aria-hidden/> Niqaha ব্লগ
              </span>
              <h2 className="font-heading text-2xl font-bold leading-snug text-foreground">আরও পড়তে চান?</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">বিবাহ, পরিবার ও সম্পর্ক নিয়ে আরও প্রয়োজনীয় লেখা পড়ুন।</p>
            </div>
            <Link href="/blog" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-pink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              সব লেখা <ArrowRight size={16} aria-hidden/>
            </Link>
          </div>
        </article>

        {headings.length>0&&<aside className="hidden lg:block">
          <nav aria-label="Article table of contents" className="sticky top-28 rounded-2xl border border-pink-100 bg-white p-5 shadow-[0_8px_35px_rgba(157,52,102,0.06)]">
            <h2 className="mb-4 flex items-center gap-2 border-b border-pink-100 pb-3 text-sm font-bold text-foreground">
              <BookOpen size={17} className="text-pink-600" aria-hidden/> এই লেখায়
            </h2>
            <ol className="space-y-3">
              {headings.map(item=><li key={item.id} style={{paddingLeft:(item.level-2)*12}}>
                <a href={'#'+item.id} className="block text-[13px] leading-6 text-muted-foreground transition-colors hover:text-primary">
                  {item.text}
                </a>
              </li>)}
            </ol>
          </nav>
        </aside>}
      </div>

      {related.length>0&&<section aria-labelledby="related" className="mt-16 border-t border-pink-100 pt-10 md:mt-20 md:pt-12">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 inline-flex items-center gap-2 text-xs font-bold text-pink-600">
              <Heart size={14} fill="currentColor" aria-hidden/> আরও আবিষ্কার করুন
            </p>
            <h2 id="related" className="font-heading text-3xl font-bold leading-snug text-foreground sm:text-4xl">আরও কিছু লেখা</h2>
          </div>
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-pink-700">
            সব ব্লগ দেখুন <ArrowRight size={16} aria-hidden/>
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {related.map(item=><BlogCard key={item.id} post={item}/>)}
        </div>
      </section>}
      <div className="mt-10">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeft size={16} aria-hidden/> ব্লগে ফিরে যান
        </Link>
      </div>
    </div>
  </main>;
}
