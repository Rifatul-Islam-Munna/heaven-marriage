"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, ExternalLink } from "lucide-react";
import { FaTiktok } from "react-icons/fa6";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DEFAULT_NIQAHA_TIKTOK, normalizeTikTokProfile } from "@/lib/tiktok-profile";

type FooterIdentity = { tradeLicenseNumber?: string; tiktokUrl?: string };

export default function FooterIdentitySettingsCard() {
  const cache = useQueryClient();
  const { data, isLoading, isError, refetch } = useQueryWrapper<FooterIdentity>(
    ["footer-identity-settings"], "/platform/admin/settings",
  );
  const [draft, setDraft] = useState<FooterIdentity | null>(null);
  const number = draft?.tradeLicenseNumber ?? data?.tradeLicenseNumber ?? "";
  const tiktok = draft?.tiktokUrl ?? data?.tiktokUrl ?? DEFAULT_NIQAHA_TIKTOK;
  const validTikTok = normalizeTikTokProfile(tiktok);
  const invalidNumber = number.length > 80 || /[<>\x00-\x1F\x7F]/.test(number);
  const dirty = Boolean(draft);
  const save = useCommonMutationApi({
    url: "/platform/admin/settings", method: "PATCH",
    mutationKey: ["save-footer-identity"],
    successMessage: "Footer information saved.",
    onSuccess: () => {
      setDraft(null);
      void Promise.all([
        cache.invalidateQueries({ queryKey: ["footer-identity-settings"] }),
        cache.invalidateQueries({ queryKey: ["public-settings"] }),
        cache.invalidateQueries({ queryKey: ["platform-settings"] }),
      ]);
    },
  });
  const update = (key: keyof FooterIdentity, value: string) =>
    setDraft(prev => ({
      tradeLicenseNumber: prev?.tradeLicenseNumber ?? data?.tradeLicenseNumber ?? "",
      tiktokUrl: prev?.tiktokUrl ?? data?.tiktokUrl ?? DEFAULT_NIQAHA_TIKTOK,
      [key]: value,
    }));
  return (
    <Card id="footer-identity-settings" className="mb-6 border-pink-100 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileText className="size-5 text-pink-600" aria-hidden />
          Footer · Trade License & TikTok
        </CardTitle>
        <CardDescription className="leading-6">
          অফিসিয়াল তথ্য এখানে দিন। Trade License Number দেওয়া হলে ফুটারের ব্র্যান্ড অংশে দেখাবে।
          TikTok লিংক না দিলে আইকনটি নিষ্ক্রিয় থাকবে; ভুল অ্যাকাউন্টের লিংক দেখাবে না।
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isError && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          সেটিংস লোড করা যায়নি।
          <Button type="button" variant="ghost" size="sm" onClick={() => void refetch()}>আবার চেষ্টা করুন</Button>
        </div>}
        <div className="space-y-2">
          <Label htmlFor="footer-trade-license">Trade License Number</Label>
          <Input id="footer-trade-license" maxLength={80} autoComplete="off"
            placeholder="প্রতিষ্ঠানের প্রকৃত ট্রেড লাইসেন্স নম্বর"
            value={number} disabled={isLoading || isError || save.isPending}
            aria-invalid={invalidNumber}
            aria-describedby="footer-trade-license-help"
            onChange={e => update("tradeLicenseNumber", e.target.value)} />
          <p id="footer-trade-license-help" className="text-xs leading-5 text-muted-foreground">
            সরকারি ডকুমেন্টে যেমন আছে হুবহু লিখুন। নম্বর না দিলে ফুটারে মিথ্যা তথ্য দেখাবে না।
          </p>
          {invalidNumber && <p role="alert" className="text-xs text-red-600">সর্বোচ্চ ৮০টি অক্ষর; HTML বা control characters ব্যবহার করবেন না।</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="footer-tiktok-url" className="flex items-center gap-2">
            <FaTiktok aria-hidden /> Official TikTok Profile URL
          </Label>
          <Input id="footer-tiktok-url" type="url" inputMode="url"
            placeholder="https://www.tiktok.com/@your_official_account"
            maxLength={250} autoComplete="off" value={tiktok}
            aria-invalid={validTikTok === null}
            aria-describedby="footer-tiktok-help"
            disabled={isLoading || isError || save.isPending}
            onChange={e => update("tiktokUrl", e.target.value)} />
          <p id="footer-tiktok-help" className="text-xs leading-5 text-muted-foreground">
            শুধু TikTok profile-এর HTTPS URL দিন, কোনো video বা অন্য সাইটের link নয়।
          </p>
          {validTikTok === null && <p role="alert" className="text-xs text-red-600">সঠিক TikTok profile link লিখুন।</p>}
          {validTikTok && <a className="inline-flex items-center gap-1 text-xs font-semibold text-pink-700 underline" href={validTikTok}
            target="_blank" rel="noopener noreferrer">Open TikTok <ExternalLink size={13} aria-hidden /></a>}
        </div>
        <Button disabled={!dirty || isLoading || isError || save.isPending || invalidNumber || validTikTok === null}
          onClick={() => save.mutate({ tradeLicenseNumber: number.trim(), tiktokUrl: validTikTok })}>
          {save.isPending ? "Saving..." : "Save footer information"}
        </Button>
      </CardContent>
    </Card>
  );
}
