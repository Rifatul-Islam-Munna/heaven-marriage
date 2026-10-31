import type {Route} from 'next';
import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,BookOpen,ChevronRight,Search} from 'lucide-react';
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
  const s=new URLSearchParams();
  if(page>1)s.set('page',String(page));
  if(category)s.set('category',category);
  if(q)s.set('q',q);
  return '/blog'+(s.size?'?'+s:'');
};
export default async function BlogIndex({searchParams}:Params){
  const params=await searchParams;
  const page=Math.max(1,Math.min(10000,Number(params.page)||1));
  const category=(params.category||'').slice(0,90),q=(params.q||'').slice(0,90);
  const [listing,categories]=await Promise.all([blogListing({page,category,q,limit:9}),blogCategories()]);
  const highlight=page===1&&!category&&!q?listing.items.find(item=>item.featured)||listing.items[0]:null;
  const posts=highlight?listing.items.filter(item=>item.id!==highlight.id):listing.items;
  const collectionLd={'@context':'https://schema.org','@type':'Blog',
    name:'Niqaha Journal',url:'https://niqaha.com/blog',inLanguage:'bn-BD',
    description:'Islamic marriage and family insights',
    blogPost:listing.items.map(item=>({'@type':'BlogPosting',headline:item.title,
      url:'https://niqaha.com/blog/'+encodeURIComponent(item.slug),datePublished:item.publishedAt}))};
  const filterClass=(active:boolean)=>cn(
    'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    active?'border-primary bg-primary text-primary-foreground':'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary',
  );
  return <main className="min-h-screen bg-background text-foreground">
    <SeoStructuredData path="/blog"/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{
      __html:JSON.stringify(collectionLd).replace(/</g,'\\u003c')}}/>
    <section className="relative overflow-hidden border-b border-border bg-primary/5">
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-28 size-72 rounded-full border-[36px] border-primary/5" />
      <div className="container relative mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 md:pb-16 md:pt-10">
        <nav aria-label="ব্রেডক্রাম্ব" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary">হোম</Link>
          <ChevronRight size={15} aria-hidden="true" />
          <span aria-current="page" className="text-foreground">ব্লগ</span>
        </nav>
        <div className="mt-10 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            <BookOpen size={16} aria-hidden="true" /> Niqaha ব্লগ
          </span>
          <h1 className="mt-5 font-heading text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
            বিবাহ, সম্পর্ক ও পরিবার নিয়ে জানুন
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
            ইসলামী দৃষ্টিভঙ্গিতে জীবনসঙ্গী নির্বাচন, বায়োডাটা ও পরিবার নিয়ে ব্যবহারিক লেখা পড়ুন।
          </p>
          <p className="mt-6 text-sm font-medium text-primary">{listing.total} টি প্রকাশিত লেখা</p>
        </div>
      </div>
    </section>
    <div className="container mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6 md:py-14">
      {highlight&&<section aria-labelledby="featured-blog">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          <h2 id="featured-blog" className="font-heading text-2xl font-bold">বিশেষ লেখা</h2>
        </div>
        <BlogCard post={highlight} featured/>
      </section>}
      <section aria-labelledby="latest-blog">
        <div className="mb-7 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">নিয়মিত পড়ুন</p>
            <h2 id="latest-blog" className="mt-1 font-heading text-3xl font-bold sm:text-4xl">সর্বশেষ লেখা</h2>
          </div>
          <form action="/blog" method="get" role="search" className="flex w-full gap-2 sm:max-w-md">
            {category&&<input type="hidden" name="category" value={category}/>}
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">ব্লগ খুঁজুন</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} aria-hidden="true"/>
              <Input type="search" name="q" defaultValue={q} maxLength={90} placeholder="ব্লগে খুঁজুন" className="h-10 pl-10"/>
            </label>
            <Button type="submit" className="h-10 px-4">খুঁজুন</Button>
          </form>
        </div>
        <nav aria-label="ব্লগ ক্যাটাগরি" className="mb-8 flex flex-wrap gap-2">
          <Link href={pathFor(1,'',q) as Route} aria-current={!category?'page':undefined} className={filterClass(!category)}>সব লেখা</Link>
          {categories.map(item=><Link key={item.name} href={pathFor(1,item.name,q) as Route}
            aria-current={category===item.name?'page':undefined} className={filterClass(category===item.name)}>
            {item.name} <span className="opacity-70">({item.count})</span></Link>)}
        </nav>
        {posts.length?<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{posts.map(post=><BlogCard key={post.id} post={post}/>)}</div>:
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
            <BookOpen className="mx-auto mb-4 text-primary/50" size={40} aria-hidden="true"/>
            <h3 className="font-heading text-2xl font-bold">{highlight?'আরও লেখা শিগগিরই আসছে':listing.total?'এই অনুসন্ধানে কোনো লেখা পাওয়া যায়নি':'শিগগিরই নতুন লেখা প্রকাশিত হবে'}</h3>
            <p className="mt-2 text-sm text-muted-foreground">নতুন লেখা প্রকাশিত হলে এখানে দেখতে পাবেন।</p>
            {(category||q)&&<Button variant="outline" asChild className="mt-5"><Link href="/blog">সব লেখা দেখুন</Link></Button>}
          </div>}
        {listing.pages>1&&<nav aria-label="ব্লগ পেজ" className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {page>1&&<Button variant="outline" asChild><Link href={pathFor(page-1,category,q) as Route}><ArrowLeft size={16} aria-hidden="true"/>পূর্ববর্তী</Link></Button>}
          <span className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground">{page} / {listing.pages}</span>
          {page<listing.pages&&<Button variant="outline" asChild><Link href={pathFor(page+1,category,q) as Route}>পরবর্তী<ArrowRight size={16} aria-hidden="true"/></Link></Button>}
        </nav>}
      </section>
    </div>
  </main>;
}
