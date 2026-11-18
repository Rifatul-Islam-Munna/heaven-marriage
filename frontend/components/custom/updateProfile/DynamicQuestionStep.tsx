"use client";
import { useMemo, useState } from "react";
import { useProfileStore } from "@/zustan/useProfileStore";
import { profileQuestionOptions } from "@/lib/profile-question-options";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import type { LocationEntry, LocationResponse } from "@/lib/location-options";
import {
  questionApplies,
  locationQuestionApplies,
  locationQuestionVisible,
  locationQuestionLabel,
  questionInputAttributes,
  readQuestionAnswer,
  questionUsesSeparateStorage,
  questionRuleErrors,
  questionDisplayValue,
  questionAnswerFitsInput,
  questionOptionsWithSavedAnswer,
  savedMultiValues,
  type ProfileQuestion,
  type ProfileQuestionSchema,
  type QuestionOption,
} from "@/lib/profile-questions";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSearch,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import PhoneNumberInput from "@/components/custom/common/PhoneNumberInput";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ageFromBirthDate } from "@/lib/birth-date";
import BirthDateSelect from "./BirthDateSelect";
import { adminAnswerIsComplete } from "@/lib/admin-biodata-progress";

export function SavedQuestionAnswer({
  q,
  value,
  options,
  onChange,
}: {
  q: ProfileQuestion;
  value: unknown;
  options: QuestionOption[];
  onChange?: (next: string | number) => void;
}) {
  // The dedicated DOB picker offers the correction path for legacy dates.
  if (q.path === "dateOfBirth" || questionAnswerFitsInput(value, q, options))
    return null;
  const editableScalar =
    ["number", "date"].includes(q.type) && typeof value === "string";
  return (
    <div
      className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
      data-saved-question-answer={q.id}
    >
      <p className="font-medium">
        আগের সংরক্ষিত উত্তরটি বর্তমান{" "}
        {q.type === "number" ? "সংখ্যা" : q.type === "date" ? "তারিখ" : "উত্তর"}{" "}
        ফরম্যাটের সঙ্গে মেলে না। নিচে সম্পাদনা করে সঠিক ফরম্যাটে দিন।
      </p>
      {editableScalar && onChange ? (
        <Input
          type="text"
          inputMode={q.type === "number" ? "decimal" : "text"}
          value={String(value)}
          onChange={(event) => {
            const next = event.target.value;
            if (q.type === "number")
              onChange(
                next.trim() !== "" && Number.isFinite(Number(next))
                  ? Number(next)
                  : next,
              );
            else onChange(next);
          }}
          className="border-amber-300 bg-white text-gray-900"
          aria-label="Edit previously saved answer"
        />
      ) : (
        <p className="whitespace-pre-wrap break-words">
          Saved answer: {questionDisplayValue(value, { ...q, type: "text" })}
        </p>
      )}
    </div>
  );
}

