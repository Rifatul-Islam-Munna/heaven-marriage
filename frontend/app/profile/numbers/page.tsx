"use client";

import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Mail,
  User,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface RequestUser {
  _id: string;
  name: string;
  userId: string;
  phoneNumber: string;
  isOtpVerified: boolean;
  email: string;
}

interface RequestData {
  _id: string;
  userId: string;
  requestUserId: RequestUser;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  data: RequestData[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const Numbers = () => {
  const [page, setPage] = React.useState(1);

  const { data, isLoading } = useQueryWrapper<ApiResponse>(
    ["get-user-data", page],
    `/user/get-my-request-number?page=${page}`,
  );

  const responseData = data;

  // Format date to Bangla
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString("bn-BD", { month: "long" });
    const year = date.getFullYear();

    const toBanglaNumber = (num: number): string => {
      const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
      return num
        .toString()
        .replace(/\d/g, (digit) => banglaDigits[parseInt(digit)]);
    };

    return `${toBanglaNumber(day)} ${month} ${toBanglaNumber(year)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-gray-600">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!responseData?.data || responseData.data.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50/50 to-white">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">
            আমার রিকোয়েস্ট করা নম্বর
          </h1>
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="flex flex-col items-center justify-center py-12 md:py-16">
              <Phone className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mb-4" />
              <p className="text-gray-600 text-center text-base md:text-lg">
                এখনো কোনো নম্বর রিকোয়েস্ট করা হয়নি
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 to-white">
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-7xl">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            আমার রিকোয়েস্ট করা নম্বর
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            মোট {responseData.totalItems} টি রিকোয়েস্ট
          </p>
        </div>

        {/* Cards Grid - Mobile First, Better Large Screen Layout */}
        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 mb-6 md:mb-8">
          {responseData.data.map((request) => (
            <Card
              key={request._id}
              className="hover:shadow-lg transition-shadow duration-200  shadow-none border border-gray-50 bg-white"
            >
              <CardHeader className="pb-3 md:pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 md:w-7 md:h-7 text-pink-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base md:text-lg text-gray-900 truncate">
                      {request?.requestUserId?.name}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-500">
                      ID: {request?.requestUserId?.userId}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 md:space-y-4">
                {/* Phone Number */}
                <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg">
                  <Phone className="w-5 h-5 text-pink-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 mb-0.5">ফোন নম্বর</p>
                    <a
                      href={`tel:${request?.requestUserId?.phoneNumber}`}
                      className="font-semibold text-sm md:text-base text-pink-600 hover:text-pink-700 block truncate"
                    >
                      {request?.requestUserId?.phoneNumber}
                    </a>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-pink-600 hover:bg-pink-100 flex-shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        request?.requestUserId?.phoneNumber,
                      );
                    }}
                  >
                    কপি
                  </Button>
                </div>

                {/* Email */}
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 md:w-5 md:h-5 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600">ইমেইল</p>
                    <a
                      href={`mailto:${request?.requestUserId?.email}`}
                      className="text-sm text-gray-900 hover:text-pink-600 block truncate"
                    >
                      {request?.requestUserId?.email}
                    </a>
                  </div>
                </div>

                {/* Request Date */}
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    রিকোয়েস্ট করা হয়েছে: {formatDate(request.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {responseData.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            {/* Page Info - Mobile First */}
            <div className="text-sm text-gray-600 order-2 sm:order-1">
              পৃষ্ঠা {responseData.page} / {responseData.totalPages}
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!responseData.hasPreviousPage || isLoading}
                className="border-gray-300 hover:bg-pink-50 hover:text-pink-600 hover:border-pink-300"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">পূর্ববর্তী</span>
              </Button>

              {/* Page Numbers - Desktop Only */}
              <div className="hidden md:flex items-center gap-1">
                {Array.from(
                  { length: responseData.totalPages },
                  (_, i) => i + 1,
                )
                  .filter((pageNum) => {
                    // Show first, last, current, and adjacent pages
                    return (
                      pageNum === 1 ||
                      pageNum === responseData.totalPages ||
                      Math.abs(pageNum - responseData.page) <= 1
                    );
                  })
                  .map((pageNum, index, array) => {
                    // Add ellipsis
                    const prevPage = array[index - 1];
                    const showEllipsis = prevPage && pageNum - prevPage > 1;

                    return (
                      <React.Fragment key={pageNum}>
                        {showEllipsis && (
                          <span className="px-2 text-gray-400">...</span>
                        )}
                        <Button
                          variant={
                            pageNum === responseData.page
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          disabled={isLoading}
                          className={
                            pageNum === responseData.page
                              ? "bg-pink-600 hover:bg-pink-700 text-white"
                              : "border-gray-300 hover:bg-pink-50 hover:text-pink-600 hover:border-pink-300"
                          }
                        >
                          {pageNum}
                        </Button>
                      </React.Fragment>
                    );
                  })}
              </div>

              {/* Mobile Page Counter */}
              <div className="md:hidden px-3 py-1 bg-gray-100 rounded text-sm font-medium">
                {responseData.page} / {responseData.totalPages}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((p) => Math.min(responseData.totalPages, p + 1))
                }
                disabled={!responseData.hasNextPage || isLoading}
                className="border-gray-300 hover:bg-pink-50 hover:text-pink-600 hover:border-pink-300"
              >
                <span className="hidden sm:inline">পরবর্তী</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Numbers;
