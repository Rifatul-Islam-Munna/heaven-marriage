"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CheckCircle2, LogOut, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/lib/useUser";
import { logOutUser } from "@/actions/auth";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { currentBiodataStage, type BiodataStatusSource } from "@/lib/biodata-status";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Style = "hero" | "section";
export default function BiodataCreationCta({ style = "section" }: { style?: Style }) {
  const router = useRouter();
  const { user, loading } = useUser();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const { data: profile } = useQueryWrapper<BiodataStatusSource>(
    ["biodata-cta-profile"], "/user/get-my-profile",
    { enabled: Boolean(user) && user?.role === "user", staleTime: 10000 },
  );

  const stage = currentBiodataStage(profile);
  const submitted = stage === "published" || stage === "under_review" || stage === "rejected";
  const staff = user?.role && user.role !== "user";

  const handleClick = () => {
    if (loading) return;
    if (!user) { router.push("/signup"); return; }
    setOpen(true);
  };
  const createAnother = async () => {
    if (switching) return;
    setSwitching(true);
    try {
      const result = await logOutUser();
      if (!result) throw new Error("Logout could not be completed");
      setOpen(false);
      router.replace("/signup");
      router.refresh();
    } catch {
      toast.error("বর্তমান অ্যাকাউন্ট থেকে লগআউট করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <>
      <Button type="button" disabled={loading} onClick={handleClick}
        className={style === "hero"
          ? "group min-h-12 w-full rounded-full bg-gradient-to-r from-pink-600 to-rose-600 px-7 text-base font-bold text-white shadow-[0_10px_26px_rgba(219,39,119,0.28)] transition-transform hover:-translate-y-0.5 hover:from-pink-700 hover:to-rose-700 sm:w-auto"
          : "group min-h-11 w-full rounded-full bg-gradient-to-r from-pink-600 to-rose-600 px-6 text-sm font-bold text-white shadow-sm hover:from-pink-700 hover:to-rose-700 sm:w-auto"}>
        <Plus className="mr-2 size-4" aria-hidden />
        বায়োডাটা তৈরি করুন
        <ArrowUpRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-pink-100 sm:max-w-lg">
          <DialogHeader>
            <span className="mb-2 inline-flex size-11 items-center justify-center rounded-xl bg-pink-50 text-pink-700">
              <CheckCircle2 size={23} aria-hidden />
            </span>
            <DialogTitle className="text-xl font-bold leading-relaxed">
              {staff ? "আপনার অ্যাকাউন্ট ইতোমধ্যে সক্রিয়" :
                submitted ? "আপনার বায়োডাটা ইতোমধ্যে তৈরি করা আছে" :
                stage === "deleted" ? "আপনার বায়োডাটা মুছে ফেলা হয়েছে" :
                  "আপনার অ্যাকাউন্টে বায়োডাটা শুরু করা আছে"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-7">
              {staff ? "এই অ্যাকাউন্টটি স্টাফ/অ্যাডমিনের। সদস্যের বায়োডাটা তৈরি করতে আলাদা সদস্য অ্যাকাউন্ট লাগবে।" :
                submitted ? "এই অ্যাকাউন্টের বায়োডাটা আবার নতুন করে তৈরির প্রয়োজন নেই। আপনার আগের তথ্য সংরক্ষিত আছে। প্রোফাইল থেকে অবস্থা দেখতে বা তথ্য আপডেট করতে পারবেন।" :
                stage === "deleted" ? "এই অ্যাকাউন্টের বায়োডাটা অ্যাডমিনের অনুমোদনে মুছে ফেলা হয়েছে।" :
                  "আপনার আগের উত্তরগুলো সংরক্ষিত আছে। নতুন ফর্মের বদলে সেখান থেকেই সম্পন্ন করুন।"}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
            অন্য কারও নামে বা তার জন্য বায়োডাটা তৈরি করতে হলে <strong>আলাদা অ্যাকাউন্ট</strong> খুলতে হবে।
            এজন্য বর্তমান অ্যাকাউন্ট থেকে লগআউট করে অন্য একটি ফোন নম্বর, ইমেইল (Gmail)
            অথবা ভিন্ন Google অ্যাকাউন্ট দিয়ে নতুন সাইনআপ করুন।
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {!staff && stage !== "deleted" && (
              <Button className="min-h-11 bg-pink-600 text-white hover:bg-pink-700"
                onClick={() => { setOpen(false); router.push(submitted ? "/profile" : "/profile/my-profile"); }}>
                <UserRound className="mr-2 size-4" />
                {submitted ? "আমার প্রোফাইল" : "আগের বায়োডাটা চালিয়ে যান"}
              </Button>
            )}
            {staff && <Button variant="outline" className="min-h-11"
              onClick={() => { setOpen(false); router.push("/dashboard"); }}>
              ড্যাশবোর্ডে যান
            </Button>}
            {stage === "deleted" && !staff && <Button variant="outline" className="min-h-11"
              onClick={() => { setOpen(false); router.push("/profile#deletion-request"); }}>
              অনুরোধের অবস্থা দেখুন
            </Button>}
            <Button variant="outline" disabled={switching} onClick={() => void createAnother()}
              className="min-h-11 border-pink-200 text-pink-700 hover:bg-pink-50">
              <LogOut className="mr-2 size-4" />
              {switching ? "লগআউট হচ্ছে..." : "লগআউট করে নতুন সাইনআপ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
