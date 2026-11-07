"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight, Heart, HeartHandshake, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import BiodataCard from "@/components/custom/common/biodata-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Direction = "given" | "received";
type PublicBiodata = {
  _id: string;
  userId?: string;
  gender?: "male" | "female";
  age?: number;
  isVerified?: boolean;
  address?: { district?: string; upazila?: string };
  educationInfo?: { highestEducation?: string };
  occupational?: { profession?: string };
  personalInformation?: { height?: string | number; skinTone?: string };
};
type FavouriteResponse = {
  data: PublicBiodata[];
  totalItems: number;
  page: number;
  limit: number;
};
type RemoveResponse = { success: boolean; removed: boolean };

const bn = (n: number) => n.toLocaleString("bn-BD");
const LIMIT = 12;

export default function FavouritesList({ direction }: { direction: Direction }) {
  const mine = direction === "given";
  const Icon = mine ? Heart : HeartHandshake;
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState<string | null>(null);
  const client = useQueryClient();
  const queryKey = mine ? "get-shortlist" : "who-favourited-me";
  const url = mine ? "/user/get-shortlist-user" : "/user/get-who-favourited-me";
  const { data, isPending, isFetching, isError, refetch } = useQueryWrapper<FavouriteResponse>(
    [queryKey, page],
    `${url}?page=${page}&limit=${LIMIT}`,
    { staleTime: 30_000, retry: 1 },
  );

  const { mutate: removeFavourite } = useCommonMutationApi<RemoveResponse, { shortlistedUserId: string }>({
    url: "/user/remove-from-shortlist",
    method: "POST",
    mutationKey: ["remove-from-shortlist"],
    successMessage: "পছন্দের তালিকা থেকে সরানো হয়েছে",
    onSuccess: () => {
      setRemoving(null);
      void client.invalidateQueries({ queryKey: ["get-shortlist"] });
      if (page > 1 && data?.data.length === 1) setPage(current => Math.max(1, current - 1));
    },
    onError: () => setRemoving(null),
  });

  const total = data?.totalItems ?? 0;
  const totalPages = Math.ceil(total / (data?.limit || LIMIT));

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-pink-600">
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                {mine ? "My Favourites" : "Who Favourited Me"}
              </h1>
              <p className="mt-1 text-sm font-medium text-pink-700">
                {mine ? "আমি যাদের পছন্দের তালিকায় রেখেছি" : "যারা আমার বায়োডাটা পছন্দের তালিকায় রেখেছেন"}
              </p>
            </div>
          </div>
          <Button variant="outline" disabled={isFetching} onClick={() => void refetch()} className="gap-2">
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            রিফ্রেশ
          </Button>
        </header>

        <nav aria-label="ফেভারিটের দুটি তালিকা" className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-white p-1.5 sm:max-w-lg">
          <Link href="/profile/short-list" aria-current={mine ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-center text-xs font-semibold sm:text-sm ${mine ? "bg-pink-600 text-white shadow-sm" : "text-gray-700 hover:bg-pink-50"}`}>
            <Heart aria-hidden="true" className="size-4 shrink-0" /> My Favourites
          </Link>
          <Link href={"/profile/favourited-me" as Route} aria-current={!mine ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-center text-xs font-semibold sm:text-sm ${!mine ? "bg-pink-600 text-white shadow-sm" : "text-gray-700 hover:bg-pink-50"}`}>
            <HeartHandshake aria-hidden="true" className="size-4 shrink-0" /> Who Favourited Me
          </Link>
        </nav>

        <section className="rounded-xl border border-pink-100 bg-white px-4 py-3 text-sm leading-6 text-gray-600">
          {mine
            ? "আপনি যেসব বায়োডাটা Favourite করেছেন, শুধু সেগুলোই এখানে দেখাবে। চাইলে এখান থেকেই আপনার দেওয়া Favourite সরাতে পারবেন।"
            : "যেসব সদস্য আপনার বায়োডাটা Favourite করেছেন, তাদের প্রকাশিত বায়োডাটা এখানে দেখাবে। এটি তাঁদের দেওয়া Favourite—আপনি তাঁদের তালিকা পরিবর্তন করতে পারবেন না।"}
          {" "}ব্যক্তিগত যোগাযোগের তথ্য এখানে দেখানো হয় না।
        </section>

        {isPending ? (
          <div aria-label="ফেভারিট লোড হচ্ছে" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-48 rounded-xl" />)}
          </div>
        ) : isError ? (
          <section className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="font-semibold text-gray-900">তালিকা লোড করা যায়নি।</p>
            <p className="mt-1 text-sm text-gray-500">আবার চেষ্টা করুন।</p>
            <Button onClick={() => void refetch()} className="mt-4">আবার চেষ্টা করুন</Button>
          </section>
        ) : data?.data.length === 0 ? (
          <section className="rounded-xl border border-gray-200 bg-white px-5 py-12 text-center">
            <Icon aria-hidden="true" className="mx-auto size-12 text-pink-300" />
            <h2 className="mt-3 text-lg font-semibold text-gray-900">
              {mine ? "আপনার Favourite তালিকা এখনো খালি" : "এখনো কেউ আপনার বায়োডাটা Favourite করেননি"}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-600">
              {mine ? "পছন্দের বায়োডাটায় Favourite দিলে সেটি এখানে দেখা যাবে।" :
                "অন্য কোনো সদস্য আপনার বায়োডাটা পছন্দের তালিকায় রাখলে এখানে তাঁর প্রকাশিত বায়োডাটা দেখতে পাবেন।"}
            </p>
            {mine && <Button asChild className="mt-5 bg-pink-600 hover:bg-pink-700">
              <Link href="/biodata">বায়োডাটা খুঁজুন <ArrowRight className="ml-1 size-4" /></Link>
            </Button>}
          </section>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
              <p>মোট <strong className="text-gray-900">{bn(total)}</strong> জন {mine ? "আপনার Favourite-এ" : "আপনাকে Favourite করেছেন"}</p>
              <p>পৃষ্ঠা {bn(page)} / {bn(Math.max(1, totalPages))}</p>
            </div>
            <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data?.data.map(profile => (
                <article key={profile._id} className="min-w-0">
                  <BiodataCard
                    id={profile._id}
                    biodataNumber={profile.userId || ""}
                    gender={profile.gender === "female" ? "female" : "male"}
                    age={profile.age || 0}
                    height={profile.personalInformation?.height ?? ""}
                    district={profile.address?.district || ""}
                    upazila={profile.address?.upazila || ""}
                    education={profile.educationInfo?.highestEducation || ""}
                    profession={profile.occupational?.profession || ""}
                    skinTone={profile.personalInformation?.skinTone}
                    isVerified={profile.isVerified}
                    isForShortList={mine}
                  />
                  <div className="mt-2 flex min-h-12 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <p className="text-xs font-medium text-gray-600">
                      {mine ? "আপনি এই বায়োডাটা Favourite করেছেন" : "এই সদস্য আপনাকে Favourite করেছেন"}
                    </p>
                    {mine && (
                      <Button type="button" variant="outline" size="sm" disabled={!!removing}
                        aria-label={`বায়োডাটা ${profile.userId || profile._id} Favourite থেকে সরান`}
                        onClick={() => {
                          setRemoving(profile._id);
                          removeFavourite({ shortlistedUserId: profile._id });
                        }}
                        className="shrink-0 gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-700">
                        {removing === profile._id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        সরান
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {totalPages > 1 && (
              <nav aria-label="ফেভারিট পৃষ্ঠা" className="flex items-center justify-center gap-3 pb-3">
                <Button variant="outline" disabled={page <= 1 || isFetching} onClick={() => setPage(current => current - 1)}>
                  <ChevronLeft className="mr-1 size-4" /> আগের
                </Button>
                <span className="text-sm tabular-nums text-gray-600">{bn(page)} / {bn(totalPages)}</span>
                <Button variant="outline" disabled={page >= totalPages || isFetching} onClick={() => setPage(current => current + 1)}>
                  পরের <ChevronRight className="ml-1 size-4" />
                </Button>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}
