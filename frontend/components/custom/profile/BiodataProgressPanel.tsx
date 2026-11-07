"use client";

import Link from "next/link";
import { Check, CheckCircle2, Circle, ClipboardCheck, FilePenLine, ShieldCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  biodataStageLabels, currentBiodataStage, isSubmittedBiodata, profileCompletion,
  type BiodataStatusSource,
} from "@/lib/biodata-status";

const steps = [
  { label: "Submitted", description: "বায়োডাটা জমা হয়েছে" },
  { label: "Under Review", description: "অ্যাডমিন যাচাই করছেন" },
  { label: "Published", description: "সবার জন্য প্রকাশিত" },
] as const;

export default function BiodataProgressPanel({ profile }: { profile?: BiodataStatusSource | null }) {
  const percentage = profileCompletion(profile);
  const stage = currentBiodataStage(profile);
  const submitted = isSubmittedBiodata(profile);
  const step = stage === "published" ? 2 : stage === "under_review" ? 1 : stage === "rejected" ? 0 : -1;
  const message =
    stage === "deleted" ? "অ্যাডমিনের অনুমোদনের পর বায়োডাটার তথ্য সরিয়ে দেওয়া হয়েছে। আপনার লগইন অ্যাকাউন্ট সচল আছে।" :
    stage === "published" ? "আপনার জমা দেওয়া বায়োডাটা প্রকাশিত। নতুন করে পূরণ করার প্রয়োজন নেই; চাইলে তথ্য Edit/Update করতে পারবেন।" :
    stage === "under_review" ? "আপনার বায়োডাটা ইতোমধ্যে জমা হয়েছে। অ্যাডমিন পর্যালোচনা করছেন; আবার শুরু থেকে পূরণ করার প্রয়োজন নেই।" :
    stage === "rejected" ? "অ্যাডমিন সংশোধন চেয়েছেন। আগের সব উত্তর সংরক্ষিত আছে—প্রয়োজনীয় তথ্য Edit করে আবার Submit করুন।" :
    stage === "ready" ? "সব আবশ্যিক প্রশ্নের উত্তর দেওয়া হয়েছে। এবার Submit করলে অ্যাডমিন যাচাই করবেন।" :
    "বাকি আবশ্যিক প্রশ্নের উত্তর দিয়ে বায়োডাটা সম্পূর্ণ করুন। আপনার দেওয়া উত্তরগুলো সংরক্ষিত থাকে।";

  return (
    <section aria-label="বায়োডাটার অগ্রগতি ও স্ট্যাটাস" className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-pink-700">Biodata Completion & Submission</p>
          <h2 className="mt-1 text-xl font-bold text-gray-900">বায়োডাটার অগ্রগতি</h2>
          <p className="mt-1 text-sm font-medium text-gray-600">{biodataStageLabels[stage]}</p>
        </div>
        <div className="rounded-xl bg-pink-50 px-4 py-3 text-right">
          <p className="text-3xl font-bold tabular-nums text-pink-700">{percentage}%</p>
          <p className="text-xs text-pink-800">সম্পূর্ণ</p>
        </div>
      </div>
      <Progress className="mt-4 h-2.5" value={percentage} aria-label="বায়োডাটা সম্পূর্ণ হওয়ার শতাংশ" />
      <p className="mt-3 text-sm leading-6 text-gray-700">{message}</p>

      <ol className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="জমা থেকে প্রকাশের ধাপ">
        {steps.map((item, index) => {
          const done = step > index || stage === "published";
          const current = stage !== "deleted" && step === index;
          return <li key={item.label} aria-current={current ? "step" : undefined}
            className={`flex items-start gap-2.5 rounded-xl border p-3 ${done ? "border-emerald-200 bg-emerald-50" :
              current ? "border-pink-300 bg-pink-50" : "border-gray-100 bg-gray-50"}`}>
            {done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden /> :
              current ? <ShieldCheck className="mt-0.5 size-5 shrink-0 text-pink-700" aria-hidden /> :
                <Circle className="mt-0.5 size-5 shrink-0 text-gray-400" aria-hidden />}
            <div>
              <p className="text-sm font-semibold text-gray-900">{item.label}</p>
              <p className="mt-0.5 text-xs leading-5 text-gray-600">{item.description}</p>
            </div>
          </li>;
        })}
      </ol>
      {stage !== "deleted" && <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href="/profile/my-profile"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pink-700">
          {stage === "draft" ? <ClipboardCheck className="size-4" /> : <FilePenLine className="size-4" />}
          {stage === "draft" ? "বাকি তথ্য পূরণ করুন" : stage === "ready" ? "বায়োডাটা Submit করুন" :
            stage === "rejected" ? "সংশোধন ও পুনরায় Submit" : "বায়োডাটা Edit / Update"}
        </Link>
        {submitted && <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"><Check className="size-4" /> আগের তথ্য সংরক্ষিত আছে</span>}
      </div>}
    </section>
  );
}
