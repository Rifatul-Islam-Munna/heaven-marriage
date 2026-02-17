"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft } from "lucide-react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Pricing {
  _id: string;
  title: string;
  description?: string;
  originalPrice: number;
  discountPrice?: number;
  numberOfConnections: number;
}

// Convert English numbers to Bangla
const toBanglaNumber = (num: number): string => {
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return num
    .toString()
    .replace(/\d/g, (digit) => banglaDigits[parseInt(digit)]);
};

const PricingPage = () => {
  const router = useRouter();

  // Fetch all pricings
  const { data: pricings = [], isLoading } = useQueryWrapper<Pricing[]>(
    ["public-pricings"],
    "/pricing",
    {
      staleTime: 60000,
    },
  );

  const { mutate, isPending } = useCommonMutationApi({
    method: "POST",
    url: "/user/Buy-packages",
    onSuccess: (data) => {
      console.log(data);
      router.push(data?.paymentUrl);
    },
  });

  if (isLoading) {
    return (
      <section className="min-h-screen py-12 md:py-20 px-4 bg-gradient-to-b from-pink-50/50 to-white">
        <div className="container mx-auto max-w-7xl">
          {/* Back Button Skeleton */}
          <div className="mb-8">
            <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>

          {/* Header Skeleton */}
          <div className="text-center mb-12">
            <div className="h-10 bg-gray-200 rounded-lg w-80 mx-auto mb-4 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded-lg w-96 mx-auto animate-pulse"></div>
          </div>

          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border-2 border-gray-200 p-8 animate-pulse"
              >
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-6"></div>
                <div className="h-12 bg-gray-200 rounded mb-8"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (pricings.length === 0) {
    return (
      <section className="min-h-screen py-12 md:py-20 px-4 bg-gradient-to-b from-pink-50/50 to-white">
        <div className="container mx-auto max-w-7xl">
          <Link href="/">
            <Button
              variant="outline"
              className="mb-8 flex items-center gap-2 border-2 border-pink-200 text-pink-600 hover:bg-pink-50"
            >
              <ArrowLeft className="w-4 h-4" />
              হোম পেজে ফিরে যান
            </Button>
          </Link>

          <div className="text-center py-20">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              কোনো প্যাকেজ পাওয়া যায়নি
            </h2>
            <p className="text-gray-600">
              এই মুহূর্তে কোনো প্রাইসিং প্যাকেজ উপলব্ধ নেই
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Determine grid columns based on number of items
  const getGridClass = () => {
    if (pricings.length === 1) return "md:grid-cols-1 max-w-md mx-auto";
    if (pricings.length === 2) return "md:grid-cols-2 max-w-4xl mx-auto";
    if (pricings.length === 3) return "md:grid-cols-3 max-w-5xl mx-auto";
    if (pricings.length === 4) return "md:grid-cols-2 lg:grid-cols-4";
    return "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  };

  return (
    <section className="min-h-screen py-8 md:py-16 px-4 bg-gradient-to-b from-pink-50/50 to-white">
      <div className="container mx-auto max-w-7xl">
        {/* Back Button */}

        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            আমাদের সকল প্রাইসিং প্ল্যান
          </h1>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            আপনার জীবনসঙ্গী খুঁজে পেতে সঠিক প্যাকেজ বেছে নিন। সব প্যাকেজ দেখুন
            এবং আপনার জন্য উপযুক্ত একটি নির্বাচন করুন
          </p>
        </div>

        {/* Pricing Cards */}
        <div
          className={`grid grid-cols-1 ${getGridClass()} gap-6 md:gap-6 lg:gap-8`}
        >
          {pricings.map((pricing, index) => {
            // Mark middle item as popular if there are 3+ items
            const isPopular =
              pricings.length >= 3 && index === Math.floor(pricings.length / 2);

            const hasDiscount =
              pricing.discountPrice &&
              pricing.discountPrice < pricing.originalPrice;
            const finalPrice = hasDiscount
              ? pricing.discountPrice!
              : pricing.originalPrice;

            // Split description by comma to get features
            const features = pricing.description
              ? pricing.description
                  .split(",")
                  .map((f) => f.trim())
                  .filter((f) => f.length > 0)
              : [];

            return (
              <div
                key={pricing._id}
                className={`relative bg-white rounded-2xl border-2 transition-all duration-200 hover:shadow-lg ${
                  isPopular
                    ? "border-pink-500 shadow-md"
                    : "border-gray-200 hover:border-pink-300"
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <span className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-md">
                      জনপ্রিয়
                    </span>
                  </div>
                )}

                <div className="p-6 md:p-8">
                  {/* Title */}
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 text-center">
                    {pricing.title}
                  </h3>

                  {/* Number of Connections Badge */}
                  <div className="text-center mb-6">
                    <span className="inline-block bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold">
                      {toBanglaNumber(pricing.numberOfConnections)} টি কানেকশন
                    </span>
                  </div>

                  {/* Pricing */}
                  <div className="text-center mb-8">
                    {hasDiscount && (
                      <div className="mb-2">
                        <span className="text-lg text-gray-400 line-through">
                          ৳{toBanglaNumber(pricing.originalPrice)}
                        </span>
                        <span className="ml-2 bg-pink-100 text-pink-600 text-xs font-semibold px-3 py-1 rounded-full">
                          ছাড় পাচ্ছেন!
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-4xl md:text-5xl font-bold text-gray-900">
                        ৳{toBanglaNumber(finalPrice)}
                      </span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={() => mutate({ id: pricing._id })}
                    className={`w-full py-6 text-base md:text-lg font-semibold rounded-xl transition-all duration-200 ${
                      isPopular
                        ? "bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-md hover:shadow-lg"
                        : "bg-pink-50 hover:bg-pink-100 text-pink-600 border-2 border-pink-200 hover:border-pink-300"
                    }`}
                    disabled={isPending}
                  >
                    {isPending ? "অপেক্ষা করুন..." : "এখনই শুরু করুন"}
                  </Button>

                  {/* Features from description */}
                  {features.length > 0 && (
                    <>
                      <div className="my-8 border-t-2 border-gray-100"></div>
                      <div className="space-y-4">
                        {features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div
                              className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                                isPopular ? "bg-pink-100" : "bg-gray-100"
                              }`}
                            >
                              <Check
                                className={`w-3 h-3 ${
                                  isPopular ? "text-pink-600" : "text-gray-600"
                                }`}
                              />
                            </div>
                            <span className="text-sm md:text-base text-gray-700 flex-1">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Section */}
        <div className="mt-16 text-center bg-gradient-to-r from-pink-50 to-pink-100 rounded-2xl p-8 md:p-12">
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            এখনও সিদ্ধান্ত নিতে পারছেন না?
          </h3>
          <p className="text-base md:text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            আমাদের সাথে যোগাযোগ করুন এবং আপনার জন্য সবচেয়ে উপযুক্ত প্যাকেজ
            খুঁজে নিতে সাহায্য নিন
          </p>
          <Link href="/contact">
            <Button className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-6 text-base md:text-lg font-semibold rounded-xl">
              যোগাযোগ করুন
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PricingPage;
