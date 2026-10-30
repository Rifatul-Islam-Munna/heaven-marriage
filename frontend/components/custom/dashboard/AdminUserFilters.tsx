"use client";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, RotateCcw, ChevronDown } from "lucide-react";
import { toast } from "sonner";
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

type Option = { value: string; label: string };
const yesNo: Option[] = [
  { value: "true", label: "হ্যাঁ" },
  { value: "false", label: "না" },
];
const groups: { key: string; label: string; options: Option[] }[] = [
  {
    key: "accountType",
    label: "সদস্যপদ",
    options: [
      { value: "premium", label: "প্রিমিয়াম" },
      { value: "general", label: "সাধারণ" },
    ],
  },
  {
    key: "verificationStatus",
    label: "বায়োডাটা যাচাই",
    options: [
      { value: "pending", label: "অপেক্ষমাণ" },
      { value: "approved", label: "অনুমোদিত" },
      { value: "rejected", label: "প্রত্যাখ্যাত" },
      { value: "suspended", label: "স্থগিত" },
    ],
  },
  {
    key: "biodataStatus",
    label: "বায়োডাটার অবস্থা",
    options: [
      { value: "draft", label: "খসড়া" },
      { value: "submitted", label: "জমা দেওয়া" },
    ],
  },
  { key: "phoneVerified", label: "ফোন যাচাইকৃত", options: yesNo },
  { key: "emailVerified", label: "ইমেইল যাচাইকৃত", options: yesNo },
  { key: "hasPhone", label: "ফোন যুক্ত আছে", options: yesNo },
  { key: "hasEmail", label: "ইমেইল যুক্ত আছে", options: yesNo },
  {
    key: "role",
    label: "অ্যাকাউন্টের ভূমিকা",
    options: [
      { value: "user", label: "ব্যবহারকারী" },
      { value: "admin", label: "অ্যাডমিন" },
      { value: "editor", label: "এডিটর" },
    ],
  },
];
const multiGroups: { key: string; label: string; options: Option[] }[] = [
  {
    key: "maritalStatus",
    label: "বৈবাহিক অবস্থা",
    options: marriedStatus
      .filter((v) => v.en !== "all")
      .map((v) => ({ value: v.en, label: v.bn })),
  },
  {
    key: "educationMedium",
    label: "শিক্ষার মাধ্যম",
    options: educationMediumOptions,
  },
  { key: "profession", label: "পেশা", options: professionOptions },
  {
    key: "economicStatus",
    label: "পারিবারিক অর্থনৈতিক অবস্থা",
    options: economicStatusOptions,
  },
  {
    key: "religiousEducation",
    label: "ধর্মীয় শিক্ষা",
    options: religiousEducationOptions,
  },
  { key: "fiqh", label: "অনুসৃত ফিকহ", options: fiqhOptions },
  { key: "skinColor", label: "ত্বকের রং", options: skinColorOptions },
];
const rangeFields = [
  { key: "ageMin", label: "সর্বনিম্ন বয়স", min: 10, step: 1 },
  { key: "ageMax", label: "সর্বোচ্চ বয়স", min: 10, step: 1 },
  { key: "heightMin", label: "সর্বনিম্ন উচ্চতা (ফুট)", min: 3, step: 0.01 },
  { key: "heightMax", label: "সর্বোচ্চ উচ্চতা (ফুট)", min: 3, step: 0.01 },
  { key: "connectionsMin", label: "সর্বনিম্ন কানেকশন", min: 0, step: 1 },
  { key: "connectionsMax", label: "সর্বোচ্চ কানেকশন", min: 0, step: 1 },
];
const keys = [
  ...groups.map((v) => v.key),
  ...multiGroups.map((v) => v.key),
  ...rangeFields.map((v) => v.key),
  "districtId",
  "upazilaId",
  "country",
  "registeredFrom",
  "registeredTo",
  "sort",
  "limit",
  "category",
];
function MultiFilter({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  const selected = value ? value.split(",") : [];
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
          >
            {selected.length ? `নির্বাচিত: ${selected.length}` : "সকল"}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 max-h-72 overflow-y-auto" align="start">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
          >
            সব নির্বাচন সরান
          </Button>
          {options.map((o, i) => (
            <label
              key={o.value}
              className="flex items-start gap-2 py-2 text-sm cursor-pointer"
            >
              <Checkbox
                id={id + "-" + i}
                checked={selected.includes(o.value)}
                onCheckedChange={(checked) =>
                  onChange(
                    (checked
                      ? [...selected, o.value]
                      : selected.filter((v) => v !== o.value)
                    ).join(","),
                  )
                }
              />
              <span>{o.label}</span>
            </label>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
export default function AdminUserFilters() {
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const query = params.toString();
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(keys.map(k => [k, params.get(k) || ""])));
  useEffect(() => {
    const q = new URLSearchParams(query);
    setDraft(Object.fromEntries(keys.map((k) => [k, q.get(k) || ""])));
  }, [query]);
  const set = (key: string, value: string) =>
    setDraft((old) => ({
      ...old,
      [key]: value,
      ...(key === "districtId" ? { upazilaId: "" } : {}),
    }));
  const select = (
    key: string,
    label: string,
    options: Option[],
    disabled = false,
  ) => (
    <div key={key} className="space-y-2">
      <Label htmlFor={"admin-filter-" + key}>{label}</Label>
      <Select
        value={draft[key] || "all"}
        onValueChange={(v) => { if (v) set(key, v === "all" ? "" : v); }}
        disabled={disabled}
      >
        <SelectTrigger id={"admin-filter-" + key} className="w-full">
          <SelectValue placeholder="সকল" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">সকল</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
  const district = districts.find((d) => d.name === draft.districtId);
  const active = keys.filter((k) => draft[k] && draft[k] !== "all").length;
  return (
    <Card className="border-pink-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-pink-700">
          <Filter className="h-5 w-5" />
          বিস্তারিত অ্যাডমিন ফিল্টার{" "}
          {active > 0 && (
            <span className="text-sm font-normal">({active}টি নির্বাচিত)</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            for (const [a, b] of [
              ["ageMin", "ageMax"],
              ["heightMin", "heightMax"],
              ["connectionsMin", "connectionsMax"],
            ])
              if (draft[a] && draft[b] && Number(draft[a]) > Number(draft[b])) {
                toast.error(
                  "সর্বনিম্ন মান সর্বোচ্চ মানের চেয়ে বড় হতে পারে না",
                );
                return;
              }
            if (
              draft.registeredFrom &&
              draft.registeredTo &&
              draft.registeredFrom > draft.registeredTo
            ) {
              toast.error("সঠিক তারিখের সীমা দিন");
              return;
            }
            const q = new URLSearchParams(query);
            keys.forEach((k) => q.delete(k));
            keys.forEach((k) => {
              if (draft[k] && draft[k] !== "all") q.set(k, draft[k]);
            });
            q.set("page", "1");
            router.push((pathname + "?" + q.toString()) as Route, {
              scroll: false,
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {groups.map((g) => select(g.key, g.label, g.options))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {select(
              "country",
              "দেশ",
              countries.map((c) => ({ value: c.en, label: c.bn })),
            )}
            {select(
              "districtId",
              "জেলা",
              districts.map((d) => ({ value: d.name, label: d.bn_name })),
            )}
            {select(
              "upazilaId",
              "উপজেলা",
              upazilas
                .filter((u) => u.district_id === district?.id)
                .map((u) => ({ value: u.name, label: u.bn_name })),
              !district,
            )}
            {multiGroups.map((g) => (
              <MultiFilter
                key={g.key}
                id={"admin-filter-" + g.key}
                label={g.label}
                options={g.options}
                value={draft[g.key] || ""}
                onChange={(v) => set(g.key, v)}
              />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {rangeFields.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={"admin-filter-" + f.key}>{f.label}</Label>
                <Input
                  id={"admin-filter-" + f.key}
                  type="number"
                  min={f.min}
                  step={f.step}
                  value={draft[f.key] || ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder="সীমা নেই"
                />
              </div>
            ))}
            {[
              ["registeredFrom", "নিবন্ধনের শুরুর তারিখ"],
              ["registeredTo", "নিবন্ধনের শেষ তারিখ"],
            ].map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={"admin-filter-" + key}>{label}</Label>
                <Input
                  id={"admin-filter-" + key}
                  type="date"
                  value={draft[key] || ""}
                  onChange={(e) => set(key, e.target.value)}
                />
              </div>
            ))}
            {select("sort", "সাজানোর ক্রম", [
              { value: "newest", label: "নতুন আগে" },
              { value: "oldest", label: "পুরোনো আগে" },
              { value: "ageAsc", label: "বয়স: কম থেকে বেশি" },
              { value: "ageDesc", label: "বয়স: বেশি থেকে কম" },
              { value: "connectionsAsc", label: "কানেকশন: কম থেকে বেশি" },
              { value: "connectionsDesc", label: "কানেকশন: বেশি থেকে কম" },
            ])}
            {select(
              "limit",
              "প্রতি পেজে ব্যবহারকারী",
              [10, 25, 50, 100].map((n) => ({
                value: String(n),
                label: String(n),
              })),
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" className="bg-pink-600 hover:bg-pink-700">
              <Filter className="h-4 w-4" />
              ফিল্টার প্রয়োগ করুন
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft({});
                router.push(pathname as Route, { scroll: false });
              }}
            >
              <RotateCcw className="h-4 w-4" />
              সব ফিল্টার মুছুন
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
