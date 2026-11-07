export type BiodataStage = "draft" | "ready" | "under_review" | "published" | "rejected" | "deleted";
export interface BiodataStatusSource {
  biodataStage?: BiodataStage;
  biodataStatus?: string;
  isPublished?: boolean;
  isPublishFromAdmin?: boolean;
  verificationStatus?: string;
  alreadySubmitted?: boolean;
  completion?: { percentage?: number; requiredCount?:number; answeredCount?:number;schemaRevision?:number };
  completionPercentage?:number;completionRequiredCount?:number;completionAnsweredCount?:number;
  submittedAt?: string | Date | null;
}
export type DeletionRequestStatus = "pending" | "contacted" | "approved" | "rejected";
export interface DeletionRequest {
  id: string;
  status: DeletionRequestStatus;
  message?: string;
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string;
  decisionReason?: string;
}
export function profileCompletion(source?: BiodataStatusSource | null): number {
  const value = Number(source?.completion?.percentage ?? source?.completionPercentage ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
}
export function currentBiodataStage(source?: BiodataStatusSource | null): BiodataStage {
  const raw = source?.biodataStage;
  if (raw && ["draft", "ready", "under_review", "published", "rejected", "deleted"].includes(raw))
    return raw;
  if (source?.biodataStatus === "deleted") return "deleted";
  if (source?.isPublished && source?.isPublishFromAdmin && source?.verificationStatus !== "suspended")
    return "published";
  if (source?.verificationStatus === "rejected" && ["submitted", "approved"].includes(source?.biodataStatus || ""))
    return "rejected";
  if (source?.alreadySubmitted || ["submitted", "approved"].includes(source?.biodataStatus || ""))
    return "under_review";
  return profileCompletion(source) === 100 ? "ready" : "draft";
}
export const biodataStageLabels: Record<BiodataStage, string> = {
  draft: "অসম্পূর্ণ খসড়া",
  ready: "জমা দেওয়ার জন্য প্রস্তুত",
  under_review: "Under Review · পর্যালোচনাধীন",
  published: "Published · প্রকাশিত",
  rejected: "পরিবর্তন প্রয়োজন",
  deleted: "অ্যাডমিন অনুমোদনে বায়োডাটা মুছে ফেলা হয়েছে",
};
export const deletionStatusLabels: Record<DeletionRequestStatus, string> = {
  pending: "Pending · অ্যাডমিনের সিদ্ধান্তের অপেক্ষায়",
  contacted: "Under Review · পর্যালোচনাধীন",
  approved: "Approved · অনুমোদিত",
  rejected: "Rejected · প্রত্যাখ্যাত",
};
export function isSubmittedBiodata(source?: BiodataStatusSource | null): boolean {
  const stage = currentBiodataStage(source);
  return stage === "under_review" || stage === "published" || stage === "rejected";
}
