"use client";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import BiodataCard from "@/components/custom/common/biodata-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

interface Address {
  presentAddress: string;
  district: string;
  upazila: string;
}

interface EducationInfo {
  educationMethod: string;
  highestEducation: string;
}

interface FamilyInfo {
  familyFinancial: string;
}

interface Occupational {
  profession: string;
}

interface PersonalInformation {
  fiqhFollow: string;
  height: number;
  skinTone: string;
}

interface User {
  _id: string;
  name: string;
  userId: string;
  role: string;
  createdAt: string;
  address: Address;
  age: number;
  educationInfo: EducationInfo;
  email: string;
  familyInfo: FamilyInfo;
  gender: string;
  maritalStatus: string;
  occupational: Occupational;
  personalInformation: PersonalInformation;
}

interface PaginatedUserResponse {
  data: User[];
  page: number;
  limit: number;
  totalItems: number;
}

const ShortList = () => {
  const [page, setPage] = useState(1);
  const limit = 12; // Items per page

  const { data, isLoading, error } = useQueryWrapper<PaginatedUserResponse>(
    ["get-shortlist", page],
    `/user/get-shortlist-user?page=${page}&limit=${limit}`,
  );

  // Debug: Log the response to check structure
  React.useEffect(() => {
    if (data) {
      console.log("API Response:", data);
      console.log("Total Items:", data?.totalItems);
      console.log("Page:", data?.page);
      console.log("Limit:", data?.limit);
    }
  }, [data]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[400px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Heart className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-heading font-bold mb-2">
            কিছু ভুল হয়েছে
          </h2>
          <p className="text-muted-foreground mb-4">
            শর্টলিস্ট লোড করতে সমস্যা হয়েছে
          </p>
          <Button onClick={() => window.location.reload()}>
            আবার চেষ্টা করুন
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data?.data || data?.data?.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-md mx-auto">
          <div className="text-muted-foreground mb-6">
            <Heart className="h-20 w-20 mx-auto" />
          </div>
          <h2 className="text-3xl font-heading font-bold mb-3">
            আপনার শর্টলিস্ট খালি
          </h2>
          <p className="text-muted-foreground mb-6">
            আপনি এখনো কোনো বায়োডাটা শর্টলিস্ট করেননি। পছন্দের বায়োডাটা খুঁজে
            শর্টলিস্ট করুন।
          </p>
          <Button asChild className="font-heading">
            <Link href="/biodata">বায়োডাটা খুঁজুন</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Calculate pagination values
  const totalItems = data?.totalItems ?? 0;
  const currentPage = data?.page ?? page;
  const itemsPerPage = data?.limit ?? limit;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const showPagination = totalPages > 1;

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(page - 1);
        pages.push(page);
        pages.push(page + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold mb-2 flex items-center gap-2">
              <Heart className="h-8 w-8 text-red-500 fill-red-500" />
              আমার শর্টলিস্ট
            </h1>
            <p className="text-muted-foreground  font-heading">
              মোট <span>{totalItems.toLocaleString("bn")}</span> টি বায়োডাটা
              শর্টলিস্ট করা হয়েছে
            </p>
          </div>
        </div>
      </div>

      {/* Biodata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {data?.data?.map((biodata) => (
          <BiodataCard
            key={biodata?._id ?? ""}
            age={biodata?.age ?? 0}
            biodataNumber={biodata?.userId ?? ""}
            district={biodata?.address?.district ?? ""}
            upazila={biodata?.address?.upazila ?? ""}
            education={biodata?.educationInfo?.highestEducation ?? ""}
            profession={biodata?.occupational?.profession ?? ""}
            gender={biodata?.gender ?? ""}
            height={biodata?.personalInformation?.height?.toString() ?? ""}
            id={biodata?._id ?? ""}
            isForShortList={true}
          />
        ))}
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
          {/* Page Info */}
          <div className="text-sm text-muted-foreground font-heading">
            পেজ {currentPage} / {totalPages}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page - 1)}
              disabled={!hasPreviousPage || isLoading}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((pageNum, index) => (
                <React.Fragment key={index}>
                  {pageNum === "..." ? (
                    <span className="px-2 text-muted-foreground">...</span>
                  ) : (
                    <Button
                      variant={page === pageNum ? "default" : "outline"}
                      size="icon"
                      onClick={() => setPage(pageNum as number)}
                      disabled={isLoading}
                      className="h-9 w-9 font-heading"
                    >
                      {pageNum}
                    </Button>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Next Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page + 1)}
              disabled={!hasNextPage || isLoading}
              className="h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Items Info */}
          <div className="text-sm text-muted-foreground font-heading">
            {(currentPage - 1) * itemsPerPage + 1} -{" "}
            {Math.min(currentPage * itemsPerPage, totalItems)} টি দেখানো হচ্ছে
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortList;
