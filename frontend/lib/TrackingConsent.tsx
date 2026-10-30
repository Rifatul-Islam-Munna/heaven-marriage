"use client";
import { useEffect, useState } from "react";
import { GoogleTagManager } from "@next/third-parties/google";
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
      {choice === null && (
        <div
          role="region"
          aria-label="Analytics consent"
          className="fixed bottom-3 left-3 z-[60] max-w-sm rounded-xl border border-pink-200 bg-white p-4 shadow-lg text-sm"
        >
          <p>
            আপনার অনুমতিতে অ্যানালিটিক্স ও বিজ্ঞাপনের কুকি ব্যবহার করতে চাই।
          </p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => choose("granted")}
              className="rounded bg-pink-600 px-4 py-2 text-white"
            >
              অনুমতি দিন
            </button>
            <button
              onClick={() => choose("denied")}
              className="rounded border px-4 py-2"
            >
              প্রত্যাখ্যান
            </button>
          </div>
        </div>
      )}
      {choice !== null && choice !== "loading" && (
        <button
          onClick={() => {
            setChoice(null);
          }}
          className="fixed bottom-1 left-2 z-[60] rounded bg-white/90 px-2 py-1 text-xs text-gray-600"
        >
          কুকি সেটিংস
        </button>
      )}
    </>
  );
}
