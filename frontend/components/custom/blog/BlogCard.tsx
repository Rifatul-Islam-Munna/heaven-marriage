import type {Route} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpRight,Clock3,Heart} from 'lucide-react';
import {cn} from '@/lib/utils';
import {blogDate,publicBlogPath,type BlogCard as BlogCardType} from '@/lib/blog-types';

export default function BlogCard({post,featured=false}:{post:BlogCardType;featured?:boolean}){
  const href=publicBlogPath(post.slug) as Route;
  const cover=post.cover.url?.trim();
  return <article className={cn(
    'group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-pink-100/90 bg-white shadow-[0_8px_35px_rgba(157,52,102,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-[0_12px_32px_rgba(157,52,102,0.11)]',
    featured&&'mx-auto w-full md:grid md:min-h-[248px] md:max-w-[980px] md:grid-cols-[42%_58%] md:items-stretch',
  )}>
    <Link href={href} aria-label={post.title}
      className={cn('relative block aspect-[16/9] shrink-0 overflow-hidden bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary',
        featured&&'aspect-auto h-[190px] sm:h-[220px] md:h-full md:min-h-0')}>
      {cover?<Image src={cover} alt={post.cover.alt||post.title} unoptimized fill
        sizes={featured?'(max-width: 767px) 100vw, 52vw':'(max-width: 767px) 100vw, (max-width: 1200px) 50vw, 360px'}
        priority={featured} className="object-cover transition-transform duration-700 group-hover:scale-[1.045]"/>:
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-pink-600">
          <span className="flex size-16 items-center justify-center rounded-full border border-pink-200 bg-white/70 shadow-sm">
            <Heart size={28} className="fill-pink-500 text-pink-500" aria-hidden/>
          </span>
          <span className="font-heading text-3xl font-bold">niqaha</span>
        </div>}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent"/>
      {featured&&<span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/95 px-3.5 py-1.5 text-xs font-bold text-pink-700 shadow-sm backdrop-blur-sm">
        <Heart size={13} fill="currentColor" aria-hidden/> বিশেষ লেখা
      </span>}
    </Link>
    <div className={cn('flex min-w-0 flex-1 flex-col p-4 sm:p-5',featured&&'md:px-6 md:py-4 lg:px-7')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-muted-foreground">
        <span className="rounded-full border border-pink-100 bg-pink-50 px-3 py-1 text-pink-700">{post.category}</span>
        <span className="inline-flex items-center gap-1.5"><Clock3 size={14} aria-hidden/>{post.readMinutes} মিনিটে পড়ুন</span>
      </div>
      <h3 className={cn('mt-3 line-clamp-2 font-heading text-[1.35rem] font-bold leading-[1.5] tracking-tight text-foreground sm:text-[1.5rem]',
        featured&&'text-[1.45rem] sm:text-[1.6rem] md:text-[1.6rem] lg:text-[1.75rem]')}>
        <Link href={href} className="break-words transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-primary">
          {post.title}
        </Link>
      </h3>
      <p className={cn('mt-2 line-clamp-2 text-[13px] leading-6 text-muted-foreground',
        featured&&'text-[13px] leading-6 sm:text-[14px]')}>
        {post.excerpt}
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-4 md:pt-3">
        <time dateTime={post.publishedAt} className="text-xs font-medium text-muted-foreground">{blogDate(post.publishedAt)}</time>
        <Link href={href} aria-label={`${post.title} পড়ুন`}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:text-pink-700 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-primary">
          বিস্তারিত পড়ুন <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden/>
        </Link>
      </div>
    </div>
  </article>;
}
