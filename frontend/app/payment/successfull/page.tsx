"use client";

import React, { useEffect } from "react";
import { CheckCircle, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { User, UserInfo } from "@/@types/user";
import { setUserData } from "@/actions/auth";

const PaymentSuccessPage = () => {
  const router = useRouter();
  const { data, isLoading } = useQueryWrapper<User>(
    ["get-my-profile-for-success"],
    "/user/get-my-profile",
  );

  useEffect(() => {
    if (data) {
      const Payload = {
        _id: data?._id || "",
        name: data?.name || "",
        userId: data?.userId || "",
        role: data?.role || "",
        email: data?.email || "",
        phoneNumber: data?.phoneNumber || "",
        password: data?.password || "",
        isOtpVerified: data?.isOtpVerified || "",
        numberOfConnections: data?.numberOfConnections || "",
        gender: data?.gender || "",
      };
      const saveData = async () => {
        await setUserData(Payload);
      };
      saveData();
    }
  }, [data]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-0 shadow-2xl">
        <CardContent className="pt-12 pb-8 px-6 text-center">
          {/* Success Icon with Animation */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-green-400 to-green-600 rounded-full p-6">
                <CheckCircle
                  className="w-16 h-16 text-white"
                  strokeWidth={2.5}
                />
              </div>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            পেমেন্ট সফল হয়েছে!
          </h1>
          <p className="text-base md:text-lg text-gray-600 mb-8">
            আপনার পেমেন্ট সফলভাবে সম্পন্ন হয়েছে। এখন আপনি আপনার প্যাকেজ ব্যবহার
            করতে পারবেন।
          </p>

          {/* Success Details */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">লেনদেন সম্পন্ন হয়েছে</span>
            </div>
            <p className="text-sm text-green-600 mt-2">
              আপনার কানেকশন যুক্ত করা হয়েছে
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => router.push("/profile")}
              className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white py-6 text-base font-semibold"
            >
              ড্যাশবোর্ডে যান
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="flex-1 border-2 border-gray-300 hover:bg-gray-50 py-6 text-base font-semibold"
            >
              <Home className="w-5 h-5 mr-2" />
              হোমপেজে যান
            </Button>
          </div>

          {/* Footer Message */}
          <p className="text-xs text-gray-500 mt-6">
            যেকোনো সমস্যার জন্য আমাদের সাথে যোগাযোগ করুন
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccessPage;
