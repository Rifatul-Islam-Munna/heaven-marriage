"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PostRequestAxios } from "@/api-hooks/api-hooks";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useUser } from "@/lib/useUser";

type PremiumSummary = { accountType?: string };

export default function PremiumCheckoutButton({ amount }: { amount: string }) {
  const router = useRouter();
  const { user, loading } = useUser();
  const [paying, setPaying] = useState(false);
  const { data: summary } = useQueryWrapper<PremiumSummary>(
    ["platform-summary"], "/platform/summary",
    { enabled: !!user && user.role === "user", retry: false, staleTime: 30000 },
  );
  const subscribed = summary?.accountType === "premium";

  const beginPayment = async () => {
    if (loading || paying) return;
    if (!user) {
      router.push("/login?next=%2Fpremium");
      return;
    }
    if (user.role !== "user") {
      toast.error("শুধু সদস্য অ্যাকাউন্ট থেকে Premium কেনা যাবে।");
      return;
    }
    if (subscribed) {
      router.push("/profile");
      return;
    }
    setPaying(true);
    try {
      const [payment, error] = await PostRequestAxios<{ paymentUrl: string }>(
        "/platform/premium/checkout", {},
      );
      if (error || !payment?.paymentUrl) {
        toast.error(error?.message || "bKash পেমেন্ট শুরু করা যায়নি।");
        return;
      }
      const redirect = new URL(payment.paymentUrl);
      if (redirect.protocol !== "https:") throw new Error("Invalid payment URL");
      window.location.assign(redirect.href);
    } catch {
      toast.error("নিরাপদ bKash পেমেন্ট চালু করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setPaying(false);
    }
  };

  if (subscribed) {
    return <Link href="/profile" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-center text-sm font-bold text-white hover:bg-emerald-400">
      <ShieldCheck size={18} /> আপনার Premium সদস্যপদ সক্রিয় — দেখুন
    </Link>;
  }
  return <>
    <button type="button" onClick={() => void beginPayment()} disabled={loading || paying}
      className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 text-center text-sm font-bold text-white transition-colors hover:bg-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 disabled:cursor-wait disabled:opacity-65">
      {loading || paying ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
      {loading ? "অ্যাকাউন্ট যাচাই হচ্ছে..." : paying ? "bKash চালু হচ্ছে..." :
        user ? "bKash-এ " + amount + " পেমেন্ট করুন" : "লগইন করে bKash পেমেন্ট করুন"}
    </button>
    {!user && !loading && <p className="mt-3 text-center text-xs text-blue-100">
      নতুন সদস্য? <Link href="/signup" className="font-semibold text-white underline underline-offset-2">ফ্রি অ্যাকাউন্ট খুলুন</Link>
    </p>}
    <p className="mt-2 text-center text-[11px] leading-5 text-blue-100">
      bKash-এ পেমেন্ট সফলভাবে যাচাই হওয়ার পরেই Premium সদস্যপদ সক্রিয় হবে।
    </p>
  </>;
}
