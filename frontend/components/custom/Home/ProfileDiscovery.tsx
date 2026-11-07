"use client";

import Link from "next/link";
import { ArrowUpRight, Eye, Heart, Sparkles, TrendingUp, UsersRound } from "lucide-react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import BiodataCard from "@/components/custom/common/biodata-card";
import type { User } from "@/@types/user";

type DiscoveryProfile = User & {
  discoverySource?: "ranked" | "fresh" | "explore";
  rankingPosition?: number;
  engagement?: { views: number; favourites: number; connections: number };
};
type Discovery = { popular: DiscoveryProfile[]; recent: DiscoveryProfile[] };

const number = (value: number | undefined) =>
  Math.max(0, Number(value) || 0).toLocaleString("bn-BD");

function DiscoveryRow({ title, description, profiles, ranking }: {
  title: string; description: string; profiles: DiscoveryProfile[]; ranking: boolean;
}) {
  const Icon = ranking ? TrendingUp : Sparkles;
  if (!profiles.length) return null;

  return (
    <section aria-label={title} className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold text-pink-700">
            <Icon size={15} aria-hidden /> {ranking ? "চলতি ১৫ দিনের জনপ্রিয় বায়োডাটা" : "নতুন ও কম দেখা সদস্য"}
          </p>
          <h2 className="font-heading text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
        <Link href="/biodata" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-pink-200 px-4 py-2 text-sm font-bold text-pink-700 hover:bg-white hover:text-pink-900">
          সব বায়োডাটা <ArrowUpRight size={16} aria-hidden />
        </Link>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3">
        {profiles.map((profile) => (
          <div key={profile._id || profile.userId} className="w-[min(88vw,380px)] shrink-0 snap-start sm:w-auto min-w-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-pink-700 ring-1 ring-pink-100">
                {ranking ? <TrendingUp size={13} aria-hidden /> : <UsersRound size={13} aria-hidden />}
                {ranking && profile.rankingPosition ? `র‍্যাঙ্ক #${number(profile.rankingPosition)}` : ranking ? "জনপ্রিয় প্রোফাইল" : profile.discoverySource === "explore" ? "নতুন করে দেখুন" : "নতুন প্রোফাইল"}
              </span>
              {!ranking && <span className="text-xs text-gray-500">{profile.discoverySource === "explore" ? "আরও পরিচিতি" : "সদ্য যুক্ত"}</span>}
            </div>
            <BiodataCard
              id={profile._id || ""}
              userId={profile.userId || ""}
              biodataNumber={profile.userId || ""}
              gender={profile.gender === "female" ? "female" : "male"}
              age={profile.age || 0}
              height={profile.personalInformation?.height || ""}
              district={profile.address?.district || ""}
              upazila={profile.address?.upazila || ""}
              education={profile.educationInfo?.highestEducation || ""}
              profession={profile.occupational?.profession || ""}
              skinTone={profile.personalInformation?.skinTone || ""}
              isVerified={profile.isVerified}
              isSubscriber={profile.isSubscriber}
              className="h-auto border-pink-100 shadow-sm"
            />
            {ranking && profile.engagement && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-2 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1"><Eye size={13} aria-hidden />{number(profile.engagement.views)} ভিউ</span>
                <span className="inline-flex items-center gap-1"><Heart size={13} aria-hidden />{number(profile.engagement.favourites)} পছন্দ</span>
                <span className="inline-flex items-center gap-1"><UsersRound size={13} aria-hidden />{number(profile.engagement.connections)} কানেকশন</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ProfileDiscovery() {
  const { data, isLoading } = useQueryWrapper<Discovery>(
    ["profile-discovery"], "/public/discovery",
    { staleTime: 60000 },
  );
  if (!data?.popular?.length && !data?.recent?.length) {
    if (!isLoading) return null;
    return <section className="container mx-auto px-4 py-6 sm:px-6 lg:px-8" aria-label="বায়োডাটা লোড হচ্ছে">
      <div className="mx-auto max-w-7xl">
        <div className="h-6 w-56 animate-pulse rounded-full bg-pink-100" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-pink-50" />)}
        </div>
      </div>
    </section>;
  }
  return (
    <div className="border-y border-pink-100 bg-gradient-to-b from-white to-rose-50/40">
      <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8 md:py-12">
        <div className="mx-auto max-w-7xl space-y-9 md:space-y-12">
          <DiscoveryRow title="র‍্যাঙ্কিং প্রোফাইল"
            description="প্রতি ১৫ দিনে র‍্যাঙ্কিং নতুনভাবে শুরু হয় — চলতি সময়ের ভিউ, পছন্দ ও কানেকশন অনুযায়ী"
            profiles={data.popular || []} ranking />
          <DiscoveryRow title="নতুন প্রোফাইল"
            description="সদ্য প্রকাশিত ও কম দেখা সদস্যদের বায়োডাটা — সবাইকে পরিচিত হওয়ার সুযোগ"
            profiles={data.recent || []} ranking={false} />
        </div>
      </div>
    </div>
  );
}
