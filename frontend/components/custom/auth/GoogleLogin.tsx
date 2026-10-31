"use client";
import { useState } from "react";
import { registrationEvent } from "@/lib/google-tag-manager";
import { loginWithGoogle } from "@/actions/auth";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function LoginWithGoogle({
  signup = false,
}: {
  signup?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [scriptFailed, setScriptFailed] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID?.trim();
  const { mutate, isPending } = useMutation({
    mutationKey: ["loginWithGoogle"],
    mutationFn: (idToken: string) => loginWithGoogle(idToken),
    onSuccess: (result) => {
      if (result.error || !result.data?.user) {
        toast.error(
          result.error?.message || "Google sign-in failed. Please try again.",
        );
        return;
      }
      if (result.data.isNewUser)
        registrationEvent(String(result.data.user._id), "google");
      queryClient.clear();
      router.replace(
        ["admin","seo","blog","manager"].includes(result.data.user.role) ? "/dashboard" : "/profile",
      );
      router.refresh();
    },
    onError: () => toast.error("Google sign-in failed. Please try again."),
  });
  if (!clientId || scriptFailed)
    return (
      <div className="text-center space-y-2">
        <Button type="button" variant="outline" disabled className="w-full">
          Continue with Google
        </Button>
        <p role="status" className="text-xs text-gray-500">
          {scriptFailed
            ? "Google লোড হয়নি। পেজটি রিফ্রেশ করুন অথবা ইমেইল/ফোন ব্যবহার করুন।"
            : "Google sign-in চালু করতে সাইটের Google configuration প্রয়োজন।"}
        </p>
      </div>
    );
  return (
    <GoogleOAuthProvider
      clientId={clientId}
      onScriptLoadError={() => setScriptFailed(true)}
    >
      <div className="flex justify-center" aria-busy={isPending}>
        {isPending ? (
          <p role="status" className="text-sm text-pink-600">
            সাইন ইন হচ্ছে...
          </p>
        ) : (
          <GoogleLogin
            text={signup ? "signup_with" : "signin_with"}
            size="large"
            theme="outline"
            shape="rectangular"
            onSuccess={({ credential }) =>
              credential
                ? mutate(credential)
                : toast.error(
                    "Google did not return a sign-in credential. Please retry.",
                  )
            }
            onError={() =>
              toast.error("Google sign-in was unsuccessful. Please try again.")
            }
          />
        )}
      </div>
    </GoogleOAuthProvider>
  );
}
