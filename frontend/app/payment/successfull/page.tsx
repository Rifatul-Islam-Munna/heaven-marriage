"use client";

import React, { Suspense, useEffect, useState } from "react";
import { CheckCircle, ArrowRight, Home, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { User } from "@/@types/user";
import { getPaymentStatus, setUserData } from "@/actions/auth";
import PurchaseTracker from "@/lib/PurchaseTracker";

type PaymentPurpose = "premium" | "connections";
type PaymentState = "checking" | "pending" | "paid" | "failed";

const PaymentSuccessContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const requestedPurpose = searchParams.get("purpose");
  const isValidPurpose = requestedPurpose === "premium" || requestedPurpose === "connections";
  const purpose: PaymentPurpose = requestedPurpose === "premium" ? "premium" : "connections";
  const isValidReference = !!orderId && orderId.length <= 150 && isValidPurpose;
  const [paymentState, setPaymentState] = useState<PaymentState>("checking");
  const [paymentId, setPaymentId] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const isPremium = purpose === "premium";
  const isPaid = isValidReference && paymentState === "paid";
  const isFailed = !isValidReference || paymentState === "failed";

  useEffect(() => {
    if (!isValidReference) return;
    let cancelled = false;
    let timeout: number | undefined;
    let attempts = 0;

    const verify = async () => {
      try {
        const result = await getPaymentStatus(orderId, purpose);
        if (cancelled) return;
        if (result?.status === "paid") {
          setPaymentId(result.paymentId || "");
          setPaymentState("paid");
          return;
        }
        if (result?.status === "failed" || result?.status === "refunded") {
          setPaymentState("failed");
          return;
        }
        setPaymentState("pending");
      } catch {
        if (!cancelled) setPaymentState("pending");
      }

      attempts += 1;
      if (!cancelled && attempts < 12) {
        timeout = window.setTimeout(verify, 5000);
      }
    };

    void verify();
    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [orderId, purpose, retryCount, isValidReference]);

  const { data } = useQueryWrapper<User>(
    ["get-my-profile-for-success", orderId],
    "/user/get-my-profile",
    { enabled: isPaid, retry: false, staleTime: 0 },
  );

  useEffect(() => {
    if (!data) return;
    void setUserData({
      _id: data._id || "",
      name: data.name || "",
      userId: data.userId || "",
      role: data.role || "",
      email: data.email || "",
      phoneNumber: data.phoneNumber || "",
      isOtpVerified: data.isOtpVerified || "",
      numberOfConnections: data.numberOfConnections || "",
      gender: data.gender || "",
    });
  }, [data]);

  const title = isPaid
    ? "পেমেন্ট সফল হয়েছে!"
    : isFailed
      ? "পেমেন্ট নিশ্চিত করা যায়নি"
      : "পেমেন্ট যাচাই হচ্ছে...";
  const description = isPaid
    ? isPremium
      ? "আপনার প্রিমিয়াম সদস্যপদ সক্রিয় হয়েছে।"
      : "আপনার পেমেন্ট সফলভাবে যাচাই হয়েছে। এখন আপনি আপনার কানেকশন ব্যবহার করতে পারবেন।"
    : isFailed
      ? "এই পেমেন্টটি সম্পন্ন হয়েছে বলে আমরা নিশ্চিত হতে পারিনি। কোনো সুবিধা সক্রিয় করা হয়নি। প্রয়োজনে আবার চেষ্টা করুন।"
      : "ZiniPay থেকে পেমেন্টের অবস্থা যাচাই করা হচ্ছে। অনুগ্রহ করে অপেক্ষা করুন এবং এই সময়ে আরেকটি পেমেন্ট করবেন না।";

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 flex items-center justify-center p-4">
      <PurchaseTracker paymentId={paymentId} purpose={purpose} enabled={isPaid && !!paymentId} />
      <Card className="max-w-md w-full border-0 shadow-2xl">
        <CardContent className="pt-12 pb-8 px-6 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              {isPaid ? (
                <div className="relative bg-gradient-to-br from-green-400 to-green-600 rounded-full p-6">
                  <CheckCircle className="w-16 h-16 text-white" strokeWidth={2.5} />
                </div>
              ) : isFailed ? (
                <div className="relative bg-gradient-to-br from-red-400 to-red-600 rounded-full p-6">
                  <XCircle className="w-16 h-16 text-white" strokeWidth={2.5} />
                </div>
              ) : (
                <div className="relative bg-blue-100 rounded-full p-6">
                  <Loader2 className="w-16 h-16 text-blue-700 animate-spin" strokeWidth={2.5} />
                </div>
              )}
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            {title}
          </h1>
          <p className="text-base md:text-lg text-gray-600 mb-8">
            {description}
          </p>

          <div className={
            isPaid
              ? "bg-green-50 border border-green-200 rounded-lg p-4 mb-8"
              : isFailed
                ? "bg-red-50 border border-red-200 rounded-lg p-4 mb-8"
                : "bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8"
          }>
            <div className={
              isPaid
                ? "flex items-center justify-center gap-2 text-green-700"
                : isFailed
                  ? "flex items-center justify-center gap-2 text-red-700"
                  : "flex items-center justify-center gap-2 text-blue-700"
            }>
              {isPaid ? <CheckCircle className="w-5 h-5" /> :
                isFailed ? <XCircle className="w-5 h-5" /> :
                  <Loader2 className="w-5 h-5 animate-spin" />}
              <span className="font-semibold">
                {isPaid ? "লেনদেন যাচাই সম্পন্ন" : isFailed ? "লেনদেন যাচাই হয়নি" : "নিরাপদে যাচাই চলছে"}
              </span>
            </div>
            <p className="text-sm mt-2">
              {isPaid
                ? isPremium ? "আপনি এখন প্রিমিয়াম সদস্য" : "আপনার কানেকশন যুক্ত করা হয়েছে"
                : isFailed ? "আপনার অ্যাকাউন্টে কোনো পেমেন্ট সুবিধা যোগ করা হয়নি"
                  : "পেমেন্ট নিশ্চিত না হওয়া পর্যন্ত সুবিধা সক্রিয় হবে না"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {isPaid ? (
              <Button
                onClick={() => router.push("/profile")}
                className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white py-6 text-base font-semibold"
              >
                ড্যাশবোর্ডে যান
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            ) : isFailed ? (
              <Button
                onClick={() => router.push(isPremium ? "/premium" : "/pricing")}
                className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white py-6 text-base font-semibold"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                আবার চেষ্টা করুন
              </Button>
            ) : (
              <Button
                onClick={() => setRetryCount((count) => count + 1)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-semibold"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                পেমেন্টের অবস্থা আবার দেখুন
              </Button>
            )}
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="flex-1 border-2 border-gray-300 hover:bg-gray-50 py-6 text-base font-semibold"
            >
              <Home className="w-5 h-5 mr-2" />
              হোমপেজে যান
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            যেকোনো সমস্যার জন্য আমাদের সাথে যোগাযোগ করুন
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const PaymentSuccessPage = () => (
  <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-pink-50"><Loader2 className="h-10 w-10 animate-spin text-blue-700" /></div>}>
    <PaymentSuccessContent />
  </Suspense>
);

export default PaymentSuccessPage;
