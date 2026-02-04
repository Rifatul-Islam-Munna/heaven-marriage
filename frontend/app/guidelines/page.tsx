"use client";

import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface Guideline {
  _id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export default function GuidelinesPage() {
  // Fetch all Guidelines
  const { data: guidelines, isLoading } = useQueryWrapper<Guideline[]>(
    ["guidelines"],
    "/guidelines",
  );

  // Parse comma-separated items
  const parseItems = (description: string): string[] => {
    return description
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-16 px-4">
        <div className="container max-w-6xl mx-auto space-y-8">
          <Skeleton className="h-20 w-80 mx-auto" />
          <Skeleton className="h-12 w-96 mx-auto" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 sm:py-16 px-4">
      <div className="container max-w-6xl mx-auto space-y-8 sm:space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 sm:space-y-5">
          <div className="flex items-center justify-center">
            <div className="p-4 sm:p-5 bg-gradient-to-br from-pink-600 to-rose-600 rounded-2xl">
              <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl  font-bold text-gray-900">
              নির্দেশনা
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-pink-600 to-rose-600 mx-auto rounded-full"></div>
          </div>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600  max-w-3xl mx-auto leading-relaxed">
            আমাদের সেবা সঠিকভাবে ব্যবহারের জন্য অনুগ্রহ করে নিচের নির্দেশনাগুলো
            মনোযোগ সহকারে পড়ুন
          </p>
        </div>

        {/* Guidelines Grid */}
        {!guidelines || guidelines.length === 0 ? (
          <Card className="border border-dashed border-gray-50 shadow-none">
            <CardContent className="py-20 sm:py-24 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <BookOpen className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-lg sm:text-xl text-gray-500 ">
                এখনো কোন নির্দেশনা যোগ করা হয়নি
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
            {guidelines.map((guideline, index) => {
              const items = parseItems(guideline.description);
              return (
                <Card
                  key={guideline._id}
                  className="border border-gray-50 hover:border-pink-500 transition-all duration-300 bg-white"
                >
                  <CardHeader className="pb-5 sm:pb-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-pink-600 to-rose-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md">
                        {index + 1}
                      </div>
                      <CardTitle className="text-lg sm:text-xl lg:text-2xl  font-bold text-gray-900 leading-tight pt-2">
                        {guideline.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="pl-16 sm:pl-[4.5rem]">
                      <ul className="space-y-3 sm:space-y-4">
                        {items.map((item, itemIndex) => (
                          <li
                            key={itemIndex}
                            className="flex items-start gap-3"
                          >
                            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-pink-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm sm:text-base lg:text-lg text-gray-700 leading-relaxed ">
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-8 sm:pt-12 border-t-2 border-gray-200">
          <p className="text-sm sm:text-base text-gray-600 ">
            আরও সহায়তার জন্য{" "}
            <Link
              href="/faq"
              className="text-pink-600 hover:text-pink-700 font-semibold hover:underline transition-colors"
            >
              FAQ
            </Link>{" "}
            দেখুন অথবা{" "}
            <Link
              href="/contact"
              className="text-pink-600 hover:text-pink-700 font-semibold hover:underline transition-colors"
            >
              যোগাযোগ করুন
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
