import type {Route} from 'next';
import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,BookOpen,ChevronRight,Heart,Search} from 'lucide-react';
import {blogCategories,blogListing} from '@/lib/blog-server';
import BlogCard from '@/components/custom/blog/BlogCard';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {cn} from '@/lib/utils';
import {publicMetadata} from '@/lib/seo';
import {seoMetadata} from '@/lib/seo-settings-server';
import SeoStructuredData from '@/components/custom/seo/SeoStructuredData';

export const dynamic='force-dynamic';
const fallback=publicMetadata('ইসলামিক বিবাহ ও সম্পর্ক বিষয়ক ব্লগ | Niqaha',
  'ইসলামিক বিবাহ, বায়োডাটা, পরিবার ও জীবনসঙ্গী নির্বাচন বিষয়ে ব্যবহারিক ও তথ্যসমৃদ্ধ নিবন্ধ পড়ুন।','/blog');
export async function generateMetadata():Promise<Metadata>{return seoMetadata('/blog',fallback);}
type Params={searchParams:Promise<{page?:string;category?:string;q?:string}>};
const pathFor=(page:number,category:string,q:string)=>{
  const search=new URLSearchParams();
  if(page>1)search.set('page',String(page));
  if(category)search.set('category',category);
  if(q)search.set('q',q);
  return '/blog'+(search.size?'?'+search:'');
};

