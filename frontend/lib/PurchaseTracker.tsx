"use client";

import { useEffect } from "react";
import { getTrackingPurchase } from "@/actions/auth";
import { hasTrackingConsent, purchaseEvent } from "./google-tag-manager";

type PurchasePurpose = "premium" | "connections";

export default function PurchaseTracker({
  paymentId,
  purpose,
  enabled = false,
}: {
  paymentId?: string;
  purpose?: PurchasePurpose;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled || !paymentId || paymentId.length > 150 ||
      !purpose || !["premium", "connections"].includes(purpose)) return;

    let cancelled = false;
    const track = async () => {
      if (!hasTrackingConsent()) return;
      try {
        const receipt = await getTrackingPurchase(paymentId, purpose);
        if (!cancelled && receipt) await purchaseEvent(receipt);
      } catch {
        // Tracking must never interrupt a verified payment.
      }
    };

    void track();
    window.addEventListener("niqaha:tracking-consent-granted", track);
    return () => {
      cancelled = true;
      window.removeEventListener("niqaha:tracking-consent-granted", track);
    };
  }, [enabled, paymentId, purpose]);

  return null;
}
