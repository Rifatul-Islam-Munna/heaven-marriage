"use client";
import type { Route } from "next";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Filter, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  countries,
  marriedStatus,
  educationMediumOptions,
  religiousEducationOptions,
  skinColorOptions,
  fiqhOptions,
  professionOptions,
  economicStatusOptions,
} from "@/staticData/all-data";
import { districts } from "@/staticData/districts";
import { upazilas } from "@/staticData/upazilas";
import { cn } from "@/lib/utils";
import { DashButton, fieldClass, labelClass } from "./dashboard-kit";

type Option = { value: string; label: string };
const yesNo: Option[] = [
  { value: "true", label: "হ্যাঁ" },
  { value: "false", label: "না" },
];
const groups: { key: string; label: string; options: Option[] }[] = [
  { key: "accountType", label: "সদস্যপদ", options: [{ value: "premium", label: "প্রিমিয়াম" }, { value: "general", label: "সাধারণ" }] },
  {
    key: "verificationStatus", label: "বায়োডাটা যাচাই", options: [
      { value: "pending", label: "অপেক্ষমাণ" }, { value: "approved", label: "অনুমোদিত" },
      { value: "rejected", label: "প্রত্যাখ্যাত" }, { value: "suspended", label: "স্থগিত" },
    ],
  },
  { key: "biodataStatus", label: "বায়োডাটার অবস্থা", options: [{ value: "draft", label: "খসড়া" }, { value: "submitted", label: "জমা দেওয়া" }] },
  { key: "role", label: "অ্যাকাউন্টের ভূমিকা", options: [{ value: "user", label: "ব্যবহারকারী" }, { value: "admin", label: "অ্যাডমিন" }, { value: "editor", label: "এডিটর" }] },
  { key: "phoneVerified", label: "ফোন যাচাইকৃত", options: yesNo },
  { key: "emailVerified", label: "ইমেইল যাচাইকৃত", options: yesNo },
  { key: "hasPhone", label: "ফোন যুক্ত আছে", options: yesNo },
  { key: "hasEmail", label: "ইমেইল যুক্ত আছে", options: yesNo },
];
const multiGroups: { key: string; label: string; options: Option[] }[] = [
  { key: "maritalStatus", label: "বৈবাহিক অবস্থা", options: marriedStatus.filter((v) => v.en !== "all").map((v) => ({ value: v.en, label: v.bn })) },
  { key: "educationMedium", label: "শিক্ষার মাধ্যম", options: educationMediumOptions },
  { key: "profession", label: "পেশা", options: professionOptions },
  { key: "economicStatus", label: "পারিবারিক অর্থনৈতিক অবস্থা", options: economicStatusOptions },
  { key: "religiousEducation", label: "ধর্মীয় শিক্ষা", options: religiousEducationOptions },
  { key: "fiqh", label: "অনুসৃত ফিকহ", options: fiqhOptions },
  { key: "skinColor", label: "ত্বকের রং", options: skinColorOptions },
];
const rangePairs = [
  { min: "ageMin", max: "ageMax", label: "বয়স (বছর)", lower: 10, step: 1 },
  { min: "heightMin", max: "heightMax", label: "উচ্চতা (ফুট)", lower: 3, step: 0.01 },
  { min: "connectionsMin", max: "connectionsMax", label: "কানেকশন", lower: 0, step: 1 },
];
const sortOptions: Option[] = [
  { value: "newest", label: "নতুন আগে" },
  { value: "oldest", label: "পুরোনো আগে" },
  { value: "ageAsc", label: "বয়স: কম থেকে বেশি" },
  { value: "ageDesc", label: "বয়স: বেশি থেকে কম" },
  { value: "connectionsAsc", label: "কানেকশন: কম থেকে বেশি" },
  { value: "connectionsDesc", label: "কানেকশন: বেশি থেকে কম" },
];
/** Every advanced filter kept in the URL. */
export const ADVANCED_KEYS = [
  ...groups.map((v) => v.key),
  ...multiGroups.map((v) => v.key),
  ...rangePairs.flatMap((v) => [v.min, v.max]),
  "districtId", "upazilaId", "country", "registeredFrom", "registeredTo", "sort", "limit", "category",
];
/** Filters that change which members are listed (page size and order don't). */
const NARROWING_KEYS = ADVANCED_KEYS.filter((key) => key !== "limit" && key !== "sort");
const LABELS: Record<string, string> = {
  ...Object.fromEntries([...groups, ...multiGroups].map((g) => [g.key, g.label])),
  ageMin: "সর্বনিম্ন বয়স", ageMax: "সর্বোচ্চ বয়স", heightMin: "সর্বনিম্ন উচ্চতা", heightMax: "সর্বোচ্চ উচ্চতা",
  connectionsMin: "সর্বনিম্ন কানেকশন", connectionsMax: "সর্বোচ্চ কানেকশন",
  districtId: "জেলা", upazilaId: "উপজেলা", country: "দেশ", registeredFrom: "নিবন্ধন শুরু", registeredTo: "নিবন্ধন শেষ",
  sort: "সাজানো", category: "ক্যাটাগরি", query: "খোঁজ", gender: "লিঙ্গ", publish: "প্রকাশ",
};

