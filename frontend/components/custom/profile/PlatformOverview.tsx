"use client";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
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
type Match = {
  profile: { _id: string; userId: string; gender: string };
  score: number | null;
  reasons: string[];
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
  const { data: admirers } = useQueryWrapper<{ _id: string; userId: string }[]>(
    ["my-admirers"],
    "/platform/admirers",
  );
  const { data: matches } = useQueryWrapper<{
    profiles: Match[];
    message: string;
  }>(["my-matches"], "/platform/matches");
  const [reference, setReference] = useState(""),
    [method, setMethod] = useState("bkash");
  const apply = useCommonMutationApi({
    url: "/platform/request/premium",
    method: "POST",
    successMessage: "Premium request submitted",
    onSuccess: () => refreshCases(),
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
      <Card className="shadow-none border-pink-100">
        <CardHeader>
          <CardTitle>আপনার বিবাহের যাত্রা</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <span>Account: {data.accountType}</span>
            <span>Verification: {data.verificationStatus}</span>
            <span>Biodata: {data.biodataStatus}</span>
            <span>Profile views: {data.profileViews}</span>
          </div>
          {data.statusReason && (
            <p className="text-red-600">{data.statusReason}</p>
          )}
          <p>
            বায়োডাটা সম্পন্ন: {data.completion.percentage}% · বাকি:{" "}
            {100 - data.completion.percentage}%
          </p>
          <Progress value={data.completion.percentage} />
          {data.completion.percentage < 100 && (
            <>
              <p className="text-sm text-gray-600">
                আপনার বায়োডাটা আরও সম্পূর্ণ করুন, যাতে উপযুক্ত জীবনসঙ্গী খুঁজতে
                সুবিধা হয়।
              </p>
              <Link
                href="/profile/my-profile"
                className="text-pink-600 underline"
              >
                পরবর্তী ধাপ: বাকি তথ্য পূরণ করুন
              </Link>
            </>
          )}
          <div className="flex flex-wrap gap-2 text-sm">
            {[
              { label: "অ্যাকাউন্ট তৈরি", done: true },
              { label: "বায়োডাটা পূরণ", done: data.journey.completed },
              { label: "জমা", done: data.journey.submitted },
              { label: "যাচাই", done: data.verificationStatus === "approved" },
              { label: "অনুমোদন", done: data.journey.approved },
              { label: "যোগাযোগ", done: data.connections.used > 0 },
            ].map((x) => (
              <span
                key={x.label}
                className={
                  x.done
                    ? "rounded bg-green-50 text-green-700 px-3 py-2"
                    : "rounded bg-pink-50 px-3 py-2"
                }
              >
                {x.done ? "✓ " : ""}
                {x.label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
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
      <Card className="shadow-none border-pink-100">
        <CardHeader>
          <CardTitle>Premium Marriage Assistance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>
            রেজিস্ট্রেশন ফি ৳১,০০০। বায়োডাটা জমা দেওয়ার পর টিম আবেদন যাচাই করে
            যোগাযোগ করবে। পেমেন্ট নিশ্চিত হলে সেবা সক্রিয় হবে।
          </p>
          <Link className="text-pink-600 underline" href="/premium">
            সেবার বিস্তারিত ও শর্ত দেখুন
          </Link>
          {data.accountType !== "premium" && (
            <Button
              disabled={apply.isPending || data.completion.percentage < 100}
              onClick={() => apply.mutate({})}
            >
              Premium Upgrade Request
            </Button>
          )}
          {cases?.map((c) => (
            <div key={c.id} className="rounded border p-3 text-sm">
              <p>
                {c.kind} · {c.status}
              </p>
              {c.kind === "premium" && c.status === "payment_pending" && (
                <div className="space-y-2 mt-2">
                  <p>
                    ৳১,০০০ পেমেন্টের আগে বিস্তারিত জানতে কল:{" "}
                    <a href="tel:+8801748919251" className="underline">
                      01748919251
                    </a>
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
      </Card>
      <Card className="shadow-none border-pink-100">
        <CardHeader>
          <CardTitle>যাঁরা আপনাকে পছন্দের তালিকায় রেখেছেন</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          {admirers?.map((a) => (
            <a
              key={a._id}
              href={"/biodata/" + a.userId}
              className="text-pink-600 underline"
            >
              বায়োডাটা #{a.userId}
            </a>
          ))}
        </CardContent>
      </Card>
      <Card className="shadow-none border-pink-100">
        <CardHeader>
          <CardTitle>আপনার জন্য প্রস্তাবিত বায়োডাটা</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{matches?.message}</p>
          {matches?.profiles.map((m) => (
            <div
              key={m.profile._id}
              className="rounded border border-pink-100 p-3"
            >
              <Link
                href={`/biodata/${m.profile.userId}`}
                className="text-pink-600 underline"
              >
                বায়োডাটা #{m.profile.userId}
              </Link>
              {m.score !== null && (
                <span className="ml-3">{m.score}% পছন্দের মিল</span>
              )}
              <p className="text-sm">{m.reasons.join(" · ")}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
