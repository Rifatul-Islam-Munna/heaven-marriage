"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Loader2, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Criterion = {
  key: string;
  label: string;
  expected: string;
  actual: string | null;
  status: "matched" | "mismatched" | "unknown";
  weight: number;
};
type Match = {
  profile: {
    _id: string;
    userId?: string;
    gender?: string;
    age?: number;
    maritalStatus?: string;
    address?: { district?: string; upazila?: string };
    educationInfo?: { highestEducation?: string };
    occupational?: { profession?: string };
    personalInformation?: { height?: number | string };
  };
  score: number | null;
  coverage: number;
  matchedCount: number;
  mismatchedCount: number;
  unknownCount: number;
  criteria: Criterion[];
};
type MatchResponse = {
  profiles: Match[];
  total: number;
  page: number;
  limit: number;
  preferenceCount: number;
  message: string;
};
const bn = (n: number) => n.toLocaleString("bn-BD");

function CriterionRow({ item }: { item: Criterion }) {
  const matched = item.status === "matched";
  const unknown = item.status === "unknown";
  return (
    <li className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5">
      {matched ? <CheckCircle2 aria-label="মিলেছে" className="mt-0.5 size-4 shrink-0 text-emerald-600" /> :
        unknown ? <CircleHelp aria-label="তথ্য নেই" className="mt-0.5 size-4 shrink-0 text-amber-600" /> :
        <XCircle aria-label="মেলেনি" className="mt-0.5 size-4 shrink-0 text-rose-600" />}
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-gray-800">{item.label}</p>
        <p className="mt-0.5 break-words text-gray-600">আপনার চাহিদা: {item.expected}</p>
        <p className="break-words text-gray-600">{unknown ? "প্রোফাইলে তুলনাযোগ্য তথ্য নেই" : `বায়োডাটায়: ${item.actual}`}</p>
      </div>
      <span className={`shrink-0 text-xs font-semibold ${matched ? "text-emerald-700" : unknown ? "text-amber-700" : "text-rose-700"}`}>
        {matched ? "মিলেছে" : unknown ? "অজানা" : "মেলেনি"}
      </span>
    </li>
  );
}

function MatchCard({ match }: { match: Match }) {
  const [expanded, setExpanded] = useState(false);
  const profile = match.profile;
  const number = profile.userId ? `${profile.gender === "female" ? "NB" : "NG"}-${profile.userId}` : "বায়োডাটা";
  return (
    <article className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-pink-600">প্রস্তাবিত বায়োডাটা</p>
          <h2 className="mt-1 text-lg font-bold text-gray-900">{number}</h2>
        </div>
        <div className="rounded-xl bg-pink-50 px-3 py-2 text-right text-pink-700">
          <div className="text-2xl font-bold tabular-nums">{match.score === null ? "—" : `${bn(match.score)}%`}</div>
          <p className="text-xs font-semibold">শর্তের মিল</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100" aria-label={`মিল ${match.score ?? 0} শতাংশ`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={match.score ?? 0}>
        <div className="h-full rounded-full bg-pink-500" style={{ width: `${match.score ?? 0}%` }} />
      </div>
      <p className="mt-2 text-xs text-gray-500">তুলনাযোগ্য তথ্য: {bn(match.coverage)}% • অনুপস্থিত তথ্য ম্যাচ হিসেবে গণ্য হয়নি</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-700">
        <div><dt className="text-xs text-gray-500">বয়স</dt><dd className="font-medium">{profile.age ? `${bn(profile.age)} বছর` : "উল্লেখ নেই"}</dd></div>
        <div><dt className="text-xs text-gray-500">জেলা</dt><dd className="font-medium">{profile.address?.district || "উল্লেখ নেই"}</dd></div>
        <div><dt className="text-xs text-gray-500">শিক্ষা</dt><dd className="font-medium">{profile.educationInfo?.highestEducation || "উল্লেখ নেই"}</dd></div>
        <div><dt className="text-xs text-gray-500">পেশা</dt><dd className="font-medium">{profile.occupational?.profession || "উল্লেখ নেই"}</dd></div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline" className="text-emerald-700">{bn(match.matchedCount)}টি মিলেছে</Badge>
        <Badge variant="outline" className="text-rose-700">{bn(match.mismatchedCount)}টি মেলেনি</Badge>
        {match.unknownCount > 0 && <Badge variant="outline" className="text-amber-700">{bn(match.unknownCount)}টি অজানা</Badge>}
      </div>
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}
        className="mt-4 flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-pink-600">
        কেন এই স্কোর? <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && <ul className="mt-3 space-y-2">{match.criteria.map(item => <CriterionRow key={item.key} item={item} />)}</ul>}
      <Button asChild className="mt-4 w-full bg-pink-600 hover:bg-pink-700">
        <Link href={`/biodata/${profile._id}`}>সম্পূর্ণ বায়োডাটা দেখুন <ArrowRight className="ml-2 size-4" /></Link>
      </Button>
    </article>
  );
}

