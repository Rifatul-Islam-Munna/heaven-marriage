"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import {
  Check, ChevronLeft, ChevronRight, Copy, Filter, Loader2, Mail, Pencil, Phone, RefreshCw, Search, Send, Share2,
  Trash2, Wallet, X,
} from "lucide-react";
import { GetRequestNormal } from "@/api-hooks/api-hooks";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { User as BiodataUser } from "@/@types/user";
import {
  BIODATA_WHATSAPP_GROUPS, BiodataWhatsappGroup, buildBiodataWhatsappShareUrlForNumber,
  copyBiodataWhatsappText, openBiodataWhatsappGroupShare,
} from "@/lib/biodata-whatsapp-share";
import CopyContactButton from "./CopyContactButton";
import AdminUserFilters, { ADVANCED_KEYS, ActiveFilterChips, useActiveFilterCount, useAdminFilterNavigation } from "./AdminUserFilters";
import {
  DashboardHeader, DashboardPage, DashButton, Panel, PlainHeader, StatusPill, Toggle, fieldClass, labelClass,
} from "./dashboard-kit";

interface User {
  _id: string; name: string; email: string; phoneNumber: string; whatsapp?: string; maritalStatus: string;
  isSubscriber: boolean; isOtpVerified: boolean; numberOfConnections: number; isPublished?: boolean;
  isPublishFromAdmin?: boolean; userId: string;
}
interface Paginated<T> {
  data: T[]; page: number; limit: number; totalItems: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean;
}
interface ShareRecipient { _id: string; name: string; phoneNumber?: string; whatsapp?: string; userId?: string }

const darkField = "rounded-md border border-white/20 bg-white/10 px-3 py-2 text-[13px] text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 [&>option]:bg-[#1a1a2e] [&>option]:text-white";
const darkLink = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-white/20 bg-white/10 px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/20";
const iconButton = "inline-flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-40";
const countUrl = (extra: string) => `/user/get-all-user-for-admin?page=1&limit=1&query=&gender=all&${extra}`;

