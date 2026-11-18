"use client";

import { registrationEvent } from "@/lib/google-tag-manager";
import { PostRequestAxios } from "@/api-hooks/api-hooks";
import { useState } from "react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { setOtpData } from "@/actions/auth";

function OTP() {
  const [otp, setOtp] = useState("");
  const [isResending, setIsResending] = useState(false);
  const router = useRouter();

  /*  const { mutate, isPending } = useCommonMutationApi({
    method: "POST",
    url: "/user/verify-otp",
    successMessage: "OTP যাচাই সফল হয়েছে!",
    onSuccess: () => {
      router.push("/login");
    },
  }); */
  const { mutate, isPending } = useMutation({
    mutationKey: ["verify-otp"],
    mutationFn: (payload: Record<string, unknown>) => setOtpData(payload),
    onSuccess: async (data) => {
      if (data?.error) {
        toast.error(data?.error?.message);
        return;
      }
      sessionStorage.removeItem("niqaha_challenge");
      if (data.data?.data) {
        await registrationEvent(
          data.data.data,
          sessionStorage.getItem("niqaha_registration_method") === "email"
            ? "email"
            : "phone",
        );
      }
      sessionStorage.removeItem("niqaha_registration_method");
      router.push("/profile/my-profile");
    },
  });
  // Function to verify OTP
  const verifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("সম্পূর্ণ OTP লিখুন");
      return;
    }

    const challengeId = sessionStorage.getItem("niqaha_challenge");
    if (!challengeId) {
      toast.error("Please start registration again");
      return;
    }
    mutate({ otp, challengeId });
  };

  return (
    <div className="flex min-h-[100svh] items-center justify-center overflow-y-auto px-3 py-4 sm:p-6 md:p-8">
      <div className="flex w-full max-w-md flex-col items-center justify-center space-y-4 sm:space-y-6">
        <div className="text-center space-y-2 sm:space-y-3">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            OTP যাচাই করুন
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground px-4">
            আপনার ইমেইল বা মোবাইলে পাঠানো সর্বশেষ ৬ সংখ্যার OTP লিখুন
          </p>
        </div>

        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
            disabled={isPending}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            aria-label="৬ সংখ্যার OTP"
          >
            <InputOTPGroup>
              <InputOTPSlot
                index={0}
                className="h-10 w-10 text-base sm:h-12 sm:w-12 sm:text-lg"
              />
              <InputOTPSlot
                index={1}
                className="h-10 w-10 text-base sm:h-12 sm:w-12 sm:text-lg"
              />
              <InputOTPSlot
                index={2}
                className="h-10 w-10 text-base sm:h-12 sm:w-12 sm:text-lg"
              />
              <InputOTPSlot
                index={3}
                className="h-10 w-10 text-base sm:h-12 sm:w-12 sm:text-lg"
              />
              <InputOTPSlot
                index={4}
                className="h-10 w-10 text-base sm:h-12 sm:w-12 sm:text-lg"
              />
              <InputOTPSlot
                index={5}
                className="h-10 w-10 text-base sm:h-12 sm:w-12 sm:text-lg"
              />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={isResending || isPending}
          onClick={async () => {
            const challengeId = sessionStorage.getItem("niqaha_challenge");
            if (!challengeId) {
              toast.error("Please start registration again");
              return;
            }
            setIsResending(true);
            try {
              const [data, error] = await PostRequestAxios<{
                challengeId: string;
              }>("/user/resend-otp", { challengeId });
              if (data?.challengeId) {
                sessionStorage.setItem("niqaha_challenge", data.challengeId);
                setOtp("");
                toast.success(
                  "নতুন OTP পাঠানো হয়েছে। সর্বশেষ ইমেইলের কোডটি লিখুন।",
                );
              } else {
                toast.error(error?.message || "Unable to resend OTP");
              }
            } catch {
              toast.error("OTP পাঠানো যায়নি। আবার চেষ্টা করুন।");
            } finally {
              setIsResending(false);
            }
          }}
        >
          {isResending ? "পাঠানো হচ্ছে..." : "OTP আবার পাঠান"}
        </Button>
        <Button
          onClick={verifyOtp}
          disabled={otp.length !== 6 || isPending}
          className="h-10 w-full max-w-sm text-sm sm:h-12 sm:text-base"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              যাচাই হচ্ছে...
            </>
          ) : (
            "যাচাই করুন"
          )}
        </Button>
      </div>
    </div>
  );
}

export default OTP;
