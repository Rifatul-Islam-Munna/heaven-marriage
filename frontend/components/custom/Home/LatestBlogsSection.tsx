import Link from "next/link";
import { ArrowUpRight, BookOpenText } from "lucide-react";
import BlogCard from "@/components/custom/blog/BlogCard";
import { blogListing } from "@/lib/blog-server";

/** Server-rendered published articles: readable by crawlers, not a client-only slider. */
export default async function LatestBlogsSection() {
  const listing = await blogListing({ page: 1, limit: 3 });
  const posts = listing.items.slice(0, 3);
  if (!posts.length) return null;

  const structuredList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Niqaha-এর সর্বশেষ ব্লগ",
    itemListElement: posts.map((post, index) => ({
      "@type": "ListItem", position: index + 1,
      item: {
        "@type": "BlogPosting",
        headline: post.title,
        url: "https://niqaha.com/blog/" + encodeURIComponent(post.slug),
        datePublished: post.publishedAt,
      },
    })),
  };

  return (
    <section aria-labelledby="home-latest-blogs"
      className="border-y border-pink-100 bg-white px-4 py-10 sm:px-6 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredList).replace(/</g, "\\u003c"),
      }} />
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-700">
              <BookOpenText size={15} aria-hidden /> পড়ুন ও জানুন
            </span>
            <h2 id="home-latest-blogs" className="mt-1 font-heading text-2xl font-bold text-gray-900 sm:text-3xl">
              সর্বশেষ ব্লগ
            </h2>
            <p className="mt-1 text-sm text-gray-600">বিবাহ, জীবনসঙ্গী নির্বাচন ও পরিবার নিয়ে নতুন লেখা</p>
          </div>
          <Link href="/blog" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-pink-200 px-4 py-2 text-sm font-bold text-pink-700 transition-colors hover:bg-pink-50">
            সব ব্লগ <ArrowUpRight size={16} aria-hidden />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map(post => <BlogCard key={post.id} post={post} />)}
        </div>
      </div>
    </section>
  );
}
