"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock3, RefreshCw, Trash2, XCircle } from "lucide-react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deletionStatusLabels, type DeletionRequest } from "@/lib/biodata-status";

export default function BiodataDeletionPanel({ deleted = false }: { deleted?: boolean }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const { data: request, isPending, isError, refetch } = useQueryWrapper<DeletionRequest | null>(
    ["biodata-deletion-request"], "/platform/deletion-request",
    { staleTime: 15000, retry: 1 },
  );
  const pending = request?.status === "pending" || request?.status === "contacted";
  const approved = deleted || request?.status === "approved";
  const { mutate: sendRequest, isPending: submitting } = useCommonMutationApi({
    url: "/platform/deletion-request",
    method: "POST",
    mutationKey: ["request-biodata-deletion"],
    successMessage: "আপনার অনুরোধ অ্যাডমিনের কাছে পাঠানো হয়েছে।",
    onSuccess: () => {
      setOpen(false);
      setMessage("");
      void refetch();
      void client.invalidateQueries({ queryKey: ["get-my-profile-for-success"] });
      void client.invalidateQueries({ queryKey: ["platform-summary"] });
    },
  });
  return (
    <section id="deletion-request" aria-label="বায়োডাটা মুছে ফেলার অনুরোধ" className="scroll-mt-24 rounded-2xl border border-rose-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <Trash2 className="size-5 text-rose-600" aria-hidden /> Request Biodata Deletion
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            নিজের বায়োডাটা মুছে ফেলতে প্রথমে অনুরোধ পাঠাতে হবে। অ্যাডমিন Approve না করা পর্যন্ত বায়োডাটা ও তথ্য অপরিবর্তিত থাকবে। আপনার লগইন অ্যাকাউন্ট মুছে ফেলা হবে না।
          </p>
        </div>
        {!isPending && !isError && !pending && !approved && (
          <Button variant="outline" className="min-h-11 border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            onClick={() => setOpen(true)}>
            <Trash2 className="mr-2 size-4" /> অনুরোধ পাঠান
          </Button>
        )}
      </div>
      {isPending && <p className="mt-3 text-sm text-gray-500" role="status">অনুরোধের অবস্থা লোড হচ্ছে...</p>}
      {isError && <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-rose-700" role="alert">
        অনুরোধের অবস্থা লোড করা যায়নি।
        <Button size="sm" variant="outline" onClick={() => void refetch()}><RefreshCw className="mr-1 size-3.5" /> আবার চেষ্টা</Button>
      </div>}
      {request && !isError && (
        <div aria-live="polite" className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {approved ? <CheckCircle2 aria-hidden className="size-5 text-emerald-600" /> :
              request.status === "rejected" ? <XCircle aria-hidden className="size-5 text-rose-600" /> :
                <Clock3 aria-hidden className="size-5 text-amber-600" />}
            <p className="text-sm font-semibold text-gray-900">
              {deletionStatusLabels[request.status] || "পর্যালোচনাধীন"}
            </p>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            অনুরোধ পাঠানো: {new Date(request.createdAt).toLocaleString("bn-BD")}
            {request.reviewedAt && " · সিদ্ধান্ত: " + new Date(request.reviewedAt).toLocaleString("bn-BD")}
          </p>
          {request.decisionReason && <p className="mt-3 text-sm text-gray-700">
            অ্যাডমিনের সিদ্ধান্তের কারণ: <span className="font-medium">{request.decisionReason}</span>
          </p>}
          {pending && <p className="mt-2 text-sm text-gray-600">আপনার বায়োডাটা এখনো মুছে ফেলা হয়নি। অ্যাডমিনের সিদ্ধান্তের অপেক্ষায় আছে।</p>}
          {request.status === "rejected" && <p className="mt-2 text-sm text-gray-600">বায়োডাটা অক্ষত আছে। প্রয়োজনে নতুন অনুরোধ পাঠাতে পারবেন।</p>}
          {approved && <p className="mt-2 text-sm text-gray-600">অ্যাডমিন অনুমোদনের পর বায়োডাটার তথ্য সরিয়ে দেওয়া হয়েছে। অ্যাকাউন্ট ও অনুরোধের ইতিহাস রাখা হয়েছে।</p>}
        </div>
      )}
      {deleted && !request && !isPending && <p className="mt-3 text-sm font-medium text-emerald-700">বায়োডাটা মুছে ফেলা হয়েছে।</p>}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>বায়োডাটা মুছে ফেলার অনুরোধ নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription>
              এটি সরাসরি Delete নয়। অ্যাডমিন Approve করলে বায়োডাটার তথ্য সরিয়ে দেওয়া হবে। Reject হলে তা অক্ষত থাকবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="text-sm font-semibold text-gray-800" htmlFor="deletion-reason">কারণ (ঐচ্ছিক)</label>
          <textarea id="deletion-reason" rows={3} maxLength={1000} value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="আপনি কেন বায়োডাটা মুছে ফেলতে চান?"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-pink-500" />
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction disabled={submitting} className="bg-rose-600 hover:bg-rose-700"
              onClick={(event) => { event.preventDefault(); if (!submitting) sendRequest({ message: message.trim() }); }}>
              {submitting ? "পাঠানো হচ্ছে..." : "হ্যাঁ, অনুরোধ পাঠান"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
