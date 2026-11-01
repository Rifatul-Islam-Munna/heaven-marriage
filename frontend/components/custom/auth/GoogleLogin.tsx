"use client";
import { useEffect, useRef, useState } from "react";
import { registrationEvent } from "@/lib/google-tag-manager";
import { loginWithGoogle } from "@/actions/auth";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Google renders its button at a fixed pixel width (max 400), so measure the slot. */
function useSlotWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setWidth(Math.min(400, Math.floor(node.getBoundingClientRect().width)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export default function LoginWithGoogle({
  signup = false,
}: {
  signup?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [scriptFailed, setScriptFailed] = useState(false);
  const [slotRef, slotWidth] = useSlotWidth();
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
      <div className="space-y-2 text-center">
        <Button type="button" variant="outline" disabled className="h-12 w-full text-base">
          Google দিয়ে চালিয়ে যান
        </Button>
        <p role="status" className="text-xs text-gray-500">
          {scriptFailed
            ? "Google লোড হয়নি। পেজটি রিফ্রেশ করুন অথবা নিচে মোবাইল/ইমেইল ব্যবহার করুন।"
            : "Google sign-in চালু করতে সাইটের Google configuration প্রয়োজন।"}
        </p>
      </div>
    );
  return (
    <GoogleOAuthProvider
      clientId={clientId}
      onScriptLoadError={() => setScriptFailed(true)}
    >
      <div ref={slotRef} data-google-signin className="flex min-h-12 w-full items-center justify-center" aria-busy={isPending}>
        {isPending ? (
          <p role="status" className="text-sm text-pink-600">
            সাইন ইন হচ্ছে...
          </p>
        ) : slotWidth > 0 && (
          <GoogleLogin
            key={slotWidth}
            text={signup ? "signup_with" : "continue_with"}
            size="large"
            theme="outline"
            shape="pill"
            logo_alignment="center"
            width={slotWidth}
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
