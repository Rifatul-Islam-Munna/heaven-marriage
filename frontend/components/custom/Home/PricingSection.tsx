"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { useRouter } from "next/navigation";

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
      <section className="py-12 md:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
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
    <section className="py-12 md:py-20 px-4 bg-gradient-to-b from-pink-50/50 to-white">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            আমাদের প্রাইসিং প্ল্যান
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            আপনার জীবনসঙ্গী খুঁজে পেতে সঠিক প্যাকেজ বেছে নিন
          </p>
        </div>

        {/* Pricing Cards */}
        <div
          className={`grid grid-cols-1 ${
            pricings.length === 2
              ? "md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto"
              : pricings.length === 3
                ? "md:grid-cols-3 gap-6 md:gap-6 lg:gap-8"
                : "md:grid-cols-2 lg:grid-cols-4 gap-6"
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
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
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
                    className={`w-full py-6 text-base md:text-lg font-semibold rounded-xl transition-colors duration-200 ${
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
      </div>
    </section>
  );
};

export default PricingSection;
