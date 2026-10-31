"use client";

import { useRef, useState } from "react";
import { Copy, Eye, EyeOff, KeyRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";

type Props = { id: string; memberName?: string; disabled?: boolean };
type Result = { message?: string; accountVerified?: boolean };

/** Random password with at least one upper, lower, digit and symbol. */
function generatePassword(length = 12) {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%&*?"];
  const all = sets.join("");
  const random = (max: number) => {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % max;
  };
  const chars = sets.map((set) => set[random(set.length)]);
  while (chars.length < length) chars.push(all[random(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function strength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

export default function AdminPasswordCard({ id, memberName, disabled }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [askConfirm, setAskConfirm] = useState(false);
  const [lastSet, setLastSet] = useState("");
  const submitted = useRef("");

  const { mutate, isPending } = useCommonMutationApi<Result>({
    method: "PATCH",
    url: "/user/admin-set-password",
    mutationKey: ["admin-set-password", id],
    successMessage: "পাসওয়ার্ড পরিবর্তন হয়েছে। সদস্য সব ডিভাইস থেকে লগআউট হয়েছেন।",
    onSuccess: (result) => {
      if (result?.accountVerified === false)
        toast.warning("এই অ্যাকাউন্টটি এখনো OTP দিয়ে যাচাই করা হয়নি, তাই যাচাই না হওয়া পর্যন্ত সদস্য লগইন করতে পারবেন না।");
      setLastSet(submitted.current);
      setPassword("");
      setConfirm("");
    },
  });

  const tooShort = password.length > 0 && password.length < 8;
  const tooLong = password.length > 50;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = !disabled && !isPending && password.length >= 8 && !tooLong && password === confirm;
  const score = strength(password);
  const level = score >= 5 ? "শক্তিশালী" : score >= 3 ? "মাঝারি" : "দুর্বল";
  const meter = score >= 5 ? "bg-green-500" : score >= 3 ? "bg-amber-500" : "bg-red-500";

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("কপি করা হয়েছে");
    } catch {
      toast.error("কপি করা যায়নি");
    }
  };

  return (
    <Card className="mb-6 border-pink-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-pink-700">
          <KeyRound className="h-5 w-5" /> লগইন পাসওয়ার্ড পরিবর্তন
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) setAskConfirm(true);
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin-new-password">নতুন পাসওয়ার্ড</Label>
              <div className="relative">
                <Input
                  id="admin-new-password"
                  type={visible ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  maxLength={50}
                  disabled={disabled || isPending}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="কমপক্ষে ৮ অক্ষর"
                  aria-invalid={tooShort || tooLong}
                  aria-describedby="admin-new-password-help"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setVisible((value) => !value)}
                  aria-label={visible ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখান"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-800"
                >
                  {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex gap-1" aria-hidden>
                {[2, 3, 4, 5].map((step) => (
                  <span key={step} className={`h-1 flex-1 rounded-full ${password && score >= step ? meter : "bg-gray-200"}`} />
                ))}
              </div>
              <p id="admin-new-password-help" className={`text-xs ${tooShort || tooLong ? "text-red-600" : "text-gray-500"}`}>
                {tooShort
                  ? "কমপক্ষে ৮ অক্ষর দিন"
                  : tooLong
                    ? "সর্বোচ্চ ৫০ অক্ষর"
                    : password
                      ? `শক্তি: ${level}`
                      : "বড় ও ছোট হাতের অক্ষর, সংখ্যা ও চিহ্ন মিলিয়ে দিন"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-confirm-password">পাসওয়ার্ড আবার লিখুন</Label>
              <Input
                id="admin-confirm-password"
                type={visible ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                maxLength={50}
                disabled={disabled || isPending}
                onChange={(event) => setConfirm(event.target.value)}
                aria-invalid={mismatch}
              />
              {mismatch && <p className="text-xs text-red-600">দুটি পাসওয়ার্ড মিলছে না</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={disabled || isPending}
              onClick={() => {
                const next = generatePassword();
                setPassword(next);
                setConfirm(next);
                setVisible(true);
              }}
            >
              <RefreshCw className="h-4 w-4" /> শক্তিশালী পাসওয়ার্ড তৈরি করুন
            </Button>
            <Button type="button" variant="outline" disabled={!password} onClick={() => void copy(password)}>
              <Copy className="h-4 w-4" /> কপি
            </Button>
            <Button type="submit" disabled={!canSubmit} className="bg-pink-600 hover:bg-pink-700">
              {isPending ? "সংরক্ষণ হচ্ছে..." : "নতুন পাসওয়ার্ড সেট করুন"}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            পুরোনো পাসওয়ার্ড লাগবে না। পরিবর্তনের পর সদস্য সব ডিভাইস থেকে লগআউট হবেন এবং নতুন পাসওয়ার্ড দিয়ে আবার লগইন করবেন। পাসওয়ার্ডটি নিরাপদ উপায়ে সদস্যকে জানান।
          </p>
          {lastSet && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              <span>
                নতুন পাসওয়ার্ড সেট হয়েছে: <code className="font-mono">{lastSet}</code>
              </span>
              <Button type="button" size="sm" variant="outline" onClick={() => void copy(lastSet)}>
                <Copy className="h-3.5 w-3.5" /> কপি
              </Button>
            </div>
          )}
        </form>
      </CardContent>

      <AlertDialog open={askConfirm} onOpenChange={setAskConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>পাসওয়ার্ড পরিবর্তন করবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberName ? `${memberName} এর` : "এই সদস্যের"} পাসওয়ার্ড পরিবর্তন হবে এবং তিনি সব ডিভাইস থেকে লগআউট হবেন।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              className="bg-pink-600 hover:bg-pink-700"
              onClick={() => {
                submitted.current = password;
                mutate({ id, newPassword: password });
                setAskConfirm(false);
              }}
            >
              হ্যাঁ, পরিবর্তন করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