function pageList(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [...new Set([1, total, current - 1, current, current + 1])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  pages.forEach((page, i) => { if (i && page - pages[i - 1] > 1) result.push("gap"); result.push(page); });
  return result;
}

function StatCard({ label, value, hint, active, onClick }: {
  label: string; value?: number; hint: string; active: boolean; onClick: () => void;
}) {
  return <button type="button" onClick={onClick} aria-pressed={active}
    className={cn("rounded-lg bg-white px-4 py-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-rose-600 sm:px-5",
      active && "ring-2 ring-rose-400")}>
    <p className="text-[12px] font-medium uppercase tracking-[0.5px] text-[#6c757d]">{label}</p>
    <p className="mt-1 text-[26px] font-bold leading-tight tabular-nums">{value === undefined ? "—" : value.toLocaleString()}</p>
    <p className="mt-1 text-[12px] text-[#6c757d]">{hint}</p>
  </button>;
}

function StatusPills({ user }: { user: User }) {
  return <div className="flex flex-wrap gap-1">
    <StatusPill tone={user.isOtpVerified ? "positive" : "negative"}>{user.isOtpVerified ? "OTP যাচাইকৃত" : "OTP বাকি"}</StatusPill>
    <StatusPill tone={user.isPublishFromAdmin ? "positive" : "neutral"}>{user.isPublishFromAdmin ? "প্রকাশিত" : "লুকানো"}</StatusPill>
  </div>;
}

export default function AdminUsersTable({ quickLinks = [] }: { quickLinks?: { href: string; label: string }[] }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { params, push } = useAdminFilterNavigation();
  const activeAdvanced = useActiveFilterCount();
  const [tableFilters, setTableFilters] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    query: parseAsString.withDefault(""),
    gender: parseAsString.withDefault("all"),
    publish: parseAsString.withDefault("all"),
  });
  const [search, setSearch] = useState(tableFilters.query);
  const [debouncedSearch] = useDebounce(search, 450);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [connectionTarget, setConnectionTarget] = useState<User | null>(null);
  const [connectionValue, setConnectionValue] = useState("");
  const [connectionReason, setConnectionReason] = useState("");
  const [subscriberPending, setSubscriberPending] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedShareUser, setSelectedShareUser] = useState<User | null>(null);
  const [copyingUserId, setCopyingUserId] = useState<string | null>(null);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientPage, setRecipientPage] = useState(1);
  const [recipientText] = useDebounce(recipientSearch, 400);

  // Typing updates the URL after a short pause; outside changes (chips, clear) flow back in.
  useEffect(() => { if (debouncedSearch !== tableFilters.query) void setTableFilters({ query: debouncedSearch, page: 1 }); },
    [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tableFilters.query !== debouncedSearch) setSearch(tableFilters.query); }, [tableFilters.query]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = new URLSearchParams(params.toString());
  query.set("page", tableFilters.page.toString());
  query.set("query", tableFilters.query);
  query.set("gender", tableFilters.gender);
  query.set("isPublished", tableFilters.publish || "all");
  query.delete("publish");

  const { data, isLoading, isFetching, error, refetch } = useQueryWrapper<Paginated<User>>(
    ["admin-users", tableFilters.page, tableFilters.query, tableFilters.gender, tableFilters.publish, params.toString()],
    `/user/get-all-user-for-admin?${query.toString()}`,
  );
  const totalCount = useQueryWrapper<Paginated<User>>(["admin-user-count", "all"], countUrl("isPublished=all"));
  const publishedCount = useQueryWrapper<Paginated<User>>(["admin-user-count", "published"], countUrl("isPublished=true"));
  const premiumCount = useQueryWrapper<Paginated<User>>(["admin-user-count", "premium"], countUrl("isPublished=all&accountType=premium"));
  const pendingCount = useQueryWrapper<Paginated<User>>(["admin-user-count", "pending"], countUrl("isPublished=all&verificationStatus=pending"));

  const { data: shareProfile, isLoading: isShareProfileLoading } = useQueryWrapper<BiodataUser>(
    ["admin-share-profile", selectedShareUser?._id],
    `/user/get-user-profile-admin?id=${selectedShareUser?._id ?? ""}`,
    { enabled: shareDialogOpen && !!selectedShareUser?._id },
  );
  const recipientsQuery = new URLSearchParams({ page: String(recipientPage), limit: "100", query: recipientText });
  const { data: recipientsData, isLoading: isRecipientsLoading, isFetching: isRecipientsFetching } = useQueryWrapper<Paginated<ShareRecipient>>(
    ["admin-share-recipients", recipientPage, recipientText],
    `/user/get-all-user-for-admin?${recipientsQuery.toString()}`,
    { enabled: shareDialogOpen },
  );

  const refreshAll = () => {
    void queryClient.refetchQueries({ queryKey: ["admin-users"], exact: false });
    void queryClient.refetchQueries({ queryKey: ["admin-user-count"], exact: false });
  };
  const deleteMutation = useCommonMutationApi({
    method: "DELETE", url: "/user/delete-user-admin", successMessage: "ব্যবহারকারী মুছে ফেলা হয়েছে", onSuccess: refreshAll,
  });
  const toggleSubscriberMutation = useCommonMutationApi({
    method: "PATCH", url: "/user/update-user-subscriber", successMessage: "সাবস্ক্রাইবার স্ট্যাটাস আপডেট করা হয়েছে", onSuccess: refreshAll,
  });
  const updateConnectionsMutation = useCommonMutationApi({
    method: "PATCH", url: "/user/update-user-admin", successMessage: "কানেকশন সংখ্যা আপডেট করা হয়েছে",
    onSuccess: () => { refreshAll(); setConnectionTarget(null); },
  });

  const users = data?.data ?? [];
  const recipients = recipientsData?.data ?? [];
  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const page = Math.min(tableFilters.page, totalPages);
  const limit = data?.limit ?? (Number(params.get("limit")) || 10);
  const firstRow = data?.totalItems ? (page - 1) * limit + 1 : 0;
  const lastRow = data ? Math.min(page * limit, data.totalItems) : 0;
  const noFilters = !tableFilters.query && tableFilters.gender === "all" && tableFilters.publish === "all" && activeAdvanced === 0;
  const connectionNumber = Number(connectionValue);
  const connectionOk = connectionValue !== "" && Number.isInteger(connectionNumber) && connectionNumber >= 0;

  const openConnections = (user: User) => {
    setConnectionTarget(user);
    setConnectionValue(String(user.numberOfConnections ?? 0));
    setConnectionReason("");
  };
  const saveConnections = () => {
    if (!connectionTarget || !connectionOk || !connectionReason.trim()) return;
    updateConnectionsMutation.mutate({
      adjustmentReason: connectionReason.trim(), requestId: crypto.randomUUID(),
      id: connectionTarget._id, numberOfConnections: connectionNumber,
    });
  };
  const toggleSubscriber = (user: User) => {
    setSubscriberPending(user._id);
    toggleSubscriberMutation.mutate({ id: user._id }, { onSettled: () => setSubscriberPending(null) });
  };
  const editProfile = (user: User) => router.push(`/dashboard/edit-profile/${user._id}`);
  const openShare = (user: User) => {
    setSelectedShareUser(user);
    setRecipientSearch("");
    setRecipientPage(1);
    setShareDialogOpen(true);
  };
  const directShare = (recipient: ShareRecipient) => {
    if (!shareProfile) { toast.error("প্রোফাইল এখনো লোড হচ্ছে"); return; }
    const number = recipient.whatsapp || recipient.phoneNumber;
    if (!number) { toast.error("এই ব্যবহারকারীর WhatsApp নাম্বার নেই"); return; }
    window.open(buildBiodataWhatsappShareUrlForNumber(shareProfile, window.location.origin, number, { includeContactNumber: false }), "_blank", "noopener,noreferrer");
    setShareDialogOpen(false);
  };
  const groupShare = async (group: BiodataWhatsappGroup) => {
    if (!shareProfile) { toast.error("প্রোফাইল এখনো লোড হচ্ছে"); return; }
    const { copied } = await openBiodataWhatsappGroupShare(shareProfile, window.location.origin, group.inviteUrl);
    toast.success(copied ? `${group.label} এর জন্য CV টেক্সট কপি করা হয়েছে। এখন গ্রুপে পেস্ট করে পাঠান।`
      : `${group.label} খুলে দেওয়া হয়েছে। প্রয়োজনে CV টেক্সট ম্যানুয়ালি কপি করে পাঠান।`);
    setShareDialogOpen(false);
  };
  const copyShareMessage = async () => {
    if (!shareProfile) { toast.error("প্রোফাইল এখনো লোড হচ্ছে"); return; }
    const { copied } = await copyBiodataWhatsappText(shareProfile, window.location.origin, { includeContactNumber: false });
    if (copied) toast.success("WhatsApp মেসেজ কপি করা হয়েছে। এতে ফোন নাম্বার রাখা হয়নি।");
    else toast.error("মেসেজ কপি করা যায়নি। আবার চেষ্টা করুন।");
  };
  const copyProfile = async (user: User) => {
    setCopyingUserId(user._id);
    try {
      const profile = await queryClient.fetchQuery({
        queryKey: ["admin-share-profile", user._id],
        queryFn: () => GetRequestNormal<BiodataUser>(`/user/get-user-profile-admin?id=${user._id}`),
        staleTime: 5 * 60 * 1000,
      });
      const { copied } = await copyBiodataWhatsappText(profile, window.location.origin, { includeContactNumber: false });
      if (copied) toast.success(`"${user.name}" এর WhatsApp মেসেজ কপি করা হয়েছে। এতে ফোন নাম্বার রাখা হয়নি।`);
      else toast.error("মেসেজ কপি করা যায়নি। আবার চেষ্টা করুন।");
    } catch {
      toast.error("কপি করার জন্য প্রোফাইল লোড করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setCopyingUserId((current) => current === user._id ? null : current);
    }
  };

  const actions = (user: User, compact = false): ReactNode => <div className={cn("flex items-center gap-0.5", compact ? "flex-wrap" : "justify-end")}>
    <button type="button" onClick={() => openShare(user)} title="WhatsApp এ শেয়ার" aria-label={`${user.name} এর প্রোফাইল শেয়ার করুন`}
      className={cn(iconButton, "text-sky-600 hover:bg-sky-50")}><Share2 size={16} /></button>
    <button type="button" onClick={() => void copyProfile(user)} disabled={copyingUserId === user._id} title="ফোন নাম্বার ছাড়া বায়োডাটা কপি"
      aria-label={`${user.name} এর বায়োডাটা কপি করুন`} className={cn(iconButton, "text-amber-600 hover:bg-amber-50")}>
      {copyingUserId === user._id ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
    </button>
    <CopyContactButton id={user._id} />
    <button type="button" onClick={() => editProfile(user)} title="প্রোফাইল এডিট" aria-label={`${user.name} এর প্রোফাইল এডিট করুন`}
      className={cn(iconButton, "text-emerald-600 hover:bg-emerald-50")}><Pencil size={15} /></button>
    <button type="button" onClick={() => setDeleteTarget(user)} title="মুছে ফেলুন" aria-label={`${user.name} কে মুছে ফেলুন`}
      className={cn(iconButton, "text-red-600 hover:bg-red-50")}><Trash2 size={16} /></button>
  </div>;

  const skeletonRows = Array.from({ length: 6 }, (_, i) => <tr key={i} className="border-b border-[#f0f0f0]">
    {Array.from({ length: 6 }, (_, j) => <td key={j} className="px-3 py-3.5"><div className="h-4 animate-pulse rounded bg-[#f1f3f5]" /></td>)}
  </tr>);

  return <DashboardPage>
    <DashboardHeader
      title="ব্যবহারকারী"
      description="সব সদস্য খুঁজুন, ফিল্টার করুন এবং পরিচালনা করুন।"
      meta={data ? <StatusPill tone="neutral">{data.totalItems.toLocaleString()} জন পাওয়া গেছে</StatusPill> : null}
      actions={<>
        {quickLinks.map((link) => <a key={link.href} href={link.href} className={darkLink}>{link.label}</a>)}
        <DashButton tone="ghost-dark" disabled={isFetching} onClick={refreshAll} aria-label="রিফ্রেশ">
          <RefreshCw size={14} className={isFetching ? "animate-spin" : undefined} />
        </DashButton>
      </>}>
      <label className="relative w-full sm:min-w-[240px] sm:flex-1 lg:max-w-md">
        <span className="sr-only">খুঁজুন</span>
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="নাম, ইমেইল, ফোন বা বায়োডাটা নাম্বার"
          className={cn(darkField, "w-full pl-8")} />
        {search && <button type="button" aria-label="খোঁজ মুছুন" onClick={() => setSearch("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-white/60 hover:text-white"><X size={14} /></button>}
      </label>
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
        <select aria-label="লিঙ্গ" value={tableFilters.gender} onChange={(e) => void setTableFilters({ gender: e.target.value, page: 1 })} className={darkField}>
          <option value="all">সকল লিঙ্গ</option><option value="male">পুরুষ</option><option value="female">মহিলা</option>
        </select>
        <select aria-label="প্রকাশ" value={tableFilters.publish} onChange={(e) => void setTableFilters({ publish: e.target.value, page: 1 })} className={darkField}>
          <option value="all">প্রকাশিত ও লুকানো</option><option value="true">প্রকাশিত</option><option value="false">অপ্রকাশিত</option>
        </select>
      </div>
      <DashButton tone={filtersOpen ? "primary" : "ghost-dark"} className="w-full sm:w-auto" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((v) => !v)}>
        <Filter size={14} /> আরও ফিল্টার
        {activeAdvanced > 0 && <span className="rounded-full bg-white px-1.5 text-[11px] font-semibold text-rose-700">{activeAdvanced}</span>}
      </DashButton>
    </DashboardHeader>

    <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard label="মোট সদস্য" value={totalCount.data?.totalItems} hint="সব ফিল্টার মুছে দেখুন" active={noFilters}
        onClick={() => push((q) => { [...ADVANCED_KEYS, "query", "gender", "publish"].forEach((k) => { if (k !== "limit" && k !== "sort") q.delete(k); }); })} />
      <StatCard label="প্রকাশিত" value={publishedCount.data?.totalItems} hint="বায়োডাটা সবাই দেখতে পায়" active={tableFilters.publish === "true"}
        onClick={() => void setTableFilters({ publish: tableFilters.publish === "true" ? "all" : "true", page: 1 })} />
      <StatCard label="প্রিমিয়াম" value={premiumCount.data?.totalItems} hint="প্রিমিয়াম সদস্যপদ" active={params.get("accountType") === "premium"}
        onClick={() => push((q) => { if (q.get("accountType") === "premium") q.delete("accountType"); else q.set("accountType", "premium"); })} />
      <StatCard label="যাচাই অপেক্ষমাণ" value={pendingCount.data?.totalItems} hint="বায়োডাটা যাচাই বাকি" active={params.get("verificationStatus") === "pending"}
        onClick={() => push((q) => { if (q.get("verificationStatus") === "pending") q.delete("verificationStatus"); else q.set("verificationStatus", "pending"); })} />
    </section>

    {filtersOpen && <AdminUserFilters onClose={() => setFiltersOpen(false)} />}
    <ActiveFilterChips onEdit={() => setFiltersOpen(true)} />

    <Panel bodyClassName="p-0" title="সদস্য তালিকা"
      description={data ? `দেখানো হচ্ছে ${firstRow.toLocaleString()}–${lastRow.toLocaleString()}, মোট ${data.totalItems.toLocaleString()} জন` : "লোড হচ্ছে…"}
      actions={isFetching && !isLoading ? <span className="inline-flex items-center gap-1.5 text-[12px] text-[#6c757d]"><Loader2 size={13} className="animate-spin" /> আপডেট হচ্ছে</span> : undefined}>
      {error ? <div className="px-4 py-14 text-center">
        <p className="text-[14px] font-medium text-red-700">ডেটা লোড করতে সমস্যা হয়েছে</p>
        <DashButton className="mt-3" onClick={() => void refetch()}><RefreshCw size={14} /> আবার চেষ্টা করুন</DashButton>
      </div> : <>
        <div className="hidden overflow-x-auto md:block">
          <table className={cn("w-full min-w-[960px] border-collapse text-[13px] transition-opacity", isFetching && !isLoading && "opacity-60")}>
            <thead className="bg-white">
              <tr>
                <PlainHeader label="সদস্য" /><PlainHeader label="যোগাযোগ" /><PlainHeader label="কানেকশন" className="text-center" />
                <PlainHeader label="অবস্থা" /><PlainHeader label="সাবস্ক্রাইবার" className="text-center" /><PlainHeader label="অ্যাকশন" className="text-right" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? skeletonRows : users.map((user) => <tr key={user._id} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#f8f9fa]">
                <td className="max-w-[240px] px-3 py-2.5">
                  <button type="button" onClick={() => editProfile(user)} className="block max-w-full truncate text-left font-medium text-[#212529] hover:text-rose-700 hover:underline">
                    {user.name || "নাম নেই"}
                  </button>
                  <p className="mt-0.5 truncate text-[12px] text-[#6c757d]">
                    <span className="font-mono">#{user.userId || "—"}</span>{user.maritalStatus && <> · {user.maritalStatus}</>}
                  </p>
                </td>
                <td className="max-w-[240px] px-3 py-2.5 text-[12px] text-[#495057]">
                  <p className="flex items-center gap-1.5 truncate"><Mail size={12} className="shrink-0 text-[#adb5bd]" />{user.email || <span className="text-[#adb5bd]">—</span>}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate"><Phone size={12} className="shrink-0 text-[#adb5bd]" />{user.phoneNumber || <span className="text-[#adb5bd]">—</span>}</p>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <button type="button" onClick={() => openConnections(user)} title="কানেকশন পরিবর্তন করুন"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#e9ecef] px-2.5 py-1 font-semibold tabular-nums hover:border-rose-300 hover:bg-rose-50">
                    {user.numberOfConnections ?? 0}<Pencil size={11} className="text-[#adb5bd]" />
                  </button>
                </td>
                <td className="px-3 py-2.5"><StatusPills user={user} /></td>
                <td className="px-3 py-2.5 text-center">
                  <label className="inline-flex items-center gap-2"><span className="sr-only">সাবস্ক্রাইবার</span>
                    {subscriberPending === user._id ? <Loader2 size={16} className="animate-spin text-[#adb5bd]" />
                      : <Toggle checked={!!user.isSubscriber} disabled={!!subscriberPending} onChange={() => toggleSubscriber(user)} />}
                  </label>
                </td>
                <td className="px-3 py-2">{actions(user)}</td>
              </tr>)}
              {!isLoading && !users.length && <tr><td colSpan={6} className="px-3 py-14 text-center text-[13px] text-[#6c757d]">
                কোনো ব্যবহারকারী পাওয়া যায়নি।
                {!noFilters && <button type="button" className="ml-1 font-medium text-rose-700 underline"
                  onClick={() => push((q) => { q.delete("query"); q.delete("gender"); q.delete("publish"); })}>খোঁজ ও প্রধান ফিল্টার মুছুন</button>}
              </td></tr>}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-[#f0f0f0] md:hidden">
          {isLoading ? Array.from({ length: 4 }, (_, i) => <li key={i} className="space-y-2 p-4">
            <div className="h-4 w-1/2 animate-pulse rounded bg-[#f1f3f5]" /><div className="h-3 w-3/4 animate-pulse rounded bg-[#f1f3f5]" />
          </li>) : users.map((user) => <li key={user._id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <button type="button" onClick={() => editProfile(user)} className="block max-w-full truncate text-left text-[15px] font-semibold hover:text-rose-700">{user.name || "নাম নেই"}</button>
                <p className="text-[12px] text-[#6c757d]"><span className="font-mono">#{user.userId || "—"}</span>{user.maritalStatus && <> · {user.maritalStatus}</>}</p>
              </div>
              <button type="button" onClick={() => openConnections(user)} className="flex shrink-0 items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1.5 text-[13px] font-semibold text-rose-800">
                <Wallet size={14} /> {user.numberOfConnections ?? 0}
              </button>
            </div>
            <div className="space-y-1 text-[13px] text-[#495057]">
              {user.email && <p className="flex items-center gap-2 truncate"><Mail size={14} className="shrink-0 text-[#adb5bd]" />{user.email}</p>}
              {user.phoneNumber && <p className="flex items-center gap-2"><Phone size={14} className="shrink-0 text-[#adb5bd]" />{user.phoneNumber}</p>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusPills user={user} />
              <label className="flex items-center gap-2 text-[12px] text-[#495057]">সাবস্ক্রাইবার
                {subscriberPending === user._id ? <Loader2 size={16} className="animate-spin text-[#adb5bd]" />
                  : <Toggle checked={!!user.isSubscriber} disabled={!!subscriberPending} onChange={() => toggleSubscriber(user)} />}
              </label>
            </div>
            <div className="border-t border-[#f0f0f0] pt-2">{actions(user, true)}</div>
          </li>)}
          {!isLoading && !users.length && <li className="px-4 py-12 text-center text-[13px] text-[#6c757d]">কোনো ব্যবহারকারী পাওয়া যায়নি।</li>}
        </ul>

        {data && data.totalItems > 0 && <div className="flex flex-col gap-3 border-t border-[#f0f0f0] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-[12px] text-[#6c757d]">প্রতি পেজে
            <select value={String(limit)} onChange={(e) => push((q) => q.set("limit", e.target.value))} className={cn(fieldClass, "w-auto py-1 text-[13px]")}>
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <nav aria-label="পেজ" className="flex items-center gap-1 self-center sm:self-auto">
            <DashButton className="px-2" aria-label="আগের পেজ" disabled={page <= 1 || isFetching} onClick={() => void setTableFilters({ page: page - 1 })}><ChevronLeft size={15} /></DashButton>
            {pageList(page, totalPages).map((item, i) => item === "gap"
              ? <span key={"gap" + i} className="px-1 text-[#adb5bd]">…</span>
              : <button key={item} type="button" aria-current={item === page ? "page" : undefined} onClick={() => void setTableFilters({ page: item })}
                className={cn("hidden h-8 min-w-8 rounded-md px-2 text-[13px] tabular-nums sm:inline-block", item === page ? "bg-[#1a1a2e] text-white" : "hover:bg-[#f1f3f5]")}>{item}</button>)}
            <span className="px-2 text-[13px] tabular-nums text-[#495057] sm:hidden">{page} / {totalPages}</span>
            <DashButton className="px-2" aria-label="পরের পেজ" disabled={page >= totalPages || isFetching} onClick={() => void setTableFilters({ page: page + 1 })}><ChevronRight size={15} /></DashButton>
          </nav>
        </div>}
      </>}
    </Panel>

    <Dialog open={!!connectionTarget} onOpenChange={(open) => { if (!open) setConnectionTarget(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>কানেকশন ব্যালেন্স পরিবর্তন</DialogTitle>
          <DialogDescription>{connectionTarget?.name}: বর্তমানে {connectionTarget?.numberOfConnections ?? 0}টি কানেকশন। পরিবর্তনটি অডিট হিস্ট্রিতে সংরক্ষিত হবে।</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveConnections(); }}>
          <div>
            <label htmlFor="connection-value" className={labelClass}>নতুন ব্যালেন্স</label>
            <input id="connection-value" type="number" min={0} step={1} inputMode="numeric" autoFocus value={connectionValue}
              onChange={(e) => setConnectionValue(e.target.value)} className={cn(fieldClass, "w-40")} aria-invalid={!!connectionValue && !connectionOk} />
            {!!connectionValue && !connectionOk && <p className="mt-1 text-[11px] text-red-600">০ বা তার বেশি পূর্ণ সংখ্যা দিন।</p>}
          </div>
          <div>
            <label htmlFor="connection-reason" className={labelClass}>কারণ <span className="text-red-600">*</span></label>
            <input id="connection-reason" dir="auto" value={connectionReason} onChange={(e) => setConnectionReason(e.target.value)}
              placeholder="যেমন: পেমেন্ট যাচাই করা হয়েছে" className={fieldClass} />
          </div>
          <div className="flex justify-end gap-2">
            <DashButton onClick={() => setConnectionTarget(null)}>বাতিল</DashButton>
            <DashButton type="submit" tone="primary" disabled={!connectionOk || !connectionReason.trim() || updateConnectionsMutation.isPending}>
              {updateConnectionsMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} সংরক্ষণ করুন
            </DashButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>“{deleteTarget?.name || "এই ব্যবহারকারী"}” কে মুছে ফেলবেন?</AlertDialogTitle>
          <AlertDialogDescription>এই কাজটি ফেরানো যাবে না। অ্যাকাউন্ট ও তার সমস্ত ডেটা স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>বাতিল</AlertDialogCancel>
          <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget._id); setDeleteTarget(null); }}>
            মুছে ফেলুন
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={shareDialogOpen} onOpenChange={(open) => { setShareDialogOpen(open); if (!open) { setRecipientSearch(""); setRecipientPage(1); } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{selectedShareUser?.name ? `“${selectedShareUser.name}” এর CV WhatsApp এ পাঠান` : "WhatsApp এ CV পাঠান"}</DialogTitle>
          <DialogDescription>একজন সদস্যকে সরাসরি, অথবা WhatsApp গ্রুপে পাঠান। মেসেজে ফোন নাম্বার থাকবে না।</DialogDescription>
        </DialogHeader>
        {isShareProfileLoading && <p className="flex items-center gap-2 rounded-md bg-[#f8f9fa] px-3 py-2 text-[13px] text-[#6c757d]"><Loader2 size={14} className="animate-spin" /> CV তৈরি হচ্ছে…</p>}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
          <section className="space-y-3 rounded-lg border border-[#e9ecef] p-4">
            <div>
              <h3 className="text-[14px] font-semibold">ব্যক্তিগত WhatsApp</h3>
              <p className="text-[12px] text-[#6c757d]">একজন নির্দিষ্ট সদস্যকে সরাসরি পাঠান।</p>
            </div>
            <label className="relative block">
              <span className="sr-only">সদস্য খুঁজুন</span>
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#adb5bd]" />
              <input value={recipientSearch} onChange={(e) => { setRecipientSearch(e.target.value); setRecipientPage(1); }}
                placeholder="নাম, ফোন বা বায়োডাটা নাম্বার" className={cn(fieldClass, "pl-8")} />
            </label>
            <div className="rounded-md border border-[#e9ecef]">
              {isRecipientsLoading ? <p className="flex h-40 items-center justify-center gap-2 text-[13px] text-[#6c757d]"><Loader2 size={14} className="animate-spin" /> তালিকা লোড হচ্ছে…</p>
                : !recipients.length ? <p className="flex h-40 items-center justify-center text-[13px] text-[#6c757d]">কোনো সদস্য পাওয়া যায়নি।</p>
                  : <ScrollArea className="h-[280px]">
                    <ul className="divide-y divide-[#f0f0f0]">{recipients.map((recipient) => {
                      const number = recipient.whatsapp || recipient.phoneNumber;
                      return <li key={recipient._id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium">{recipient.name || "নাম নেই"}</p>
                          <p className="text-[12px] text-[#6c757d]">#{recipient.userId || "—"} · {number || "WhatsApp নাম্বার নেই"}</p>
                        </div>
                        <DashButton tone="primary" className="bg-green-600 hover:bg-green-700" disabled={!number || !shareProfile || isShareProfileLoading}
                          onClick={() => directShare(recipient)}><Send size={13} /> পাঠান</DashButton>
                      </li>;
                    })}</ul>
                  </ScrollArea>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#6c757d]">
              <span>মোট {recipientsData?.totalItems ?? 0} জন{isRecipientsFetching && !isRecipientsLoading ? " · আপডেট হচ্ছে…" : ""}</span>
              {!!recipientsData && recipientsData.totalPages > 1 && <div className="flex items-center gap-1.5">
                <DashButton className="px-2 py-1" aria-label="আগের" disabled={!recipientsData.hasPreviousPage || isRecipientsFetching} onClick={() => setRecipientPage((p) => Math.max(1, p - 1))}><ChevronLeft size={14} /></DashButton>
                <span className="tabular-nums">{recipientPage} / {recipientsData.totalPages}</span>
                <DashButton className="px-2 py-1" aria-label="পরের" disabled={!recipientsData.hasNextPage || isRecipientsFetching} onClick={() => setRecipientPage((p) => p + 1)}><ChevronRight size={14} /></DashButton>
              </div>}
            </div>
          </section>
          <section className="space-y-3 rounded-lg border border-[#e9ecef] p-4">
            <div>
              <h3 className="text-[14px] font-semibold">WhatsApp গ্রুপ</h3>
              <p className="text-[12px] text-[#6c757d]">গ্রুপ খুলবে এবং CV টেক্সট কপি হয়ে যাবে।</p>
            </div>
            {BIODATA_WHATSAPP_GROUPS.map((group) => <div key={group.id} className="space-y-2 rounded-md border border-dashed border-[#ced4da] p-3">
              <p className="text-[13px] font-medium">{group.label}</p>
              <p className="text-[12px] text-[#6c757d]">{group.description}</p>
              <DashButton tone="primary" className="w-full bg-green-600 hover:bg-green-700" disabled={!shareProfile || isShareProfileLoading}
                onClick={() => void groupShare(group)}><Send size={13} /> এই গ্রুপে পাঠান</DashButton>
            </div>)}
            <DashButton className="w-full" disabled={!shareProfile || isShareProfileLoading} onClick={() => void copyShareMessage()}>
              <Copy size={13} /> শুধু মেসেজ কপি করুন
            </DashButton>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  </DashboardPage>;
}
