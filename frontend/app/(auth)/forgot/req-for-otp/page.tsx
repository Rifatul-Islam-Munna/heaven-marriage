"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, ArrowRight, Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { toast } from "sonner";
import Image from "next/image";

const ForgotPassword = () => {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");

  // Send OTP mutation
  const { mutate: sendOtp, isPending } = useCommonMutationApi({
    method: "POST",
    url: "/user/forgot-password-send-otp",
    mutationKey: ["forgot-password-otp"],
    successMessage: "ওটিপি আপনার ফোনে পাঠানো হয়েছে",
    onSuccess: (data) => {
      // Navigate to verify OTP page with phone number
      router.push(`/forgot/verify-otp?phone=${phoneNumber}`);
    },
  });

  // Validate phone number
  const validatePhone = (phone: string) => {
    // Bangladesh phone number validation (11 digits starting with 01)
    const phoneRegex = /^01[3-9]\d{8}$/;
    return phoneRegex.test(phone);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!phoneNumber) {
      toast.error("ফোন নম্বর লিখুন", {
        style: { background: "red", color: "white" },
      });
      return;
    }

    if (!validatePhone(phoneNumber)) {
      toast.error("সঠিক ফোন নম্বর লিখুন (যেমন: 01712345678)", {
        duration: 5000,
        style: { background: "red", color: "white" },
      });
      return;
    }

    // Send OTP
    sendOtp({ phoneNumber });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo/Header Section */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-pink-100 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-pink-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            পাসওয়ার্ড ভুলে গেছেন?
          </h1>
          <p className="text-gray-600 text-sm">
            আপনার ফোন নম্বর দিন, আমরা আপনাকে একটি ওটিপি পাঠাব
          </p>
        </div>

        {/* Main Card */}
        <Card className="border border-gray-200 shadow-lg py-0">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-pink-100 border-b border-gray-200">
            <CardTitle className="text-xl text-pink-800 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              ফোন নম্বর যাচাই
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Phone Number Input */}
              <div className="space-y-2">
                <Label
                  htmlFor="phoneNumber"
                  className="text-gray-700 font-medium"
                >
                  ফোন নম্বর <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="01712345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10 h-12 text-lg border-gray-300 focus:border-pink-500 focus:ring-pink-500"
                    maxLength={11}
                    disabled={isPending}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  আপনার নিবন্ধিত ফোন নম্বর লিখুন
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-12 bg-pink-600 hover:bg-pink-700 text-white text-lg font-semibold flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    পাঠানো হচ্ছে...
                  </>
                ) : (
                  <>
                    ওটিপি পাঠান
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">অথবা</span>
              </div>
            </div>

            {/* Back to Login Link */}
            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/auth/login")}
                className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
              >
                লগইন পেজে ফিরে যান
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            সমস্যা হচ্ছে?{" "}
            <a
              href="/contact"
              className="text-pink-600 hover:text-pink-700 font-medium"
            >
              আমাদের সাথে যোগাযোগ করুন
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