function valueLabel(key: string, value: string) {
  const group = groups.find((g) => g.key === key);
  if (group) return group.options.find((o) => o.value === value)?.label || value;
  const multi = multiGroups.find((g) => g.key === key);
  if (multi) {
    const parts = value.split(",");
    return parts.length > 2 ? `${parts.length}টি নির্বাচিত` : parts.map((v) => multi.options.find((o) => o.value === v)?.label || v).join(", ");
  }
  if (key === "country") return countries.find((c) => c.en === value)?.bn || value;
  if (key === "districtId") return districts.find((d) => d.name === value)?.bn_name || value;
  if (key === "upazilaId") return upazilas.find((u) => u.name === value)?.bn_name || value;
  if (key === "sort") return sortOptions.find((o) => o.value === value)?.label || value;
  if (key === "gender") return value === "male" ? "পুরুষ" : value === "female" ? "মহিলা" : value;
  if (key === "publish") return value === "true" ? "প্রকাশিত" : value === "false" ? "অপ্রকাশিত" : value;
  return value;
}

/** Push a URL change that resets the list to page 1. */
export function useAdminFilterNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const push = (mutate: (q: URLSearchParams) => void) => {
    const q = new URLSearchParams(params.toString());
    mutate(q);
    q.set("page", "1");
    router.push((pathname + "?" + q.toString()) as Route, { scroll: false });
  };
  return { params, push };
}

export function useActiveFilterCount() {
  const params = useSearchParams();
  return NARROWING_KEYS.filter((key) => params.get(key)).length;
}

/** Removable chips for every filter currently applied. */
export function ActiveFilterChips({ onEdit }: { onEdit: () => void }) {
  const { params, push } = useAdminFilterNavigation();
  const chips: { key: string; value: string }[] = [];
  for (const key of ["query", "gender", "publish", ...NARROWING_KEYS, "sort"]) {
    const value = params.get(key);
    if (!value || ((key === "gender" || key === "publish") && value === "all")) continue;
    chips.push({ key, value });
  }
  if (!chips.length) return null;
  return <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-white px-3 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
    <span className="mr-1 text-[12px] font-medium text-[#6c757d]">সক্রিয় ফিল্টার</span>
    {chips.map(({ key, value }) => <span key={key} className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-rose-200 bg-rose-50 py-0.5 pl-2.5 pr-0.5 text-[12px] text-rose-900">
      <button type="button" onClick={onEdit} className="truncate hover:underline" title="ফিল্টার পরিবর্তন করুন">
        {LABELS[key] || key}: <span className="font-medium">{valueLabel(key, value)}</span>
      </button>
      <button type="button" aria-label={`${LABELS[key] || key} ফিল্টার সরান`}
        onClick={() => push((q) => { q.delete(key); if (key === "districtId") q.delete("upazilaId"); })}
        className="rounded-full p-1 hover:bg-rose-100"><X size={12} /></button>
    </span>)}
    <button type="button" onClick={() => push((q) => { [...ADVANCED_KEYS, "query", "gender", "publish"].forEach((k) => q.delete(k)); })}
      className="ml-1 text-[12px] font-medium text-rose-700 underline hover:text-rose-800">সব মুছুন</button>
  </div>;
}

