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
import { normalizeBangladeshMobile } from "@/lib/bangladesh-mobile";
import PhoneNumberInput from "@/components/custom/common/PhoneNumberInput";

const ForgotPassword = () => {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const resetSubject =
    mode === "email"
      ? email.trim().toLowerCase()
      : normalizeBangladeshMobile(phoneNumber) || "";

  // Send OTP mutation
  const { mutate: sendOtp, isPending } = useCommonMutationApi({
    method: "POST",
    url: "/user/forgot-password-send-otp",
    mutationKey: ["forgot-password-otp"],
    successMessage: "অ্যাকাউন্টটি থাকলে নিবন্ধিত ফোন বা ইমেইলে OTP পাঠানো হবে",
    onSuccess: (data) => {
      // Navigate to verify OTP page with phone number
      sessionStorage.setItem("niqaha_reset_subject", resetSubject);
      sessionStorage.setItem("niqaha_reset_sent_at", String(Date.now()));
      sessionStorage.setItem("niqaha_reset_challenge", data.challengeId);
      router.push("/forgot/verify-otp");
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (mode === "phone" ? !phoneNumber : !email.trim()) {
      toast.error(mode === "phone" ? "ফোন নম্বর লিখুন" : "ইমেইল লিখুন", {
        style: { background: "red", color: "white" },
      });
      return;
    }

    if (
      mode === "phone"
        ? !resetSubject
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetSubject)
    ) {
      toast.error(
        mode === "phone"
          ? "ফোন OTP আপাতত শুধু সঠিক বাংলাদেশি মোবাইল নম্বরে পাঠানো যায়। বিদেশি নম্বর হলে ইমেইল OTP নির্বাচন করুন।"
          : "সঠিক নিবন্ধিত ইমেইল লিখুন",
        {
          duration: 5000,
          style: { background: "red", color: "white" },
        },
      );
      return;
    }

    // Send OTP
    if (isPending) return;
    sendOtp({ phoneNumber: resetSubject });
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
            আপনার নিবন্ধিত ফোন নম্বর বা ইমেইল দিন, আমরা একটি ওটিপি পাঠাব
          </p>
        </div>

        {/* Main Card */}
        <Card className="border border-gray-200 shadow-lg py-0">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-pink-100 border-b border-gray-200">
            <CardTitle className="text-xl text-pink-800 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              ফোন বা ইমেইল যাচাই
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div
                className="grid grid-cols-2 gap-1 rounded-xl bg-pink-50 p-1"
                role="group"
                aria-label="OTP পাঠানোর মাধ্যম"
              >
                <button
                  type="button"
                  onClick={() => setMode("phone")}
                  aria-pressed={mode === "phone"}
                  className={`h-10 rounded-lg text-sm font-semibold ${mode === "phone" ? "bg-white text-pink-700 shadow-sm" : "text-gray-600"}`}
                >
                  মোবাইল
                </button>
                <button
                  type="button"
                  onClick={() => setMode("email")}
                  aria-pressed={mode === "email"}
                  className={`h-10 rounded-lg text-sm font-semibold ${mode === "email" ? "bg-white text-pink-700 shadow-sm" : "text-gray-600"}`}
                >
                  ইমেইল
                </button>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor={mode === "phone" ? "phoneNumber" : "email"}
                  className="text-gray-700 font-medium"
                >
                  {mode === "phone" ? "মোবাইল নম্বর" : "ইমেইল ঠিকানা"}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                {mode === "phone" ? (
                  <PhoneNumberInput
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={setPhoneNumber}
                    required
                    disabled={isPending}
                  />
                ) : (
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isPending}
                    className="h-12 text-base border-gray-300 focus:border-pink-500 focus:ring-pink-500"
                  />
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {mode === "phone"
                    ? "বাংলাদেশের মোবাইল নম্বরের জন্য +880 ডিফল্ট। বিদেশি নম্বর হলে ইমেইল OTP ব্যবহার করুন।"
                    : "আপনার অ্যাকাউন্টে নিবন্ধিত ইমেইল লিখুন।"}
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
                onClick={() => router.push("/login")}
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
