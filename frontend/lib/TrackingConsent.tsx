"use client";
import { useEffect, useState } from "react";
import { GoogleTagManager } from "@next/third-parties/google";
import { BarChart3, Cookie, Megaphone } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { hasTrackingConsent, pageViewEvent } from "./google-tag-manager";
export default function TrackingConsent() {
  const [choice, setChoice] = useState<string | null>("loading");
  useEffect(() => {
    try {
      setChoice(localStorage.getItem("niqaha_tracking_consent"));
    } catch {
      setChoice("denied");
    }
  }, []);
  const choose = (value: string) => {
    try {
      localStorage.setItem("niqaha_tracking_consent", value);
    } catch {
      /* fail closed */
    }
    setChoice(value);
    window.dataLayer = window.dataLayer || [];
    function gtag(..._args: unknown[]) {
      window.dataLayer?.push(arguments);
    }
    gtag("consent", "update", {
      analytics_storage: value === "granted" ? "granted" : "denied",
      ad_storage: value === "granted" ? "granted" : "denied",
      ad_user_data: value === "granted" ? "granted" : "denied",
      ad_personalization: value === "granted" ? "granted" : "denied",
    });
    if (value === "granted") pageViewEvent();
    else if (window.dataLayer) {
      window.dataLayer.push({
        event: "consent_revoked",
        analytics_consent: "denied",
      });
      // Unload any third party listeners after withdrawal.
      window.location.reload();
    }
  };
  return (
    <>
      {choice === "granted" && hasTrackingConsent() && (
        <GoogleTagManager
          gtmId={process.env.NEXT_PUBLIC_GTM_ID || "GTM-K8LP7V8D"}
        />
      )}
      <AlertDialog open={choice === null}>
        <AlertDialogContent
          className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 shadow-2xl"
          style={{ maxWidth: "min(42rem, calc(100vw - 2rem))" }}
        >
          <div className="border-b border-border bg-primary/5 p-6 sm:p-8">
            <span className="mb-5 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Cookie size={25} aria-hidden="true" />
            </span>
            <AlertDialogHeader className="text-left sm:text-left">
              <AlertDialogTitle className="font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                আপনার কুকি পছন্দ
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-2 text-base leading-7 text-muted-foreground">
                আপনার অনুমতি নিয়ে অ্যানালিটিক্স ও বিজ্ঞাপনের কুকি ব্যবহার করতে চাই। কী কাজে লাগে, নিচে দেখুন।
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4">
                <BarChart3 size={21} className="mb-3 text-primary" aria-hidden="true" />
                <h3 className="font-semibold text-foreground">অ্যানালিটিক্স</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  কোন পৃষ্ঠা ও ফিচার ব্যবহার হচ্ছে, তা বুঝে সাইট উন্নত করতে সাহায্য করে।
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <Megaphone size={21} className="mb-3 text-primary" aria-hidden="true" />
                <h3 className="font-semibold text-foreground">বিজ্ঞাপন</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  আমাদের প্রচার কতটা কার্যকর হচ্ছে, তা বুঝতে সাহায্য করে।
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              এই কুকিগুলো ঐচ্ছিক। প্রত্যাখ্যান করলেও সাইটের মূল কাজ চলবে। পরে “কুকি সেটিংস” থেকে পছন্দ বদলাতে পারবেন।
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <AlertDialogCancel onClick={() => choose("denied")} className="h-11 w-full">
                প্রত্যাখ্যান
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => choose("granted")} className="h-11 w-full">
                অনুমতি দিন
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      {choice !== null && choice !== "loading" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setChoice(null)}
          className="fixed bottom-4 left-4 z-[60] bg-background/95 shadow-sm"
        >
          কুকি সেটিংস
        </Button>
      )}
    </>
  );
}
