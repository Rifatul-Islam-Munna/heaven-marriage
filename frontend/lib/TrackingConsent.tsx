"use client";
import { useEffect, useState } from "react";
import { GoogleTagManager } from "@next/third-parties/google";
import { Cookie } from "lucide-react";
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
  useEffect(() => {
    const openSettings = () => setChoice(null);
    window.addEventListener("niqaha:open-cookie-settings", openSettings);
    return () => window.removeEventListener("niqaha:open-cookie-settings", openSettings);
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
      {choice === null && (
        <section
          role="region"
          aria-labelledby="cookie-consent-title"
          className="fixed bottom-4 left-1/2 z-[60] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 overflow-y-auto rounded-2xl border border-primary/20 bg-background p-4 shadow-xl sm:p-5"
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
                সাইট উন্নত করতে অ্যানালিটিক্স ও বিজ্ঞাপনের কার্যকারিতা মাপতে ঐচ্ছিক কুকি ব্যবহার করি।
              </p>
              <details className="mt-1 text-sm text-muted-foreground">
                <summary className="cursor-pointer font-medium text-primary">আরও জানুন</summary>
                <p className="mt-2 leading-6">
                  অ্যানালিটিক্সে পৃষ্ঠা ও ফিচারের ব্যবহার বুঝি; বিজ্ঞাপনে প্রচারের ফল মাপি। প্রত্যাখ্যান করলেও সাইট চলবে। পরে ফুটারের কুকি সেটিংস থেকে পছন্দ বদলাতে পারবেন।
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
