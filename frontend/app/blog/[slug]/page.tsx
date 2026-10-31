import type {Route} from 'next';
import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft,ArrowRight,BookOpen,CalendarDays,Clock3,Home} from 'lucide-react';
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
  return <main className="min-h-screen bg-[#fdfaf9] text-[#372832]">
    <SeoStructuredData path={path}/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{
      __html:JSON.stringify([schema,breadcrumb]).replace(/</g,'\\u003c')}}/>
    <div className="relative overflow-hidden border-b border-rose-100 bg-gradient-to-br from-[#fff3f2] to-[#faf0f3]">
      <div className="mx-auto max-w-[1100px] px-5 pb-11 pt-10 md:px-8 md:pb-16 md:pt-14">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-[#987d8a]">
          <Link href="/" className="hover:text-rose-800">হোম</Link><span>/</span>
          <Link href="/blog" className="hover:text-rose-800">ব্লগ</Link><span>/</span>
          <span className="max-w-[280px] truncate text-rose-800">{post.category}</span>
        </nav>
        <div className="mt-9 flex flex-wrap items-center gap-2">
          <Link href={('/blog?category='+encodeURIComponent(post.category)) as Route}
            className="rounded-full border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-bold text-rose-700">{post.category}</Link>
          <span className="text-xs text-[#907783]">{post.readMinutes} মিনিটে পড়ুন</span>
        </div>
        <h1 className="mt-5 max-w-4xl font-serif text-4xl font-semibold leading-tight text-[#31222e] md:text-[3.45rem] md:leading-[1.19]">{post.title}</h1>
        <p className="mt-6 max-w-3xl text-base leading-8 text-[#75616e] md:text-lg">{post.excerpt}</p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-[#866d79]">
          <span className="font-bold text-[#47313b]">{post.author}</span>
          <time dateTime={post.publishedAt} className="inline-flex items-center gap-2"><CalendarDays size={15}/>{blogDate(post.publishedAt)}</time>
          <span className="inline-flex items-center gap-2"><Clock3 size={15}/>{post.readMinutes} মিনিট</span>
          <ShareArticle title={post.title}/>
        </div>
      </div>
    </div>
    <div className="mx-auto max-w-[1250px] px-5 py-10 md:px-8 md:py-14">
      {post.cover.url&&<figure className="mx-auto mb-12 max-w-[1050px] overflow-hidden rounded-[24px] border border-rose-100 bg-rose-50 shadow-[0_20px_70px_rgba(79,45,57,0.1)]">
        <Image unoptimized priority width={1400} height={800} src={post.cover.url} alt={post.cover.alt}
          sizes="(max-width: 768px) 100vw, 1050px" className="h-auto max-h-[620px] w-full object-cover"/>
        <figcaption className="sr-only">{post.cover.alt}</figcaption>
      </figure>}
      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_255px]">
        <article className="min-w-0 max-w-[790px]">
          <BlogContent document={post.content}/>
          <div className="mt-11 flex flex-wrap gap-2 border-t border-rose-100 pt-7">
            {post.tags.map(tag=><Link key={tag} href={('/blog?q='+encodeURIComponent(tag)) as Route}
              className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#765968]">#{tag}</Link>)}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#fff2f4] p-6">
            <div><p className="font-serif text-xl font-bold">আরও পড়তে চান?</p><p className="mt-1 text-sm text-[#8a7380]">নতুন ধারণা ও প্রয়োজনীয় পরামর্শ জানুন।</p></div>
            <Link href="/blog" className="inline-flex items-center gap-2 rounded-full bg-[#8c3953] px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-800">সব লেখা <ArrowRight size={16}/></Link>
          </div>
        </article>
        {headings.length>0&&<aside className="hidden lg:block">
          <nav aria-label="Article table of contents" className="sticky top-28 rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#895567]"><BookOpen size={15}/> এই লেখায়</h2>
            <ol className="space-y-3">{headings.map(item=><li key={item.id} style={{paddingLeft:(item.level-2)*11}}>
              <a href={'#'+item.id} className="block text-sm leading-6 text-[#77626c] hover:text-rose-700">{item.text}</a>
            </li>)}</ol>
          </nav>
        </aside>}
      </div>
      {related.length>0&&<section aria-labelledby="related" className="mt-20 border-t border-rose-100 pt-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-rose-700">Keep exploring</p>
            <h2 id="related" className="mt-2 font-serif text-3xl font-semibold">আরও কিছু লেখা</h2></div>
          <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-bold text-rose-700">সব ব্লগ দেখুন <ArrowRight size={16}/></Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{related.map(item=><BlogCard key={item.id} post={item}/>)}</div>
      </section>}
    </div>
  </main>;
}
