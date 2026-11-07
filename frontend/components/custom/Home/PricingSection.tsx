"use client";

import React from "react";
import PolicyLinks from "@/components/custom/common/PolicyLinks";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
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

const PricingSection = () => {
  const router = useRouter();
  // Fetch all pricings
  const { data: allPricings = [], isLoading } = useQueryWrapper<Pricing[]>(
    ["public-pricings"],
    "/pricing",
    {
      staleTime: 60000,
    },
  );

  // Show only first 3 pricings
  const pricings = allPricings.slice(0, 3);
  const hasMorePricings = allPricings.length > 3;

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
      <section className="px-4 py-8 md:py-12">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-7 text-center">
            <div className="h-8 bg-gray-200 rounded-lg w-64 mx-auto mb-4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded-lg w-96 mx-auto animate-pulse"></div>
          </div>
        </div>
      </section>
    );
  }

  if (pricings.length === 0) {
    return null;
  }

  return (
    <section
      id="pricing"
      className="bg-gradient-to-b from-pink-50/50 to-white px-4 py-9 md:py-12"
    >
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-7 text-center md:mb-9">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
            আমাদের প্রাইসিং প্ল্যান
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-gray-600 md:text-base">
            আপনার জীবনসঙ্গী খুঁজে পেতে সঠিক প্যাকেজ বেছে নিন
          </p>
        </div>

        {/* Pricing Cards */}
        <div
          className={`grid grid-cols-1 ${
            pricings.length === 2
              ? "mx-auto max-w-3xl gap-4 md:grid-cols-2 md:gap-5"
              : pricings.length === 3
                ? "gap-4 md:grid-cols-3 md:gap-5"
                : "gap-4 md:grid-cols-2 lg:grid-cols-4"
          }`}
        >
          {pricings.map((pricing, index) => {
            const isPopular = index === 1 && pricings.length === 3;
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
                className={`relative bg-white rounded-2xl border-2 transition-colors duration-200 ${
                  isPopular
                    ? "border-pink-500"
                    : "border-gray-200 hover:border-pink-300"
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-gradient-to-r from-pink-500 to-pink-600 px-4 py-1 text-xs font-semibold text-white">
                      জনপ্রিয়
                    </span>
                  </div>
                )}

                <div className="p-4 md:p-5">
                  {/* Title */}
                  <h3 className="mb-2 text-center text-xl font-bold text-gray-900 md:text-2xl">
                    {pricing.title}
                  </h3>

                  {/* Number of Connections Badge */}
                  <div className="mb-3 text-center">
                    <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                      {toBanglaNumber(pricing.numberOfConnections)} টি কানেকশন
                    </span>
                  </div>

                  {/* Pricing */}
                  <div className="mb-4 text-center">
                    {hasDiscount && (
                      <div className="mb-2">
                        <span className="text-sm text-gray-400 line-through">
                          ৳{toBanglaNumber(pricing.originalPrice)}
                        </span>
                        <span className="ml-2 bg-pink-100 text-pink-600 text-xs font-semibold px-3 py-1 rounded-full">
                          ছাড় পাচ্ছেন!
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-3xl font-bold text-gray-900 md:text-4xl">
                        ৳{toBanglaNumber(finalPrice)}
                      </span>
                    </div>
                  </div>

                  <p className="mb-2 text-xs leading-5 text-gray-600">একটি কানেকশন একটি পৃথক প্রোফাইলের পরিচয় ও যোগাযোগ আনলক করবে।</p><PolicyLinks />
                  {/* CTA Button */}
                  <Button
                    onClick={() => mutate({ id: pricing._id })}
                    className={`min-h-10 w-full rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                      isPopular
                        ? "bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
                        : "bg-pink-50 hover:bg-pink-100 text-pink-600 border-2 border-pink-200"
                    }`}
                    disabled={isPending}
                  >
                    {isPending ? "অপেক্ষা করুন..." : "এখনই শুরু করুন"}
                  </Button>

                  {/* Features from description */}
                  {features.length > 0 && (
                    <>
                      <div className="my-4 border-t border-gray-100"></div>
                      <div className="space-y-2">
                        {features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-2">
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
                            <span className="flex-1 text-sm leading-5 text-gray-700">
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

        {/* See More Button */}

        <div className="mt-6 text-center">
          <Link href="/pricing">
            <Button
              variant="outline"
              className="min-h-10 rounded-xl border border-pink-200 px-6 py-2.5 text-sm font-semibold text-pink-600 transition-colors hover:border-pink-400 hover:bg-pink-50"
            >
              আরও দেখুন
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
