"use client";

import { useEffect } from "react";
import { getTrackingPurchase } from "@/actions/auth";
import { hasTrackingConsent, purchaseEvent } from "./google-tag-manager";

export default function PurchaseTracker() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("payment_id");
    const purpose = params.get("purpose");
    if (!paymentId || paymentId.length > 150 || !["premium", "connections"].includes(purpose || "")) return;
    let cancelled = false;
    const track = async () => {
      if (!hasTrackingConsent()) return;
      try {
        const receipt = await getTrackingPurchase(paymentId, purpose as "premium" | "connections");
        if (!cancelled && receipt) await purchaseEvent(receipt);
      } catch { /* Tracking must not interrupt the completed payment. */ }
    };
    void track();
    window.addEventListener("niqaha:tracking-consent-granted", track);
    return () => {
      cancelled = true;
      window.removeEventListener("niqaha:tracking-consent-granted", track);
    };
  }, []);
  return null;
}