function MultiFilter({ id, label, options, value, onChange }: {
  id: string; label: string; options: Option[]; value: string; onChange: (v: string) => void;
}) {
  const selected = value ? value.split(",") : [];
  const summary = !selected.length ? "সকল" : selected.length === 1
    ? options.find((o) => o.value === selected[0])?.label || selected[0] : `${selected.length}টি নির্বাচিত`;
  return <div className="min-w-0">
    <label htmlFor={id} className={labelClass}>{label}</label>
    <Popover>
      <PopoverTrigger asChild>
        <button id={id} type="button" className={cn(fieldClass, "flex items-center justify-between gap-2 text-left", selected.length && "border-rose-300 bg-rose-50/50")}>
          <span className="truncate">{summary}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-h-80 w-72 overflow-y-auto p-2" align="start">
        <div className="flex items-center justify-between px-1 pb-1">
          <span className="text-[12px] text-[#6c757d]">{selected.length ? `${selected.length}টি নির্বাচিত` : "একাধিক বেছে নিন"}</span>
          {selected.length > 0 && <button type="button" onClick={() => onChange("")} className="text-[12px] font-medium text-rose-700 hover:underline">মুছুন</button>}
        </div>
        {options.map((o, i) => <label key={o.value} className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-[#f8f9fa]">
          <Checkbox id={id + "-" + i} checked={selected.includes(o.value)}
            onCheckedChange={(checked) => onChange((checked ? [...selected, o.value] : selected.filter((v) => v !== o.value)).join(","))} />
          <span>{o.label}</span>
        </label>)}
      </PopoverContent>
    </Popover>
  </div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <fieldset className="min-w-0">
    <legend className="mb-3 w-full border-b border-[#f0f0f0] pb-1.5 text-[13px] font-semibold text-[#212529]">{title}</legend>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
  </fieldset>;
}

/** The advanced filter panel. Changes apply only when the admin presses Apply. */
export default function AdminUserFilters({ onClose }: { onClose: () => void }) {
  const { params, push } = useAdminFilterNavigation();
  const query = params.toString();
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(ADVANCED_KEYS.map((k) => [k, params.get(k) || ""])));
  useEffect(() => {
    const q = new URLSearchParams(query);
    setDraft(Object.fromEntries(ADVANCED_KEYS.map((k) => [k, q.get(k) || ""])));
  }, [query]);
  const set = (key: string, value: string) => setDraft((old) => ({ ...old, [key]: value, ...(key === "districtId" ? { upazilaId: "" } : {}) }));
  const select = (key: string, label: string, options: Option[], disabled = false, placeholder = "সকল") => <div key={key} className="min-w-0">
    <label htmlFor={"admin-filter-" + key} className={labelClass}>{label}</label>
    <select id={"admin-filter-" + key} value={draft[key] || ""} disabled={disabled} onChange={(e) => set(key, e.target.value)}
      className={cn(fieldClass, draft[key] && "border-rose-300 bg-rose-50/50")}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>;
  const district = districts.find((d) => d.name === draft.districtId);
  const chosen = NARROWING_KEYS.filter((k) => draft[k]).length;
  const changed = ADVANCED_KEYS.some((k) => (draft[k] || "") !== (params.get(k) || ""));

  const apply = () => {
    for (const pair of rangePairs)
      if (draft[pair.min] && draft[pair.max] && Number(draft[pair.min]) > Number(draft[pair.max])) {
        toast.error(`${pair.label}: সর্বনিম্ন মান সর্বোচ্চ মানের চেয়ে বড় হতে পারে না`);
        return;
      }
    if (draft.registeredFrom && draft.registeredTo && draft.registeredFrom > draft.registeredTo) {
      toast.error("নিবন্ধনের তারিখের সীমা ঠিক করুন");
      return;
    }
    push((q) => {
      ADVANCED_KEYS.forEach((k) => q.delete(k));
      ADVANCED_KEYS.forEach((k) => { if (draft[k]) q.set(k, draft[k]); });
    });
    onClose();
  };

  return <section aria-label="বিস্তারিত ফিল্টার" className="rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
    <div className="flex items-center justify-between gap-2 border-b border-[#f0f0f0] px-4 py-3">
      <div>
        <h2 className="flex items-center gap-2 text-[14px] font-semibold"><Filter size={15} className="text-rose-600" /> বিস্তারিত ফিল্টার</h2>
        <p className="text-[12px] text-[#6c757d]">{chosen ? `${chosen}টি ফিল্টার বেছে নেওয়া হয়েছে` : "যেকোনো সংমিশ্রণে ফিল্টার করুন"}</p>
      </div>
      <DashButton className="px-2" aria-label="ফিল্টার বন্ধ করুন" onClick={onClose}><X size={16} /></DashButton>
    </div>
    <form className="space-y-6 p-4" onSubmit={(e) => { e.preventDefault(); apply(); }}>
      <Section title="অ্যাকাউন্ট ও যাচাই">{groups.map((g) => select(g.key, g.label, g.options))}</Section>
      <Section title="ঠিকানা">
        {select("country", "দেশ", countries.map((c) => ({ value: c.en, label: c.bn })))}
        {select("districtId", "জেলা", districts.map((d) => ({ value: d.name, label: d.bn_name })))}
        {select("upazilaId", "উপজেলা", upazilas.filter((u) => u.district_id === district?.id).map((u) => ({ value: u.name, label: u.bn_name })),
          !district, district ? "সকল" : "আগে জেলা বেছে নিন")}
      </Section>
      <Section title="প্রোফাইল">
        {multiGroups.map((g) => <MultiFilter key={g.key} id={"admin-filter-" + g.key} label={g.label} options={g.options}
          value={draft[g.key] || ""} onChange={(v) => set(g.key, v)} />)}
      </Section>
      <Section title="সীমা ও তারিখ">
        {rangePairs.map((pair) => <div key={pair.min} className="min-w-0">
          <p className={labelClass}>{pair.label}</p>
          <div className="flex items-center gap-2">
            <input aria-label={LABELS[pair.min]} type="number" inputMode="decimal" min={pair.lower} step={pair.step} value={draft[pair.min] || ""}
              onChange={(e) => set(pair.min, e.target.value)} placeholder="থেকে" className={cn(fieldClass, draft[pair.min] && "border-rose-300")} />
            <span className="text-[#adb5bd]">–</span>
            <input aria-label={LABELS[pair.max]} type="number" inputMode="decimal" min={pair.lower} step={pair.step} value={draft[pair.max] || ""}
              onChange={(e) => set(pair.max, e.target.value)} placeholder="পর্যন্ত" className={cn(fieldClass, draft[pair.max] && "border-rose-300")} />
          </div>
        </div>)}
        <div className="min-w-0">
          <p className={labelClass}>নিবন্ধনের তারিখ</p>
          <div className="flex items-center gap-2">
            <input aria-label="নিবন্ধন শুরু" type="date" value={draft.registeredFrom || ""} onChange={(e) => set("registeredFrom", e.target.value)} className={cn(fieldClass, "px-2")} />
            <span className="text-[#adb5bd]">–</span>
            <input aria-label="নিবন্ধন শেষ" type="date" value={draft.registeredTo || ""} onChange={(e) => set("registeredTo", e.target.value)} className={cn(fieldClass, "px-2")} />
          </div>
        </div>
        {select("sort", "সাজানোর ক্রম", sortOptions, false, "ডিফল্ট")}
      </Section>
      <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-lg border-t border-[#f0f0f0] bg-white/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <DashButton onClick={() => setDraft({})}><RotateCcw size={14} /> সব বাছাই মুছুন</DashButton>
        <div className="flex gap-2">
          <DashButton className="flex-1 sm:flex-none" onClick={onClose}>বাতিল</DashButton>
          <DashButton type="submit" tone="primary" className="flex-1 sm:flex-none" disabled={!changed}><Check size={14} /> ফিল্টার প্রয়োগ করুন</DashButton>
        </div>
      </div>
    </form>
  </section>;
}
