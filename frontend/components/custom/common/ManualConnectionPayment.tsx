"use client";
import { useState } from "react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PolicyLinks from "./PolicyLinks";
export default function ManualConnectionPayment() {
  const { data: packages } = useQueryWrapper<
    {
      _id: string;
      title: string;
      numberOfConnections: number;
      originalPrice: number;
      discountPrice?: number;
    }[]
  >(["public-pricings"], "/pricing");
  const [packageId, setPackageId] = useState(""),
    [method, setMethod] = useState("bkash"),
    [reference, setReference] = useState("");
  const mutation = useCommonMutationApi({
    url: "/platform/manual-connection-payment",
    method: "POST",
    successMessage: "Payment submitted for verification",
    onSuccess: () => setReference(""),
  });
  const selected = packages?.find((p) => p._id === packageId);
  return (
    <Card className="max-w-3xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Manual connection payment</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <p className="text-sm">
            ম্যানুয়াল পেমেন্টের নির্দেশনা জানতে সরাসরি কল করুন:{" "}
            <a href="tel:+8801748919251" className="underline">
              01748919251
            </a>
            । টিমের সঙ্গে নিশ্চিত হওয়ার পর লেনদেনের তথ্য জমা দিন।
          </p>
          <Field>
            <FieldLabel>Package</FieldLabel>
            <select
              aria-label="Connection package"
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              className="rounded border p-2"
            >
              <option value="">প্যাকেজ বেছে নিন</option>
              {packages?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title} — {p.numberOfConnections} connections — ৳
                  {p.discountPrice ?? p.originalPrice}
                </option>
              ))}
            </select>
          </Field>
          {selected && (
            <p className="text-sm">
              ৳{selected.discountPrice ?? selected.originalPrice} · সর্বোচ্চ{" "}
              {selected.numberOfConnections}টি পৃথক প্রোফাইলের পরিচয় ও যোগাযোগ
              আনলক করা যাবে। একই প্রোফাইল আবার দেখতে অতিরিক্ত কানেকশন লাগবে না।
            </p>
          )}
          <Field>
            <FieldLabel>Payment method</FieldLabel>
            <select
              aria-label="Manual payment method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="rounded border p-2"
            >
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="rocket">Rocket</option>
            </select>
          </Field>
          <Field>
            <FieldLabel>Transaction reference</FieldLabel>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={100}
            />
          </Field>
          <PolicyLinks />
          <Button
            disabled={!packageId || !reference || mutation.isPending}
            onClick={() =>
              mutation.mutate({
                packageId,
                method,
                transactionReference: reference,
              })
            }
          >
            যাচাইয়ের জন্য জমা দিন
          </Button>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
