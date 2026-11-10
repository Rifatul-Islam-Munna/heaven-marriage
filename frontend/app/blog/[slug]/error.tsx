'use client';

import Link from 'next/link';
import {RefreshCw} from 'lucide-react';

/** A temporary API failure must never be reported as a missing publication. */
export default function BlogArticleError({reset}:{error:Error & {digest?:string};reset:()=>void}){
  return <main className="container mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
    <h1 className="font-heading text-3xl font-bold">এই মুহূর্তে লেখাটি দেখানো যাচ্ছে না</h1>
    <p className="mt-4 leading-7 text-muted-foreground">
      সার্ভারের সঙ্গে সাময়িক সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।
    </p>
    <div className="mt-7 flex flex-wrap justify-center gap-3">
      <button type="button" onClick={reset}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90">
        <RefreshCw size={16} aria-hidden/> আবার চেষ্টা করুন
      </button>
      <Link href="/blog" className="inline-flex min-h-11 items-center rounded-full border border-pink-200 px-5 py-2 text-sm font-semibold text-primary hover:bg-pink-50">
        সব ব্লগ দেখুন
      </Link>
    </div>
  </main>;
}
