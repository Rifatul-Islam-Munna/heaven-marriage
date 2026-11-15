"use client";
import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearTrackingUser, pageViewEvent, updateTrackingConsent } from "./google-tag-manager";
export default function TrackingConsent() {
  const [choice, setChoice] = useState<string | null>("loading");
  useEffect(() => {
    try {
      setChoice(localStorage.getItem("niqaha_tracking_consent_v3"));
    } catch {
      setChoice("denied");
    }
  }, []);
  useEffect(() => {
    const openSettings = () => setChoice(null);
    window.addEventListener("niqaha:open-cookie-settings", openSettings);
    return () => window.removeEventListener("niqaha:open-cookie-settings", openSettings);
  }, []);
  const choose = (value: "granted" | "denied") => {
    const stored = updateTrackingConsent(value);
    const granted = stored && value === "granted";
    setChoice(granted ? "granted" : "denied");
    window.dataLayer = window.dataLayer || [];
    function gtag(..._args: unknown[]) {
      window.dataLayer?.push(arguments);
    }
    gtag("consent", "update", {
      analytics_storage: granted ? "granted" : "denied",
      ad_storage: granted ? "granted" : "denied",
      ad_user_data: granted ? "granted" : "denied",
      ad_personalization: granted ? "granted" : "denied",
    });
    if (granted) {
      void pageViewEvent();
      window.dispatchEvent(new Event("niqaha:tracking-consent-granted"));
    }
    else if (window.dataLayer) {
      const cleared = clearTrackingUser();
      window.dataLayer.push({
        ...cleared,
        event: "consent_revoked",
        analytics_consent: "denied",
      });
      // Reload with the stored denied consent state so it applies before GTM starts.
      if (stored) window.location.reload();
    }
  };
  return (
    <>
      {choice === null && (
        <section
          role="region"
          aria-labelledby="cookie-consent-title"
          className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] left-1/2 z-[60] max-h-[calc(100dvh-100px)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 overflow-y-auto rounded-2xl border border-primary/20 bg-background p-4 shadow-xl sm:p-5 lg:bottom-4 lg:max-h-[calc(100dvh-2rem)]"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Cookie size={19} aria-hidden="true" />
            </span>
            <div>
              <h2 id="cookie-consent-title" className="font-heading text-xl font-bold text-foreground">
                কুকি ব্যবহারের অনুমতি
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                সাইট উন্নত করতে অ্যানালিটিক্স ও বিজ্ঞাপনের কার্যকারিতা মাপতে ঐচ্ছিক কুকি ব্যবহার করি। অনুমতি দিলে লগইন করা অ্যাকাউন্টে দেওয়া নাম, ইমেইল, মোবাইল নম্বর ও ঠিকানাও ট্র্যাকিংয়ের জন্য ব্যবহার করা হবে।
              </p>
              <details className="mt-1 text-sm text-muted-foreground">
                <summary className="cursor-pointer font-medium text-primary">আরও জানুন</summary>
                <p className="mt-2 leading-6">
                  অ্যানালিটিক্সে ব্যবহারকারীর আইডি দিয়ে পৃষ্ঠা ও ফিচারের ব্যবহার বুঝি; বিজ্ঞাপনে প্রচারের ফল মাপি। প্রত্যাখ্যান করলেও সাইট চলবে। পরে ফুটারের কুকি সেটিংস থেকে পছন্দ বদলাতে পারবেন।
                </p>
              </details>
            </div>
          </div>
          <div className="mt-4 flex gap-3 sm:justify-end">
            <Button variant="outline" onClick={() => choose("denied")} className="h-10 flex-1 sm:min-w-32 sm:flex-none">
              প্রত্যাখ্যান
            </Button>
            <Button onClick={() => choose("granted")} className="h-10 flex-1 sm:min-w-32 sm:flex-none">
              অনুমতি দিন
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
