"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Clock3, Loader2, Mail, MessageSquareText, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Provider = { provider: string; configured: boolean; sender?: string | null };
type Status = { email: Provider; bangladeshSms: Provider; internationalSms: Provider };
type TestResponse = {
  accepted?: boolean;
  challengeId?: string;
  expiresAt?: string;
  verified?: boolean;
  message?: unknown;
};
type Action = "email" | "otp" | "verify";

// Nest's exception filter wraps HttpException.getResponse() inside "message".
// Unwrap the provider-safe diagnostic instead of replacing it with a generic 503.
function errorText(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value) && value.length) return errorText(value[0]);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.message && record.message !== value) return errorText(record.message);
  }
  return "পরীক্ষাটি করা যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।";
}

function Result({ status }: { status: { ok: boolean; text: string } | null }) {
  if (!status) return null;
  return (
    <div role="status" aria-live="polite" className={"flex items-start gap-2.5 rounded-xl border px-3 py-3 text-sm leading-6 " +
      (status.ok ? "border-green-200 bg-green-50 text-green-900" : "border-red-200 bg-red-50 text-red-900")}>
      {status.ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden /> : <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />}
      <p>{status.text}</p>
    </div>
  );
}

export default function DeliveryTestPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [statusError, setStatusError] = useState("");
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [email, setEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailResult, setEmailResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [otpTo, setOtpTo] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpResult, setOtpResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [challengeId, setChallengeId] = useState("");
  const [expiry, setExpiry] = useState("");
  const [code, setCode] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const load = async () => {
      setLoadingStatus(true);
      setStatusError("");
      try {
        const response = await fetch("/api/admin/delivery", { cache: "no-store", signal: ctrl.signal });
        const body: Status & { message?: unknown } = await response.json();
        if (!response.ok) throw new Error(errorText(body.message));
        if (!ctrl.signal.aborted) setStatus(body);
      } catch (error) {
        if (!ctrl.signal.aborted) setStatusError(error instanceof Error ? error.message : "অবস্থা পাওয়া যায়নি।");
      } finally {
        if (!ctrl.signal.aborted) setLoadingStatus(false);
      }
    };
    void load();
    return () => ctrl.abort();
  }, []);

  async function post(action: Action, input: Record<string, string>): Promise<TestResponse> {
    const response = await fetch("/api/admin/delivery", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...input }),
    });
    const result: TestResponse = await response.json();
    if (!response.ok) throw new Error(errorText(result.message));
    return result;
  }

  async function sendEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailResult(null);
    setEmailBusy(true);
    try {
      const result = await post("email", { to: email.trim() });
      if (!result.accepted) throw new Error("ইমেইল সার্ভারের উত্তর নিশ্চিত নয়।");
      setEmailResult({
        ok: true,
        text: "ইমেইল সার্ভার মেসেজটি গ্রহণ করেছে। এখন আপনার ইনবক্স ও স্প্যাম ফোল্ডারে “Niqaha.com | Test email” খুঁজুন। ইনবক্সে না দেখা পর্যন্ত ডেলিভারি নিশ্চিত নয়।",
      });
    } catch (error) {
      setEmailResult({ ok: false, text: errorText(error instanceof Error ? error.message : null) });
    } finally {
      setEmailBusy(false);
    }
  }

  function resetOtp() {
    setChallengeId("");
    setCode("");
    setExpiry("");
    setVerified(false);
    setOtpResult(null);
  }

  async function sendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetOtp();
    setOtpBusy(true);
    try {
      const result = await post("otp", { to: otpTo.trim(), channel });
      if (!result.accepted || !result.challengeId) throw new Error("OTP পাঠানোর নিশ্চিত উত্তর পাওয়া যায়নি।");
      setChallengeId(result.challengeId);
      setExpiry(result.expiresAt || "");
      setOtpResult({
        ok: true,
        text: "টেস্ট OTP পাঠানোর অনুরোধ গ্রহণ করা হয়েছে। মেসেজে পাওয়া ৬ সংখ্যার কোডটি নিচে লিখুন। কোড মিললে ডেলিভারি নিশ্চিত হবে।",
      });
    } catch (error) {
      setOtpResult({ ok: false, text: errorText(error instanceof Error ? error.message : null) });
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifyBusy(true);
    setOtpResult(null);
    try {
      const result = await post("verify", { challengeId, code: code.trim() });
      if (!result.verified) throw new Error("কোডটি নিশ্চিত করা যায়নি।");
      setVerified(true);
      setOtpResult({ ok: true, text: "OTP সঠিক! মেসেজটি আপনার কাছে পৌঁছেছে এবং কোডটি মিলেছে। এটি শুধু টেস্ট; কোনো সদস্যের অ্যাকাউন্ট পরিবর্তন হয়নি।" });
    } catch (error) {
      setOtpResult({ ok: false, text: errorText(error instanceof Error ? error.message : null) });
    } finally {
      setVerifyBusy(false);
    }
  }

  const providers = [
    { key: "email" as const, label: "ইমেইল", note: "Resend · ইমেইল OTP" },
    { key: "bangladeshSms" as const, label: "বাংলাদেশ SMS", note: "BulkSMSBD · 01 নম্বর" },
    { key: "internationalSms" as const, label: "আন্তর্জাতিক SMS", note: "Twilio · +Country code" },
  ];
  const otpConfigured = channel === "email" ? !!status?.email.configured
    : !!(status?.bangladeshSms.configured || status?.internationalSms.configured);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1.5 text-xs font-bold text-primary">
          <ShieldCheck className="size-4" aria-hidden /> শুধু অ্যাডমিন
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">ইমেইল ও OTP টেস্ট</h1>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
          এখানে নিজের ইমেইল বা ফোনে পরীক্ষামূলক মেসেজ পাঠিয়ে দেখতে পারবেন সিস্টেম কাজ করছে কি না।
          এই পরীক্ষায় কোনো ব্যবহারকারীর অ্যাকাউন্ট, পাসওয়ার্ড বা OTP যাচাইয়ের অবস্থা বদলাবে না।
        </p>
      </header>

      <Card className="border-pink-100 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><RefreshCw className="size-5 text-primary" aria-hidden /> সার্ভিসের সেটআপ</CardTitle>
          <CardDescription>সেটআপ সম্পূর্ণ মানেই মেসেজ পৌঁছেছে নয়। নিচের টেস্ট দিয়ে ডেলিভারি পরীক্ষা করুন।</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingStatus && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> সেটআপ পরীক্ষা হচ্ছে...</p>}
          {statusError && <Result status={{ ok: false, text: statusError }} />}
          {status && <div className="grid gap-3 sm:grid-cols-3">
            {providers.map((item) => {
              const provider = status[item.key];
              return (
                <div key={item.key} className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-bold">{item.label}</h2>
                    <span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + (provider.configured ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800")}>
                      {provider.configured ? "সেটআপ আছে" : "সেটআপ নেই"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
                  {item.key === "email" && provider.sender && <p className="mt-2 break-all text-xs text-muted-foreground">From: {provider.sender}</p>}
                </div>
              );
            })}
          </div>}
        </CardContent>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card className="border-pink-100 shadow-sm">
          <CardHeader>
            <div className="flex size-11 items-center justify-center rounded-xl bg-pink-50 text-primary"><Mail className="size-5" aria-hidden /></div>
            <CardTitle className="text-lg">১. টেস্ট ইমেইল পাঠান</CardTitle>
            <CardDescription>আপনার ইমেইল ঠিকানায় একটি সাধারণ টেস্ট মেসেজ পাঠানো হবে।</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => void sendEmail(event)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-email">যে ইমেইলে টেস্ট করবেন</Label>
                <Input id="test-email" type="email" autoComplete="email" required maxLength={254}
                  placeholder="yourname@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setEmailResult(null); }}
                  disabled={emailBusy} className="min-h-11" />
              </div>
              <Button type="submit" className="min-h-11 w-full gap-2" disabled={emailBusy || !email.trim() || loadingStatus || !status?.email.configured}>
                {emailBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
                {emailBusy ? "ইমেইল পাঠানো হচ্ছে..." : "টেস্ট ইমেইল পাঠান"}
              </Button>
              {!loadingStatus && !status?.email.configured && <p className="text-xs text-amber-700">প্রথমে সার্ভারে RESEND_API_KEY ও EMAIL_FROM সেট করুন।</p>}
              <Result status={emailResult} />
            </form>
          </CardContent>
        </Card>

        <Card className="border-pink-100 shadow-sm">
          <CardHeader>
            <div className="flex size-11 items-center justify-center rounded-xl bg-pink-50 text-primary"><MessageSquareText className="size-5" aria-hidden /></div>
            <CardTitle className="text-lg">২. OTP পাঠিয়ে যাচাই করুন</CardTitle>
            <CardDescription>আসল OTP পাঠানোর সার্ভিস ব্যবহার করে একটি আলাদা টেস্ট কোড পাঠানো হবে।</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={(event) => void sendOtp(event)} className="space-y-4">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">কোথায় OTP পাঠাবেন?</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(["email", "sms"] as const).map((type) => (
                    <label key={type} className={"flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold " +
                      (channel === type ? "border-primary bg-pink-50 text-primary" : "border-border text-muted-foreground")}>
                      <input type="radio" name="otp-channel" value={type} checked={channel === type}
                        onChange={() => { setChannel(type); setOtpTo(""); resetOtp(); }} className="accent-pink-600" />
                      {type === "email" ? "ইমেইল OTP" : "SMS OTP"}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="space-y-2">
                <Label htmlFor="otp-destination">{channel === "email" ? "যে ইমেইলে OTP পাবেন" : "যে ফোনে OTP পাবেন"}</Label>
                <Input id="otp-destination" required className="min-h-11"
                  type={channel === "email" ? "email" : "tel"} inputMode={channel === "email" ? "email" : "tel"}
                  maxLength={channel === "email" ? 254 : 30}
                  placeholder={channel === "email" ? "yourname@example.com" : "017XXXXXXXX অথবা +447XXXXXXXXX"}
                  value={otpTo} disabled={otpBusy || verifyBusy}
                  onChange={(e) => { setOtpTo(e.target.value); resetOtp(); }} />
              </div>
              {channel === "sms" && <p className="text-xs leading-5 text-muted-foreground">SMS টেস্টে আপনার SMS সার্ভিসের চার্জ প্রযোজ্য হতে পারে।</p>}
              <Button type="submit" className="min-h-11 w-full gap-2" disabled={otpBusy || verifyBusy || !otpTo.trim() || loadingStatus || !otpConfigured}>
                {otpBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
                {otpBusy ? "OTP পাঠানো হচ্ছে..." : "টেস্ট OTP পাঠান"}
              </Button>
              {!loadingStatus && !otpConfigured && <p className="text-xs text-amber-700">এই মাধ্যমের সার্ভিস কনফিগার করা নেই।</p>}
            </form>

            {challengeId && !verified && <form onSubmit={(event) => void verifyOtp(event)} className="space-y-3 rounded-2xl border border-pink-100 bg-pink-50/50 p-4">
              <div>
                <Label htmlFor="test-code" className="font-bold">পাওয়া ৬ সংখ্যার OTP লিখুন</Label>
                {expiry && <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3.5" aria-hidden />
                  মেয়াদ: {new Date(expiry).toLocaleTimeString("bn-BD", { hour: "numeric", minute: "2-digit" })}</p>}
              </div>
              <Input id="test-code" type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                placeholder="123456" required value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))} className="min-h-12 text-center text-xl tracking-[0.3em]" />
              <Button type="submit" className="min-h-11 w-full" disabled={verifyBusy || code.length !== 6}>
                {verifyBusy ? "যাচাই হচ্ছে..." : "OTP মিলিয়ে দেখুন"}
              </Button>
            </form>}
            {verified && <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-800">
              <CheckCircle2 className="size-5" aria-hidden /> টেস্ট OTP সফলভাবে যাচাই হয়েছে
            </div>}
            <Result status={otpResult} />
          </CardContent>
        </Card>
      </div>

      <p className="rounded-xl border border-pink-100 bg-pink-50/40 px-4 py-3 text-xs leading-6 text-muted-foreground">
        নিরাপত্তা: OTP ১০ মিনিট বৈধ, ভুল কোড সর্বোচ্চ ৫ বার চেষ্টা করা যাবে। একবার ব্যবহার হলে আবার কাজ করবে না।
        একই ধরনের নতুন টেস্ট পাঠাতে ১ মিনিট অপেক্ষা করতে হবে। ইমেইল সার্ভারের গ্রহণ করা এবং ইনবক্সে পাওয়া আলাদা বিষয়।
      </p>
    </main>
  );
}
