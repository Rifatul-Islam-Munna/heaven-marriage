"use client";

import React, { Suspense, useEffect } from "react";
import { XCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { getPaymentStatus } from "@/actions/auth";

const PaymentFailedContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const purpose = searchParams.get("purpose");

  useEffect(() => {
    if (
      !orderId ||
      orderId.length > 150 ||
      (purpose !== "premium" && purpose !== "connections")
    )
      return;
    let cancelled = false;
    void getPaymentStatus(orderId, purpose)
      .then((result) => {
        if (!cancelled && result?.status === "paid") {
          const params = new URLSearchParams({ purpose, order_id: orderId });
          window.location.replace("/payment/successfull?" + params.toString());
        }
      })
      .catch(() => {
        // Leave the result unconfirmed when the provider cannot be reached.
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, purpose]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-0 shadow-2xl">
        <CardContent className="pt-12 pb-8 px-6 text-center">
          {/* Error Icon with Animation */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-red-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-red-400 to-red-600 rounded-full p-6">
                <XCircle className="w-16 h-16 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            পেমেন্ট নিশ্চিত করা যায়নি
          </h1>
          <p className="text-base md:text-lg text-gray-600 mb-8">
            আপনার পেমেন্টের অবস্থা সার্ভার থেকে যাচাই করা হচ্ছে। নিশ্চিত না হওয়া
            পর্যন্ত কোনো সুবিধা সক্রিয় হবে না।
          </p>

          {/* Error Details */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              <span className="font-semibold">লেনদেন নিশ্চিত হয়নি</span>
            </div>
            <p className="text-sm text-red-600 mt-2">
              পেমেন্টের অবস্থা যাচাই করা হচ্ছে
            </p>
          </div>

          {/* Common Reasons */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8 text-left">
            <p className="font-semibold text-gray-900 mb-3 text-center">
              সম্ভাব্য কারণসমূহ:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-pink-500 mt-0.5">•</span>
                <span>অপর্যাপ্ত ব্যালেন্স</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-500 mt-0.5">•</span>
                <span>ভুল পিন নম্বর প্রদান</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-500 mt-0.5">•</span>
                <span>ইন্টারনেট সংযোগ বিচ্ছিন্ন</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-500 mt-0.5">•</span>
                <span>সেশন টাইমআউট</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="flex-1 border-2 border-gray-300 hover:bg-gray-50 py-6 text-base font-semibold"
            >
              <Home className="w-5 h-5 mr-2" />
              হোমপেজে যান
            </Button>
          </div>

          {/* Support Message */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              সমস্যা সমাধান না হলে{" "}
              <button
                onClick={() => router.push("/contact")}
                className="text-pink-600 font-semibold hover:text-pink-700 underline"
              >
                আমাদের সাথে যোগাযোগ করুন
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const PaymentFailedPage = () => (
  <Suspense
    fallback={
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-gray-600">
          পেমেন্টের অবস্থা যাচাই হচ্ছে...
        </span>
      </div>
    }
  >
    <PaymentFailedContent />
  </Suspense>
);

export default PaymentFailedPage;
