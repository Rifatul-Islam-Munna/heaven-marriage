"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown, CalendarDays, CheckCircle2 } from "lucide-react";
import {
  birthDateParts, completeBirthDate, daysInBirthMonth, formatBirthDate,
  type BirthDateParts,
} from "@/lib/birth-date";

const MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
] as const;
const banglaNumber = (value: number) => value.toLocaleString("bn-BD", { useGrouping: false });
const twoDigits = (value: number) => String(value).padStart(2, "0");

type BirthDateSelectProps = {
  value?: string | null;
  onChange: (isoDate: string) => void;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  large?: boolean;
};

/**
 * Day → Month → Year. Partial selections stay local; the profile is changed
 * only when all three parts form a valid ISO date. Existing saved dates
 * remain untouched until a complete replacement has been selected.
 */
export default function BirthDateSelect({
  value, onChange, id, disabled = false, invalid = false, required = false, large = false,
}: BirthDateSelectProps) {
  const uniqueId = useId();
  const controlId = id || uniqueId;
  const [parts, setParts] = useState<BirthDateParts>(() => birthDateParts(value));

  useEffect(() => {
    setParts(birthDateParts(value));
  }, [value]);

  const now = new Date();
  const yearNow = now.getFullYear();
  const monthNow = now.getMonth() + 1;
  const dayNow = now.getDate();
  const years = Array.from({ length: 121 }, (_, index) => yearNow - index);
  const monthLength = daysInBirthMonth(parts.month, parts.year);
  const completed = completeBirthDate(parts, now);
  const started = Boolean(parts.day || parts.month || parts.year);
  const invalidSelection = Boolean(parts.day && parts.month && parts.year && !completed);
  const previousSaved = typeof value === "string" && value ? formatBirthDate(value) || value : "";

  const changePart = (field: keyof BirthDateParts, selected: string) => {
    const updated = { ...parts, [field]: selected };
    // On changing from a longer month or leap year, never keep 31 February
    // or 29 February in a non-leap year.
    if ((field === "month" || field === "year") && updated.day &&
      Number(updated.day) > daysInBirthMonth(updated.month, updated.year)) {
      updated.day = "";
    }
    if (field === "year" && Number(updated.year) === yearNow &&
      Number(updated.month) > monthNow) {
      updated.month = "";
    }
    setParts(updated);
    const iso = completeBirthDate(updated, now);
    if (iso && iso !== value) onChange(iso);
  };

  const fields = [
    {
      key: "day" as const, label: "দিন", placeholder: "দিন",
      options: Array.from({ length: monthLength }, (_, index) => ({
        value: twoDigits(index + 1),
        label: banglaNumber(index + 1),
        disabled: Boolean(Number(parts.year) === yearNow && Number(parts.month) === monthNow &&
          index + 1 > dayNow),
      })),
    },
    {
      key: "month" as const, label: "মাস", placeholder: "মাস",
      options: MONTHS.map((label, index) => ({
        value: twoDigits(index + 1), label,
        disabled: Boolean(Number(parts.year) === yearNow && index + 1 > monthNow),
      })),
    },
    {
      key: "year" as const, label: "বছর", placeholder: "বছর",
      options: years.map(year => ({ value: String(year), label: banglaNumber(year), disabled: false })),
    },
  ];

  return (
    <div data-birth-date-select className="w-full space-y-2.5">
      <div className="grid grid-cols-[minmax(0,0.82fr)_minmax(0,1.16fr)_minmax(0,1fr)] gap-2 sm:gap-3">
        {fields.map(field => (
          <div key={field.key} className="min-w-0 space-y-1.5">
            <label htmlFor={controlId + "-" + field.key}
              className="block text-[12px] font-bold text-slate-600 sm:text-[13px]">
              {field.label}
            </label>
            <div className="relative">
              <select
                id={controlId + "-" + field.key}
                aria-label={"জন্ম " + field.label}
                aria-required={required}
                aria-invalid={invalid || invalidSelection}
                disabled={disabled}
                value={parts[field.key]}
                onChange={event => changePart(field.key, event.target.value)}
                className={[
                  "min-w-0 w-full appearance-none rounded-xl border-2 border-pink-200 bg-white",
                  "px-2.5 pr-7 text-[13px] font-semibold text-slate-900 shadow-sm outline-none",
                  "transition-colors hover:border-pink-400 focus:border-pink-600 focus:ring-2 focus:ring-pink-100",
                  "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60",
                  large ? "h-14 sm:text-base" : "h-12 sm:text-[14px]",
                ].join(" ")}
              >
                <option value="">{field.placeholder}</option>
                {field.options.map(option => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} aria-hidden="true"
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-pink-600" />
            </div>
          </div>
        ))}
      </div>

      {completed ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          <span>নির্বাচিত জন্মতারিখ: {formatBirthDate(completed)}</span>
        </div>
      ) : invalidSelection ? (
        <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          ভবিষ্যতের তারিখ বা ভুল জন্মতারিখ নির্বাচন করা যাবে না।
        </p>
      ) : (
        <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
          <CalendarDays size={15} className="mt-0.5 shrink-0 text-pink-500" aria-hidden="true" />
          <span>{started ? "জন্মতারিখ পূর্ণ করতে বাকি অংশ নির্বাচন করুন।" :
            "প্রথমে দিন, তারপর মাস ও বছর নির্বাচন করুন।"}
            {previousSaved && " আগের জন্মতারিখ নতুনটি সম্পূর্ণ না হওয়া পর্যন্ত অপরিবর্তিত থাকবে।"}
          </span>
        </p>
      )}
      {!completed && previousSaved && (
        <p className="text-xs text-slate-600">আগে সংরক্ষিত: <strong>{previousSaved}</strong></p>
      )}
    </div>
  );
}
