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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

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
    ageMin: parseAsInteger.withDefault(10),
    ageMax: parseAsInteger.withDefault(40),
    districtId: parseAsString,
    upazilaId: parseAsString,
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
    country: parseAsString.withDefault(""),
    polygamy: parseAsArrayOf(parseAsString).withDefault([]),
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
    { staleTime: 60 * 1000 },
    1200,
    "get-all-user-data",
  );

  console.log("Query:", query);

  // Pagination handler
  const handlePageChange = (newPage: number) => {
    setFilters({ page: newPage });
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    if (!data) return [];

    const { page, totalPages } = data;
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      // Show all pages if total is 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (page > 3) {
        pages.push("...");
      }

      // Show pages around current page
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <BiodataCardSkeleton key={i} />
          ))}
        </div>
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
    <div className="space-y-8">
      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          মোট{" "}
          <span className="font-semibold text-gray-900">{data?.totalDocs}</span>{" "}
          টি বায়োডাটা পাওয়া গেছে
          {data && data.totalPages > 1 && (
            <span className="ml-2">
              (পৃষ্ঠা {data.page} / {data.totalPages})
            </span>
          )}
        </p>
      </div>

      {/* Biodata Grid */}
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
            skinTone={biodata?.personalInformation?.skinTone ?? ""}
            userId={biodata?.userId ?? ""}
          />
        ))}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              {/* Previous Button */}
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    data.hasPrevPage && handlePageChange(data.page - 1)
                  }
                  className={
                    !data.hasPrevPage
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {/* Page Numbers */}
              {getPageNumbers().map((pageNum, idx) => (
                <PaginationItem key={idx}>
                  {pageNum === "..." ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => handlePageChange(pageNum as number)}
                      isActive={pageNum === data.page}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              {/* Next Button */}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    data.hasNextPage && handlePageChange(data.page + 1)
                  }
                  className={
                    !data.hasNextPage
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
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