export function QuestionInput({
  q,
  value,
  onChange,
  gender,
  profile,
  preview = false,
  locations = [],
  error,
  readOnly = false,
}: {
  q: ProfileQuestion;
  value: unknown;
  onChange: (next: string | number | boolean | string[]) => void;
  gender?: string;
  profile?: Record<string, any>;
  preview?: boolean;
  locations?: LocationEntry[];
  error?: string;
  readOnly?: boolean;
}) {
  const [optionOpen, setOptionOpen] = useState(false);
  const configuredOptions = profileQuestionOptions(
    q,
    gender,
    profile,
    locations,
  );
  const options = questionOptionsWithSavedAnswer(q, configuredOptions, value);
  const selectedOption = options.find(
    (opt) => opt.value === String(value ?? ""),
  );
  const raw =
    value === undefined ||
    value === null ||
    (["number", "date"].includes(q.type) &&
      !questionAnswerFitsInput(value, q, options))
      ? ""
      : value;
  const id = "question-" + q.id;
  const choices = q.type === "multi_checkbox";
  const hasSavedAnswer = adminAnswerIsComplete(q, value);
  const address = profile?.address;
  const emptyOptionsMessage =
    q.optionSource === "cityCorporations"
      ? !address?.district
        ? "আগে জেলা নির্বাচন করুন।"
        : address?.upazila
          ? ""
          : "এই জেলায় সিটি কর্পোরেশন পাওয়া যায়নি। উপজেলা নির্বাচন করুন।"
      : q.optionSource === "upazilas"
        ? !address?.district
          ? "আগে জেলা নির্বাচন করুন।"
          : address?.cityCorporation
            ? ""
            : "এই জেলার জন্য কোনো উপজেলা যুক্ত করা হয়নি।"
        : q.optionSource === "cityAreas"
          ? !address?.district
            ? "আগে জেলা নির্বাচন করুন।"
            : !(address?.upazila || address?.cityCorporation)
              ? "আগে উপজেলা অথবা সিটি কর্পোরেশন নির্বাচন করুন।"
              : "এই ঠিকানার জন্য কোনো এলাকা যুক্ত করা হয়নি।"
          : "কোনো অপশন যুক্ত করা হয়নি।";
  return (
    <div
      className={`space-y-2 rounded-xl border p-3 shadow-sm sm:p-4 ${q.required ? "border-pink-200 bg-pink-50/70" : "border-emerald-200 bg-emerald-50/60"}`}
      data-profile-question={q.id}
      data-invalid={!!error || undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <Label
          htmlFor={id}
          className="block min-w-0 font-semibold leading-relaxed text-gray-900"
        >
          {locationQuestionLabel(q)}{" "}
          {q.required && (
            <span className="text-pink-600" aria-label="required">
              *
            </span>
          )}
        </Label>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {hasSavedAnswer && (
            <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-bold text-sky-800">
              ✓ উত্তর আছে
            </span>
          )}
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-bold ${q.required ? "bg-pink-600 text-white" : "bg-emerald-100 text-emerald-800"}`}
          >
            {q.required ? "আবশ্যিক" : "ঐচ্ছিক"}
          </span>
        </div>
      </div>
      <SavedQuestionAnswer
        q={q}
        value={value}
        options={configuredOptions}
        onChange={onChange}
      />
      {q.path === "address.upazila" && (
        <p className="text-sm text-muted-foreground">
          উপজেলা অথবা সিটি কর্পোরেশন — যেকোনো একটি নির্বাচন করুন।
        </p>
      )}
      {q.path === "dateOfBirth" ? (
        <BirthDateSelect
          id={id}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          disabled={readOnly}
          invalid={!!error}
          required={q.required}
        />
      ) : q.type === "checkbox" ? (
        <div role="group" aria-label={q.question} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: true, label: "হ্যাঁ" },
              { value: false, label: "না" },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={raw === option.value}
                onClick={() => onChange(option.value)}
                className={`min-h-11 rounded-xl border-2 px-3 py-2 text-sm font-bold transition-colors ${
                  raw === option.value
                    ? "border-pink-600 bg-pink-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-pink-300"
                }`}
              >
                {option.label} {raw === option.value ? "✓" : ""}
              </button>
            ))}
          </div>
          {typeof raw !== "boolean" && (
            <p className="text-xs text-gray-600">
              উত্তর নির্বাচন করুন (আগের উত্তর থাকলে উপরে দেখানো আছে)।
            </p>
          )}
        </div>
      ) : choices ? (
        <fieldset className="grid gap-2 sm:grid-cols-2">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm"
            >
              <Checkbox
                checked={savedMultiValues(raw).includes(opt.value)}
                onCheckedChange={(checked) => {
                  const previous = savedMultiValues(raw);
                  onChange(
                    checked === true
                      ? [...new Set([...previous, opt.value])]
                      : previous.filter((x) => x !== opt.value),
                  );
                }}
              />
              <span>{opt.label}</span>
            </label>
          ))}
          {!options.length && (
            <span className="text-xs text-amber-700">
              No options configured.
            </span>
          )}
        </fieldset>
      ) : q.type === "textarea" ? (
        <Textarea
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? id + "-error" : undefined}
          value={String(raw)}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          maxLength={5000}
          dir="auto"
          className="border-pink-200"
          placeholder="আপনার উত্তর লিখুন..."
        />
      ) : q.type === "select" || q.type === "dropdown" ? (
        <div className="space-y-2">
          <Popover open={optionOpen} onOpenChange={setOptionOpen}>
            <PopoverTrigger asChild>
              <Button
                id={id}
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={optionOpen}
                aria-invalid={!!error}
                aria-describedby={error ? id + "-error" : undefined}
                disabled={readOnly}
                className="h-11 w-full justify-between rounded-lg border-pink-200 bg-white px-3 text-left text-sm font-normal hover:bg-white"
              >
                <span className="truncate">
                  {selectedOption?.label || (raw ? String(raw) : "নির্বাচন করুন")}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0"
            >
              <Command>
                <CommandSearch
                  placeholder={
                    q.optionSource === "countries"
                      ? "দেশ খুঁজুন..."
                      : "উত্তর খুঁজুন..."
                  }
                />
                <CommandEmpty>কোনো মিল পাওয়া যায়নি।</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-y-auto">
                  {options.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      value={`${opt.label} ${opt.value}`}
                      onSelect={() => {
                        onChange(opt.value);
                        setOptionOpen(false);
                      }}
                      className="py-2.5"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 text-pink-600",
                          String(raw) === opt.value
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <span className="min-w-0 flex-1">{opt.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          {!options.length && !raw && emptyOptionsMessage && (
            <p className="text-xs text-muted-foreground">
              {emptyOptionsMessage}
            </p>
          )}
        </div>
      ) : ["phoneNumber", "guardianPhone", "whatsapp"].includes(
          q.path || "",
        ) ? (
        <PhoneNumberInput
          id={id}
          value={String(raw || "")}
          onChange={onChange}
          required={q.required}
          disabled={readOnly}
        />
      ) : (
        <Input
          id={id}
          {...questionInputAttributes(q)}
          dir="auto"
          aria-invalid={!!error}
          aria-describedby={error ? id + "-error" : undefined}
          required={q.required}
          disabled={readOnly}
          value={String(raw)}
          maxLength={q.type === "number" ? undefined : 5000}
          onChange={(event) =>
            onChange(
              q.type === "number"
                ? event.target.value === ""
                  ? ""
                  : Number(event.target.value)
                : event.target.value,
            )
          }
          className="border-pink-200"
          placeholder="আপনার উত্তর লিখুন..."
        />
      )}
      {error && (
        <p id={id + "-error"} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {preview && (
        <p className="text-[11px] text-muted-foreground">
          Live preview • {q.gender === "both" ? "Both" : q.gender} •{" "}
          {q.showPublic
            ? q.publicLabel || "Public label missing"
            : "Hidden publicly"}
        </p>
      )}
    </div>
  );
}

export function DynamicQuestionStep({
  step,
  schema,
}: {
  step: number;
  schema: ProfileQuestionSchema;
}) {
  const profile = useProfileStore((state) => state.formData);
  const updateField = useProfileStore((state) => state.updateField);
  const updateNestedField = useProfileStore((state) => state.updateNestedField);
  const updateCustomField = useProfileStore((state) => state.updateCustomField);
  const updateDynamicAnswer = useProfileStore(
    (state) => state.updateDynamicAnswer,
  );
  const { data: locations } = useQueryWrapper<LocationResponse>(
    ["public-location-options"],
    "/profile-questions/locations",
    { staleTime: 60000 },
  );
  const questions = useMemo(
    () =>
      schema.questions
        .filter(
          (q) =>
            q.section === step &&
            !q.locked &&
            questionApplies(q, profile.gender) &&
            locationQuestionVisible(q, profile),
        )
        .sort((a, b) => a.order - b.order),
    [schema, step, profile],
  );
  const errors = questionRuleErrors(profile, schema.questions);
  const archivedAnswers = useMemo(
    () =>
      schema.questions
        .filter(
          (q) =>
            q.section === step &&
            !q.enabled &&
            !q.locked &&
            (q.gender === "both" || q.gender === profile.gender),
        )
        .map((q) => ({ q, value: readQuestionAnswer(profile, q) }))
        .filter(
          ({ value }) =>
            value !== undefined &&
            value !== null &&
            value !== "" &&
            (!Array.isArray(value) || value.length > 0),
        ),
    [schema, step, profile],
  );
  const setAnswer = (
    q: ProfileQuestion,
    answer: string | number | boolean | string[],
  ) => {
    if (q.path === "dateOfBirth") {
      updateField("dateOfBirth", String(answer));
      updateField("age", ageFromBirthDate(String(answer)));
      return;
    }
    if (questionUsesSeparateStorage(q)) {
      updateDynamicAnswer(q.id, answer);
      return;
    }
    if (q.legacyKey) {
      updateCustomField(q.legacyKey, String(answer));
      return;
    }
    if (!q.path) return;
    const normalized =
      typeof answer === "string" &&
      [
        "age",
        "weight",
        "familyInfo.brotherCount",
        "familyInfo.sisterCount",
        "personalInformation.height",
      ].includes(q.path)
        ? answer === ""
          ? undefined
          : Number(answer)
        : answer;
    const [parent, field] = q.path.split(".");
    if (field) {
      updateNestedField(parent as any, field, normalized);
      if (q.path === "address.district") {
        updateNestedField("address", "upazila", "");
        updateNestedField("address", "cityCorporation", "");
        updateNestedField("address", "area", "");
      }
      if (q.path === "address.cityCorporation") {
        if (answer) updateNestedField("address", "upazila", "");
        if (answer || profile.address?.cityCorporation)
          updateNestedField("address", "area", "");
      }
      if (q.path === "address.upazila") {
        if (answer) updateNestedField("address", "cityCorporation", "");
        if (answer || profile.address?.upazila)
          updateNestedField("address", "area", "");
      }
    } else updateField(q.path as any, normalized as any);
  };
  return (
    <>
      {questions.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {questions.map((q) => (
            <div
              key={q.id}
              className={
                q.type === "textarea" || q.question.length > 130
                  ? "md:col-span-2"
                  : ""
              }
            >
              <QuestionInput
                q={{
                  ...q,
                  required: q.required && locationQuestionApplies(q, profile),
                }}
                gender={profile.gender}
                profile={profile}
                locations={locations?.entries}
                readOnly={q.path === "age" && !!profile.dateOfBirth}
                error={
                  errors.find(
                    (error) =>
                      error.questionId === q.id ||
                      error.otherQuestionId === q.id,
                  )?.message
                }
                value={readQuestionAnswer(profile, q)}
                onChange={(answer) => setAnswer(q, answer)}
              />
              {q.path === "age" && !!profile.dateOfBirth && (
                <p className="mt-1 px-1 text-xs text-slate-500">
                  বয়স জন্ম তারিখ থেকে হিসাব করা হয়েছে। পরিবর্তন করতে জন্ম তারিখ
                  সম্পাদনা করুন।
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
          এই ধাপে বর্তমানে কোনো সক্রিয় প্রশ্ন নেই।
        </p>
      )}
      {archivedAnswers.length > 0 && (
        <aside
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"
          aria-label="Archived saved answers"
        >
          <h3 className="text-sm font-bold text-amber-900">
            আগের সংরক্ষিত উত্তর (প্রশ্নটি এখন বন্ধ)
          </h3>
          <p className="mt-1 text-xs text-amber-800">
            এই উত্তরগুলো মুছে যায়নি। বন্ধ প্রশ্নগুলো বর্তমান সম্পূর্ণতার হিসাবে ধরা হয় না।
          </p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {archivedAnswers.map(({ q, value }) => (
              <div
                key={q.id}
                className="min-w-0 rounded-lg border border-amber-100 bg-white p-3"
              >
                <dt className="text-xs text-slate-600">{q.question}</dt>
                <dd className="mt-1 whitespace-pre-line break-words text-sm font-semibold text-slate-900">
                  {questionDisplayValue(value, q)}
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      )}
    </>
  );
}
