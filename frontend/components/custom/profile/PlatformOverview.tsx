"use client";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import Link from "next/link";
import { formatPremiumFee,premiumTotal, resolvePremiumSettings, type PremiumSettings } from "@/lib/premium-settings";
import VerifyContact from "./VerifyContact";
import { useState } from "react";
type Summary = {
  journey: {
    created: boolean;
    completed: boolean;
    submitted: boolean;
    approved: boolean;
    published: boolean;
  };
  completion: { percentage: number; remaining: string[]; nextStep: number };
  accountType: string;
  premiumService?:{stage?:string;startedAt?:string;expiresAt?:string;assistedAllowance?:number;assistedUsed?:number}|null;
  verificationStatus: string;
  biodataStatus: string;
  statusReason: string;
  profileViews: number;
  connections: {
    total: number;
    used: number;
    remaining: number;
    history: {
      id?: string;
      profileId: string;
      createdAt: string;
      status: string;
    }[];
    payments: {
      id: string;
      packageName: string;
      amount: number;
      status: string;
    }[];
  };
};
type Case = {
  id: string;
  kind: string;
  status: string;
  fee?: number;
  transactionReference?: string;
};
export default function PlatformOverview() {
  const { data, refetch } = useQueryWrapper<Summary>(
    ["platform-summary"],
    "/platform/summary",
  );
  const { data: cases, refetch: refreshCases } = useQueryWrapper<Case[]>(
    ["my-service-requests"],
    "/platform/requests",
  );
  const { data: publicSettings, isLoading: publicSettingsLoading } = useQueryWrapper<{ premium?: PremiumSettings }>(
    ["public-settings"],
    "/public/settings",
  );
  const premium = resolvePremiumSettings(publicSettings?.premium);
  // Admin master switch: when off, members see no premium card or membership label at all.
  const showPremium = !publicSettingsLoading && premium.visible;
  const premiumCases = cases?.filter((item) => item.kind === "premium") ?? [];
  const [reference, setReference] = useState(""),
    [method, setMethod] = useState("bkash");
  const apply = useCommonMutationApi({
    url: "/platform/request/premium",
    method: "POST",
    successMessage: "Premium request submitted",
    onSuccess: () => refreshCases(),
  });
  const checkout = useCommonMutationApi<{ paymentUrl: string }>({
    url: "/platform/premium/checkout",
    method: "POST",
    successMessage: "bKash payment started",
    onSuccess: (payment) => {
      if (payment?.paymentUrl && /^https:\/\//.test(payment.paymentUrl))
        window.location.assign(payment.paymentUrl);
    },
  });
  const pay = useCommonMutationApi({
    url: "/platform/premium-payment",
    method: "POST",
    successMessage: "Payment submitted for verification",
    onSuccess: () => {
      setReference("");
      refreshCases();
      refetch();
    },
  });
  if (!data) return null;
  return (
    <div className="space-y-5 mb-6">
      <VerifyContact />
      {/* Lifecycle & completion are shown once in BiodataProgressPanel above. */}
      <Card className="shadow-none border-pink-100">
        <CardHeader>
          <CardTitle>My Connections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ["Total", data.connections.total],
              ["Used", data.connections.used],
              ["Remaining", data.connections.remaining],
            ].map(([k, v]) => (
              <div key={k} className="rounded bg-pink-50 p-3">
                <p className="text-xs">{k}</p>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          <Link href="/pricing" className="text-pink-600 underline">
            কানেকশন প্যাকেজ দেখুন
          </Link>
          {data.connections.history
            .slice(-10)
            .reverse()
            .map((h, i) => (
              <div
                key={h.id || h.profileId + String(i)}
                className="text-sm flex justify-between border-b py-2"
              >
                <Link
                  href={`/biodata/${h.profileId}`}
                  className="text-pink-600 underline"
                >
                  বায়োডাটা দেখুন
                </Link>
                <span>
                  {h.status} · {new Date(h.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          {data.connections.payments.map((p) => (
            <div key={p.id} className="text-sm border-b py-2">
              {p.packageName} · ৳{p.amount} · {p.status}
            </div>
          ))}
        </CardContent>
      </Card>
      {showPremium && (premium.enabled || premiumCases.length > 0 || data.accountType==='premium') && <Card data-premium-card data-premium-offer={data.accountType!=='premium'?'true':undefined}
        className="shadow-none border-blue-200 bg-gradient-to-br from-white via-white to-blue-50/60">
        <CardHeader>
          <CardTitle>{data.accountType==='premium'?'আপনার Premium সার্ভিসের অগ্রগতি':premium.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {premium.enabled && data.accountType!=='premium' && <>
          <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] font-medium text-blue-900">
            Premium সম্পূর্ণ ঐচ্ছিক। ফ্রি বায়োডাটা তৈরি করতে কোনো টাকা লাগে না।
          </p>
          <p className="text-[14px] leading-6 text-slate-800">{premium.summary}</p>
          <p className="text-sm font-semibold text-blue-900">
            মোট প্যাকেজ মূল্য: {formatPremiumFee(premiumTotal(premium))}
            <span className="ml-1 text-xs font-normal text-slate-600">(সার্ভিস {formatPremiumFee(premium.fee)} + চার্জ {formatPremiumFee(premium.serviceCharge)})</span>
          </p>
          <p className="text-sm text-slate-600">{premium.durationDays} days · {premium.assistedConnections} assisted connections · {premium.includedConnections} wallet connections included.</p>
          <Link className="text-pink-600 underline" href="/premium">
            {premium.detailsLabel}
          </Link>
          <div className="flex flex-wrap gap-2">
              <Button disabled={checkout.isPending}
                onClick={() => checkout.mutate({})}>
                {checkout.isPending ? 'পেমেন্ট চালু হচ্ছে…' : `bKash-এ ${formatPremiumFee(premiumTotal(premium))} পেমেন্ট করুন`}
              </Button>
              <Button variant="outline" disabled={apply.isPending || data.completion.percentage < 100}
                onClick={() => apply.mutate({})}>
                {premium.requestLabel}
              </Button>
            </div>
          {data.completion.percentage < 100 && <p className="text-xs font-medium text-amber-800">
            আপনি এখনই bKash দিয়ে Premium কিনতে পারবেন। বায়োডাটার বাকি তথ্য পরে সম্পূর্ণ করতে পারবেন।
          </p>}
          </>}
          {data.accountType==='premium' && data.premiumService && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <p className="font-bold">Blue Premium Verified · {data.premiumService.stage || 'active'}</p>
            <p className="mt-1">Team assisted connections: {data.premiumService.assistedUsed||0} of {data.premiumService.assistedAllowance||0}</p>
            {data.premiumService.expiresAt && <p className="mt-1">Service expires: {new Date(data.premiumService.expiresAt).toLocaleDateString('en-BD')}</p>}
            <p className="mt-1 text-xs">A Premium badge shows active team service, not government identity verification.</p>
          </div>}
          {premiumCases.map((c) => (
            <div key={c.id} className="rounded border p-3 text-sm">
              <p>
                {c.kind} · {c.status}
              </p>
              {c.status === "payment_pending" && (
                <div className="space-y-2 mt-2">
                  <p>
                    {formatPremiumFee(c.fee ?? premiumTotal(premium))} পেমেন্টের আগে বিস্তারিত জানুন।
                    {premium.contactPhone && <> কল: <a href={'tel:' + premium.contactPhone} className="underline">{premium.contactPhone}</a></>}
                  </p>
                  <select
                    aria-label="Payment method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="border rounded p-2"
                  >
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="rocket">Rocket</option>
                  </select>
                  <input
                    aria-label="Transaction reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Transaction reference"
                    className="border rounded p-2 w-full"
                  />
                  <Button
                    disabled={!reference || pay.isPending}
                    onClick={() =>
                      pay.mutate({
                        id: c.id,
                        method,
                        transactionReference: reference,
                      })
                    }
                  >
                    যাচাইয়ের জন্য জমা দিন
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>}
    </div>
  );
}
