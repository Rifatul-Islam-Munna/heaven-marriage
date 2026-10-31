import Link from "next/link";
import { publicMetadata } from "@/lib/seo";
import { seoMetadata } from '@/lib/seo-settings-server';
import SeoStructuredData from '@/components/custom/seo/SeoStructuredData';
const defaultMetadata = publicMetadata(
  "Premium Marriage Assistance | Niqaha.com",
  "Niqaha.com-এর প্রিমিয়াম বিবাহ সহায়তা সেবার আবেদন প্রক্রিয়া ও ফি।",
  "/premium",
);
export const dynamic='force-dynamic';
export async function generateMetadata(){return seoMetadata('/premium',defaultMetadata);}
export default function Premium() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <SeoStructuredData path="/premium" />
      <h1 className="text-3xl font-bold text-pink-700">
        Premium Marriage Assistance
      </h1>
      <p className="mt-5">
        সাধারণ বায়োডাটা জমা দেওয়া বিনামূল্যে। প্রিমিয়াম সেবার রেজিস্ট্রেশন ফি
        ৳১,০০০।
      </p>
      <ol className="list-decimal pl-6 space-y-3 mt-5">
        <li>একই বায়োডাটা ফর্ম সম্পন্ন করে জমা দিন।</li>
        <li>ড্যাশবোর্ড থেকে Premium Upgrade Request পাঠান।</li>
        <li>Niqaha.com টিম যোগাযোগ করে তথ্য যাচাই করবে।</li>
        <li>
          টিমের নির্দেশনায় পেমেন্টের শর্ত ও ফেরত নীতিমালা দেখে পেমেন্ট করুন।
        </li>
        <li>পেমেন্ট নিশ্চিত হলে সেবার অবস্থা ড্যাশবোর্ডে দেখুন।</li>
      </ol>
      <p className="mt-5">
        সেবার নির্দিষ্ট সুবিধা, মেয়াদ ও ফেরতের শর্ত টিমের কাছ থেকে নিশ্চিত
        করুন। প্রিমিয়াম সদস্যপদ আলাদাভাবে যাচাইয়ের বিকল্প নয়।
      </p>
      <a
        href="tel:+8801748919251"
        className="block mt-5 text-pink-600 underline"
      >
        সেবার বিস্তারিত জানতে কল করুন: 01748919251
      </a>
      <Link
        href="/profile"
        className="inline-block mt-6 rounded bg-pink-600 px-5 py-3 text-white"
      >
        ড্যাশবোর্ডে আবেদন করুন
      </Link>
    </main>
  );
}
