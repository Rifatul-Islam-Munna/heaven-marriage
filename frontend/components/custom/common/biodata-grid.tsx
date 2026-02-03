"use client";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs";
import BiodataCard from "./biodata-card";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { PaginatedUserResponse } from "@/@types/user";

interface Biodata {
  id: string;
  biodataNumber: string;
  age: number;
  height: string;
  district: string;
  upazila?: string;
  education: string;
  profession: string;
  gender: "male" | "female";
  isVerified?: boolean;
  isUrgent?: boolean;
}

interface BiodataGridProps {
  biodatas: Biodata[];
  isLoading?: boolean;
}

export default function BiodataGrid({ biodatas }: BiodataGridProps) {
  const [filters, setFilters] = useQueryStates({
    gender: parseAsString.withDefault("all"),
    maritalStatus: parseAsArrayOf(parseAsString).withDefault([]),
    ageMin: parseAsInteger.withDefault(18),
    ageMax: parseAsInteger.withDefault(40),
    districtId: parseAsString, // Changed from permanentDistrict/currentDistrict
    upazilaId: parseAsString, // Added upazila
    educationMedium: parseAsArrayOf(parseAsString).withDefault([]),
    religiousEducation: parseAsArrayOf(parseAsString).withDefault([]),
    heightMin: parseAsInteger.withDefault(4),
    heightMax: parseAsInteger.withDefault(7),
    skinColor: parseAsArrayOf(parseAsString).withDefault([]),
    fiqh: parseAsArrayOf(parseAsString).withDefault([]),
    profession: parseAsArrayOf(parseAsString).withDefault([]),
    economicStatus: parseAsArrayOf(parseAsString).withDefault([]),
    category: parseAsArrayOf(parseAsString).withDefault([]),
    page: parseAsInteger.withDefault(1),
    query: parseAsString.withDefault(""),
  });

  const query = Object.entries(filters)
    .filter(
      ([_, value]) =>
        value != null &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0),
    )
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const { data, isLoading } = useQueryWrapper<PaginatedUserResponse>(
    ["get-biodatas", query],
    `/user/get-all-user?${query}`,
  );

  console.log("Query:", query);

  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <BiodataCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (data?.docs?.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-pink-100">
          <svg
            className="h-10 w-10 text-pink-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="mb-2 font-heading text-xl font-bold text-gray-900">
          কোনো বায়োডাটা পাওয়া যায়নি
        </h3>
        <p className="text-gray-600">
          আপনার ফিল্টার অনুযায়ী কোনো বায়োডাটা খুঁজে পাওয়া যায়নি। অনুগ্রহ করে
          ফিল্টার পরিবর্তন করুন।
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {data?.docs?.map((biodata) => (
        <BiodataCard
          key={biodata._id}
          age={biodata?.age ?? 0}
          biodataNumber={biodata?.userId ?? ""}
          district={biodata?.address?.district ?? ""}
          upazila={biodata?.address?.upazila ?? ""}
          education={biodata?.educationInfo?.highestEducation ?? ""}
          profession={biodata?.occupational?.profession ?? ""}
          gender={biodata?.gender ?? ""}
          height={biodata?.personalInformation?.height ?? ""}
          id={biodata._id ?? ""}
        />
      ))}
    </div>
  );
}

// Skeleton Loading Component
function BiodataCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-gray-200" />
          <div className="space-y-2">
            <div className="h-5 w-24 rounded bg-gray-200" />
            <div className="h-4 w-16 rounded bg-gray-200" />
          </div>
        </div>
        <div className="h-9 w-9 rounded-full bg-gray-200" />
      </div>
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="h-16 rounded-lg bg-gray-100" />
          <div className="h-16 rounded-lg bg-gray-100" />
        </div>
        <div className="h-16 rounded-lg bg-gray-100" />
        <div className="h-16 rounded-lg bg-gray-100" />
        <div className="h-16 rounded-lg bg-gray-100" />
      </div>
      <div className="mt-4 h-11 w-full rounded-xl bg-gray-200" />
    </div>
  );
}
