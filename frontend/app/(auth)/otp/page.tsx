"use client";

import { useState } from "react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { setOtpData } from "@/actions/auth";

function OTP() {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
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
    mutationFn: (payoad: Record<string, any>) => setOtpData(payoad),
    onSuccess: (data) => {
      if (data?.error) {
        toast.error(data?.error?.message);
        return;
      }
      router.push("/profile/my-profile");
    },
  });
  // Function to verify OTP
  const verifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("সম্পূর্ণ OTP লিখুন");
      return;
    }

    mutate({ otp: otp });
  };

  return (
    <div className="flex items-center justify-center min-h-[100dvh] p-4 sm:p-6 md:p-8">
      <div className="flex flex-col items-center justify-center space-y-6 sm:space-y-8 w-full max-w-md">
        <div className="text-center space-y-2 sm:space-y-3">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            OTP যাচাই করুন
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground px-4">
            আমরা আপনার নম্বরে যে OTP পাঠিয়েছি তা লিখুন
          </p>
        </div>

        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(value) => setOtp(value)}
            disabled={isPending}
          >
            <InputOTPGroup>
              <InputOTPSlot
                index={0}
                className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl"
              />
              <InputOTPSlot
                index={1}
                className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl"
              />
              <InputOTPSlot
                index={2}
                className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl"
              />
              <InputOTPSlot
                index={3}
                className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl"
              />
              <InputOTPSlot
                index={4}
                className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl"
              />
              <InputOTPSlot
                index={5}
                className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl"
              />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          onClick={verifyOtp}
          disabled={otp.length !== 6 || isPending}
          className="w-full max-w-sm h-11 sm:h-12 text-base sm:text-lg"
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