export default async function BlogIndex({searchParams}:Params){
  const params=await searchParams;
  const page=Math.max(1,Math.min(10000,Number(params.page)||1));
  const category=(params.category||'').slice(0,90);
  const q=(params.q||'').slice(0,90);
  const [listing,categories]=await Promise.all([blogListing({page,category,q,limit:9}),blogCategories()]);
  const highlight=page===1&&!category&&!q?listing.items.find(item=>item.featured)||listing.items[0]:null;
  const posts=highlight?listing.items.filter(item=>item.id!==highlight.id):listing.items;
  const collectionLd={'@context':'https://schema.org','@type':'Blog',
    name:'Niqaha Journal',url:'https://niqaha.com/blog',inLanguage:'bn-BD',
    description:'Islamic marriage and family insights',
    blogPost:listing.items.map(item=>({'@type':'BlogPosting',headline:item.title,
      url:'https://niqaha.com/blog/'+encodeURIComponent(item.slug),datePublished:item.publishedAt}))};
  const filterClass=(active:boolean)=>cn(
    'inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    active?'border-primary bg-primary text-white shadow-sm shadow-pink-300/30':
      'border-pink-100 bg-white text-muted-foreground hover:border-pink-300 hover:bg-pink-50 hover:text-primary',
  );
  return <main className="min-h-screen bg-gradient-to-b from-background via-pink-50/20 to-background text-foreground">
    <SeoStructuredData path="/blog"/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{
      __html:JSON.stringify(collectionLd).replace(/</g,'\\u003c')}}/>

    <section className="relative overflow-hidden border-b border-pink-100 bg-gradient-to-br from-pink-50 via-purple-50/30 to-background">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-8 size-72 rounded-full bg-pink-200/25 blur-3xl"/>
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 size-80 rounded-full bg-purple-200/25 blur-3xl"/>
      <div className="container relative mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 md:pb-24 md:pt-12">
        <nav aria-label="ব্রেডক্রাম্ব" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-primary">হোম</Link>
          <ChevronRight size={15} aria-hidden/>
          <span aria-current="page" className="font-medium text-foreground">ব্লগ</span>
        </nav>
        <div className="mx-auto mt-9 max-w-4xl text-center md:mt-11">
          <span className="inline-flex items-center gap-2 rounded-full border border-pink-100 bg-pink-100 px-4 py-2 text-sm font-semibold text-pink-700">
            <Heart size={16} fill="currentColor" aria-hidden/> Niqaha ব্লগ
          </span>
          <h1 className="mt-5 font-heading text-[2.2rem] font-bold leading-[1.5] tracking-tight text-foreground sm:text-[2.9rem] sm:leading-[1.4] md:text-[3.5rem]">
            বিবাহ, সম্পর্ক ও <span className="text-primary">পরিবার</span> নিয়ে জানুন
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
            ইসলামী দৃষ্টিভঙ্গিতে জীবনসঙ্গী নির্বাচন, বায়োডাটা ও পরিবার নিয়ে ব্যবহারিক লেখা পড়ুন।
          </p>
          <p className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-pink-700">
            <BookOpen size={16} aria-hidden/> {listing.total} টি প্রকাশিত লেখা
          </p>
        </div>
      </div>
    </section>

    <div className="container relative mx-auto max-w-6xl px-4 pb-16 sm:px-6 md:pb-24">
      <div className="-mt-9 rounded-3xl border border-pink-100 bg-white p-4 shadow-[0_16px_54px_rgba(157,52,102,0.08)] sm:p-6">
        <form action="/blog" method="get" role="search" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {category&&<input type="hidden" name="category" value={category}/>}
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">ব্লগ খুঁজুন</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-pink-500" size={19} aria-hidden/>
            <Input type="search" name="q" defaultValue={q} maxLength={90} placeholder="বিষয় বা শিরোনাম দিয়ে খুঁজুন..."
              className="h-12 rounded-xl border-pink-100 bg-pink-50/40 pl-12 text-sm shadow-none focus-visible:ring-primary/30"/>
          </label>
          <Button type="submit" className="h-12 rounded-xl bg-primary px-7 font-bold text-white hover:bg-pink-700 sm:w-auto">
            <Search size={17} aria-hidden/> খুঁজুন
          </Button>
        </form>
        <div className="mt-5 border-t border-pink-100 pt-4">
          <p className="mb-3 text-xs font-semibold text-muted-foreground">বিষয় অনুযায়ী পড়ুন</p>
          <nav aria-label="ব্লগ ক্যাটাগরি" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
            <Link href={pathFor(1,'',q) as Route} aria-current={!category?'page':undefined} className={filterClass(!category)}>
              সব লেখা
            </Link>
            {categories.map(item=><Link key={item.name} href={pathFor(1,item.name,q) as Route}
              aria-current={category===item.name?'page':undefined} className={filterClass(category===item.name)}>
              {item.name} <span className="opacity-70">({item.count})</span>
            </Link>)}
          </nav>
        </div>
      </div>

      {highlight&&<section aria-labelledby="featured-blog" className="mt-10 md:mt-12">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600">
            <Heart size={17} fill="currentColor" aria-hidden/>
          </span>
          <div className="flex min-w-0 flex-col gap-2.5">
            <p className="text-xs font-semibold leading-5 text-pink-600">আপনার জন্য বাছাই করা</p>
            <h2 id="featured-blog" className="font-heading text-2xl font-bold leading-[1.55] text-foreground sm:text-[1.75rem]">বিশেষ লেখা</h2>
          </div>
        </div>
        <BlogCard post={highlight} featured/>
      </section>}

      <section aria-labelledby="latest-blog" className="mt-10 md:mt-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2.5">
            <p className="text-xs font-bold leading-5 tracking-wide text-pink-600">নিয়মিত পড়ুন</p>
            <h2 id="latest-blog" className="break-words font-heading text-[1.75rem] font-bold leading-[1.55] text-foreground sm:text-[2rem]">
              {q?'অনুসন্ধানের ফলাফল':category?category:'সর্বশেষ লেখা'}
            </h2>
          </div>
          {(q||category)&&<Link href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-pink-700">
            সব লেখা দেখুন <ArrowRight size={16} aria-hidden/>
          </Link>}
        </div>

        {posts.length?<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map(post=><BlogCard key={post.id} post={post}/>)}
        </div>:<div className="rounded-3xl border border-dashed border-pink-200 bg-white px-5 py-12 text-center sm:px-8 sm:py-16">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-pink-50 text-pink-500">
            <BookOpen size={28} aria-hidden/>
          </div>
          <h3 className="mt-5 font-heading text-2xl font-bold leading-[1.6] text-foreground">
            {highlight?'আরও লেখা শিগগিরই আসছে':listing.total?'এই অনুসন্ধানে কোনো লেখা পাওয়া যায়নি':'শিগগিরই নতুন লেখা প্রকাশিত হবে'}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">
            নতুন লেখা প্রকাশিত হলে এখানে দেখতে পাবেন।
          </p>
          {(category||q)&&<Button variant="outline" asChild className="mt-5 rounded-full border-pink-200 text-primary hover:bg-pink-50">
            <Link href="/blog">সব লেখা দেখুন</Link>
          </Button>}
        </div>}

        {listing.pages>1&&<nav aria-label="ব্লগ পেজ" className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {page>1&&<Button variant="outline" asChild className="rounded-full border-pink-200 hover:bg-pink-50">
            <Link href={pathFor(page-1,category,q) as Route}><ArrowLeft size={16} aria-hidden/>পূর্ববর্তী</Link>
          </Button>}
          <span className="rounded-full bg-pink-50 px-4 py-2 text-sm font-semibold text-pink-700">{page} / {listing.pages}</span>
          {page<listing.pages&&<Button variant="outline" asChild className="rounded-full border-pink-200 hover:bg-pink-50">
            <Link href={pathFor(page+1,category,q) as Route}>পরবর্তী<ArrowRight size={16} aria-hidden/></Link>
          </Button>}
        </nav>}
      </section>
    </div>
  </main>;
}
