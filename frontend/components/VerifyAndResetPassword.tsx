"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  ArrowRight,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { toast } from "sonner";

const VerifyAndResetPassword = () => {
  const router = useRouter();
  const [phoneNumber,setPhoneNumber]=useState("");
  useEffect(()=>{setPhoneNumber(sessionStorage.getItem("niqaha_reset_subject")||"");},[]);

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Verify OTP and Reset Password mutation (combined)
  const { mutate: resetPassword, isPending } = useCommonMutationApi({
    method: "POST",
    url: "/user/verify-and-reset-password",
    mutationKey: ["verify-reset-password"],
    successMessage: "পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে",
    onSuccess: () => {
      for (const key of ["niqaha_reset_subject","niqaha_reset_challenge","niqaha_reset_sent_at"]) sessionStorage.removeItem(key);
      router.replace("/login");
    },
  });

  // Resend OTP mutation
  const { mutate: resendOtp, isPending: isResending } = useCommonMutationApi({
    method: "POST",
    url: "/user/forgot-password-send-otp",
    mutationKey: ["resend-otp"],
    successMessage: "ওটিপি পুনরায় পাঠানো হয়েছে",
    onSuccess: (data) => {
      sessionStorage.setItem("niqaha_reset_challenge",data.challengeId);
      sessionStorage.setItem("niqaha_reset_sent_at",String(Date.now()));
      setOtp("");
      setTimer(60);
      setCanResend(false);
    },
  });

  useEffect(() => {
    const sent = Number(sessionStorage.getItem("niqaha_reset_sent_at") || Date.now());
    const remaining = Math.max(0, Math.ceil((sent + 60000 - Date.now()) / 1000));
    setTimer(remaining);
    setCanResend(remaining === 0);
  }, []);
  // Countdown timer
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // Redirect if no phone number
  useEffect(() => {
    if (!sessionStorage.getItem("niqaha_reset_subject") || !sessionStorage.getItem("niqaha_reset_challenge")) {
      router.push("/forgot/req-for-otp");
    }
  }, [phoneNumber, router]);

  // Format timer display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!otp || !newPassword || !confirmPassword) {
      toast.error("সকল তথ্য পূরণ করুন", {
        style: { background: "red", color: "white" },
      });
      return;
    }

    if (otp.length !== 6) {
      toast.error("৬ সংখ্যার ওটিপি লিখুন", {
        style: { background: "red", color: "white" },
      });
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 50) {
      toast.error("পাসওয়ার্ড ৮ থেকে ৫০ অক্ষরের হতে হবে", {
        duration: 5000,
        style: { background: "red", color: "white" },
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("পাসওয়ার্ড মিলছে না", {
        style: { background: "red", color: "white" },
      });
      return;
    }

    if (isPending || isResending) return;
    // Verify OTP and Reset password
    resetPassword({
      phoneNumber,
      challengeId:sessionStorage.getItem("niqaha_reset_challenge"),
      otp,
      newPassword,
    });
  };

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { text: "", color: "", width: "0%" };
    if (password.length < 8)
      return { text: "দুর্বল", color: "bg-red-500", width: "33%" };
    if (password.length < 10)
      return { text: "মধ্যম", color: "bg-yellow-500", width: "66%" };
    return { text: "শক্তিশালী", color: "bg-green-500", width: "100%" };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-pink-50 via-white to-pink-50 flex items-center justify-center px-3 py-4">
      <div className="w-full max-w-md">
        {/* Header Section - Compact */}
        <div className="text-center mb-4">
          <div className="w-14 h-14 mx-auto mb-2 bg-pink-100 rounded-full flex items-center justify-center">
            <Shield className="w-7 h-7 text-pink-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
            পাসওয়ার্ড রিসেট করুন
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{phoneNumber}</span>{" "}
            এ পাঠানো ওটিপি দিন
          </p>
        </div>

        {/* Main Card - Compact */}
        <Card className="border border-gray-200 shadow-sm py-0">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-pink-100 border-b border-gray-200 py-3 px-4">
            <CardTitle className="text-base sm:text-lg text-pink-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">
                  ওটিপি যাচাই ও পাসওয়ার্ড সেট
                </span>
                <span className="sm:hidden">যাচাই করুন</span>
              </span>
              {!canResend && (
                <span className="text-xs font-mono bg-white px-2 py-0.5 rounded-full text-pink-700">
                  {formatTime(timer)}
                </span>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-4 sm:p-5">
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* OTP Input - Compact */}
              <div className="space-y-1">
                <Label
                  htmlFor="otp"
                  className="text-sm text-gray-700 font-medium"
                >
                  ওটিপি কোড <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="৬ সংখ্যার কোড"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[০-৯]/g,n=>String("০১২৩৪৫৬৭৮৯".indexOf(n))).replace(/\D/g, ""))}
                  className="h-11 text-xl text-center tracking-[0.5em] font-bold border-2 border-gray-300 focus:border-pink-500 focus:ring-pink-500"
                  maxLength={6}
                  disabled={isPending}
                  autoComplete="one-time-code"
                />
                <p className="text-[10px] sm:text-xs text-gray-500 text-center">
                  ফোন বা ইমেইলে পাঠানো ৬ সংখ্যার কোড লিখুন। কোডের মেয়াদ ১০ মিনিট।
                </p>
              </div>

              <Button type="button" variant="ghost" className="w-full text-pink-600" disabled={!canResend || isResending || isPending}
                onClick={() => { if (canResend && !isResending) resendOtp({ phoneNumber }); }}>
                {isResending ? "পাঠানো হচ্ছে..." : canResend ? "আবার OTP পাঠান" : `আবার পাঠাতে অপেক্ষা করুন (${formatTime(timer)})`}
              </Button>
              {/* Divider - Compact */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-500 font-medium">
                    নতুন পাসওয়ার্ড
                  </span>
                </div>
              </div>

              {/* New Password Input - Compact */}
              <div className="space-y-1">
                <Label
                  htmlFor="newPassword"
                  className="text-sm text-gray-700 font-medium"
                >
                  নতুন পাসওয়ার্ড <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input
                    id="newPassword"
                    minLength={8} maxLength={50} autoComplete="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="কমপক্ষে ৮ অক্ষর"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-10 pl-9 pr-9 text-sm border-gray-300 focus:border-pink-500 focus:ring-pink-500"
                    disabled={isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {newPassword && (
                  <div className="space-y-1">
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-600">
                      শক্তি:{" "}
                      <span className="font-semibold">
                        {passwordStrength.text}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password Input - Compact */}
              <div className="space-y-1">
                <Label
                  htmlFor="confirmPassword"
                  className="text-sm text-gray-700 font-medium"
                >
                  পাসওয়ার্ড নিশ্চিত করুন{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input
                    id="confirmPassword"
                    minLength={8} maxLength={50} autoComplete="new-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="পাসওয়ার্ড আবার লিখুন"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-10 pl-9 pr-9 text-sm border-gray-300 focus:border-pink-500 focus:ring-pink-500"
                    disabled={isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {confirmPassword && newPassword === confirmPassword && (
                  <p className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    পাসওয়ার্ড মিলেছে
                  </p>
                )}
              </div>

              {/* Password Requirements - Compact */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                <p className="text-[10px] sm:text-xs font-semibold text-blue-900 mb-0.5">
                  পাসওয়ার্ড নির্দেশনা:
                </p>
                <ul className="text-[10px] text-blue-800 space-y-0"><li>পাসওয়ার্ড ৮ থেকে ৫০ অক্ষরের হতে হবে। একটি নতুন ও শক্তিশালী পাসওয়ার্ড ব্যবহার করুন।</li>
                </ul>
              </div>

              {/* Submit Button - Compact */}
              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-10 bg-pink-600 hover:bg-pink-700 text-white text-sm sm:text-base font-semibold flex items-center justify-center gap-2 mt-3"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    প্রক্রিয়াধীন...
                  </>
                ) : (
                  <>
                    পাসওয়ার্ড পরিবর্তন করুন
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Back Button - Compact */}
            <div className="mt-3 text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => router.push("/forgot/req-for-otp")}
                className="text-gray-600 hover:text-gray-700 hover:bg-gray-100 h-8 text-xs sm:text-sm"
              >
                ← নম্বর পরিবর্তন করুন
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Section - Compact */}
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-[10px] sm:text-xs text-blue-800 text-center">
            💡 ওটিপি এবং নতুন পাসওয়ার্ড একসাথে দিয়ে সাবমিট করুন
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyAndResetPassword;