export default function SmartMatchesPage() {
  const [page, setPage] = useState(1);
  const { data, isPending, isFetching, isError, refetch } = useQueryWrapper<MatchResponse>(
    ["smart-matches", page], `/platform/matches?page=${page}&limit=12`,
    { staleTime: 60_000, retry: 1 },
  );
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-pink-600"><Sparkles className="size-4" /> Find My Matches</div>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">স্মার্ট ম্যাচিং</h1>
            <Link href={"/profile/recommendations" as never} className="mt-2 inline-flex rounded-lg border border-pink-200 bg-pink-50 px-3 py-2 text-sm font-semibold text-pink-800 hover:bg-pink-100">এজেন্সির সুপারিশ দেখুন</Link>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">আপনার বায়োডাটায় উল্লেখ করা জীবনসঙ্গীর প্রত্যাশার সঙ্গে প্রকাশিত বায়োডাটাগুলোর তুলনা। কোনো AI অনুমান নয়—শুধু দেওয়া তথ্য অনুযায়ী হিসাব।</p>
          </div>
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}><RefreshCw className={`mr-2 size-4 ${isFetching ? "animate-spin" : ""}`} /> নতুন করে দেখুন</Button>
        </header>
        <section className="rounded-2xl border border-pink-100 bg-white p-4 sm:p-5">
          <p className="text-sm text-gray-700">প্রতিটি শর্তের নির্ধারিত গুরুত্ব অনুযায়ী মিলের শতাংশ গণনা হয়। অনুপস্থিত বা অস্পষ্ট তথ্যের জন্য কোনো পয়েন্ট দেওয়া হয় না। ব্যক্তিত্ব, পারস্পরিক সম্মতি ও বাস্তব উপযুক্ততা এই সংখ্যায় বোঝানো হয় না।</p>
          <Link href="/profile/my-profile" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-pink-700 hover:underline">প্রত্যাশিত জীবনসঙ্গীর তথ্য সম্পাদনা করুন <ArrowRight className="size-4" /></Link>
        </section>
        {isPending ? <div className="flex min-h-52 items-center justify-center gap-3 text-gray-600" role="status"><Loader2 className="size-6 animate-spin text-pink-600" /> ম্যাচ খোঁজা হচ্ছে...</div> :
          isError ? <section className="rounded-2xl border bg-white p-8 text-center"><p className="font-semibold">ম্যাচ লোড করা যায়নি।</p><Button className="mt-4" onClick={() => void refetch()}>আবার চেষ্টা করুন</Button></section> :
          !data?.profiles.length ? <section className="rounded-2xl border bg-white p-8 text-center">
            <CircleHelp className="mx-auto mb-3 size-9 text-pink-500" />
            <h2 className="text-lg font-semibold">এখনো কোনো ম্যাচ পাওয়া যায়নি</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-gray-600">{data?.message || "আপনার প্রত্যাশা অনুযায়ী প্রকাশিত বায়োডাটা পাওয়া যায়নি।"}</p>
            <Button asChild className="mt-5"><Link href="/profile/my-profile">বায়োডাটা আপডেট করুন</Link></Button>
          </section> : <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
              <p>মোট <strong className="text-gray-900">{bn(data.total)}</strong>টি ম্যাচ • {bn(data.preferenceCount)}টি প্রত্যাশিত বিষয়</p>
              <p>সবচেয়ে বেশি মিল প্রথমে দেখানো হচ্ছে</p>
            </div>
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">{data.profiles.map(match => <MatchCard key={match.profile._id} match={match} />)}</div>
            {totalPages > 1 && <nav aria-label="ম্যাচ পেজ পরিবর্তন" className="flex items-center justify-center gap-4">
              <Button variant="outline" disabled={page <= 1 || isFetching} onClick={() => setPage(p => p - 1)}><ChevronLeft className="size-4" /> আগের</Button>
              <span className="text-sm text-gray-600">{bn(page)} / {bn(totalPages)}</span>
              <Button variant="outline" disabled={page >= totalPages || isFetching} onClick={() => setPage(p => p + 1)}>পরের <ChevronRight className="size-4" /></Button>
            </nav>}
          </>}
      </div>
    </main>
  );
}
