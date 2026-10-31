import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { blogDate, publicBlogPath, type BlogCard as BlogCardType } from "@/lib/blog-types";

export default function BlogCard({
  post,
  featured = false,
}: {
  post: BlogCardType;
  featured?: boolean;
}) {
  const href = publicBlogPath(post.slug) as Route;
  const coverUrl = post.cover.url?.trim();

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg",
        featured && "md:grid md:grid-cols-2",
      )}
    >
      <Link
        href={href}
        aria-label={post.title}
        className={cn(
          "relative block aspect-[16/10] overflow-hidden bg-primary/5",
          featured && "md:aspect-auto md:min-h-80",
        )}
      >
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={post.cover.alt || post.title}
            unoptimized
            fill
            sizes={
              featured
                ? "(max-width: 768px) 100vw, 560px"
                : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 360px"
            }
            priority={featured}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-primary/70">
            <BookOpen size={44} strokeWidth={1.5} />
            <span className="font-heading text-2xl font-semibold">Niqaha</span>
          </div>
        )}
      </Link>

      <div className={cn("flex flex-col p-5 sm:p-6", featured && "md:justify-center md:p-9")}>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <Badge variant="secondary">{post.category}</Badge>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={14} aria-hidden="true" />
            {post.readMinutes} মিনিটে পড়ুন
          </span>
        </div>
        <h3
          className={cn(
            "mt-4 font-heading text-2xl font-bold leading-snug text-foreground",
            featured && "text-3xl md:text-4xl",
          )}
        >
          <Link href={href} className="transition-colors hover:text-primary">
            {post.title}
          </Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-7 text-muted-foreground">
          {post.excerpt}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6 text-sm">
          <time dateTime={post.publishedAt} className="text-muted-foreground">
            {blogDate(post.publishedAt)}
          </time>
          <Link
            href={href}
            aria-label={`${post.title} পড়ুন`}
            className="inline-flex items-center gap-1.5 font-semibold text-primary transition-colors hover:text-primary/80"
          >
            বিস্তারিত পড়ুন <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
