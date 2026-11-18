"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  currentBiodataStage,
  isSubmittedBiodata,
  type BiodataStatusSource,
} from "@/lib/biodata-status";
import {
  ArrowLeft,
  AlertCircle,
  Briefcase,
  Check,
  ChevronRight,
  Flame,
  Gem,
  GraduationCap,
  HeartHandshake,
  House,
  ListChecks,
  Loader2,
  MapPin,
  MessageCircle,
  PartyPopper,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useProfileStore } from "@/zustan/useProfileStore";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { PatchRequestAxios } from "@/api-hooks/api-hooks";
import {
  defaultQuestions,
  questionApplies,
  locationQuestionApplies,
  locationQuestionVisible,
  locationQuestionLabel,
  questionInputAttributes,
  questionUsesSeparateStorage,
  readQuestionAnswer,
  questionRuleErrors,
  newQuestionRuleErrors,
  questionDisplayValue,
  questionAnswerFitsInput,
  questionOptionsWithSavedAnswer,
  savedMultiValues,
  type ProfileQuestion,
  type ProfileQuestionSchema,
} from "@/lib/profile-questions";
import { profileQuestionOptions } from "@/lib/profile-question-options";
import { countries as countryCatalog } from "@/staticData/countries";
import type { LocationResponse } from "@/lib/location-options";
import AiBiodataAssistant from "./AiBiodataAssistant";
import {
  applyBiodataDraft,
  diffBiodataDraft,
  hasBiodataChanges,
} from "@/lib/biodata-draft";
import { previewBiodataCompletion } from "@/lib/profile-completion";
import { ageFromBirthDate } from "@/lib/birth-date";
import BirthDateSelect from "./BirthDateSelect";
import { SavedQuestionAnswer } from "./DynamicQuestionStep";
import PhoneNumberInput from "@/components/custom/common/PhoneNumberInput";

type View = "journey" | "play" | "levelDone" | "review" | "finish";
type Answer = string | number | boolean | string[];

const LEVEL_ICONS: LucideIcon[] = [
  User,
  MapPin,
  GraduationCap,
  Sparkles,
  House,
  Briefcase,
  Gem,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
];
const CHEERS = [
  "দারুণ!",
  "চমৎকার!",
  "খুব ভালো!",
  "এগিয়ে চলুন!",
  "অসাধারণ!",
  "বাহ!",
];
const NUMERIC_PATHS = [
  "age",
  "weight",
  "familyInfo.brotherCount",
  "familyInfo.sisterCount",
  "personalInformation.height",
];
const bn = (value: number) => value.toLocaleString("bn-BD");

const CSS = `
@keyframes qb-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes qb-fall{0%{transform:translateY(-24px) rotate(0);opacity:1}100%{transform:translateY(460px) rotate(540deg);opacity:0}}
@keyframes qb-pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
@keyframes qb-float{0%{transform:translateY(8px);opacity:0}20%{opacity:1}100%{transform:translateY(-30px);opacity:0}}
@keyframes qb-shake{0%,100%{transform:none}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
@keyframes qb-pulse{0%,100%{box-shadow:0 0 0 0 rgba(219,39,119,.45)}50%{box-shadow:0 0 0 10px rgba(219,39,119,0)}}
.qb-in{animation:qb-in .28s ease-out both}.qb-confetti{animation:qb-fall 1.7s ease-in forwards}
.qb-pop{animation:qb-pop .45s cubic-bezier(.2,.8,.2,1) both}.qb-float{animation:qb-float 1.2s ease-out forwards}
.qb-shake{animation:qb-shake .35s ease-in-out}.qb-pulse{animation:qb-pulse 1.8s ease-out infinite}
.qb-keyboard .qb-in{animation:none}
.qb-keyboard [data-question-content] input:not([type=checkbox]):not([type=radio]):not([type=hidden]){box-sizing:border-box;min-height:2.75rem;height:2.75rem;padding:.55rem .75rem!important;border-radius:.75rem;font-size:16px!important;line-height:1.25}
.qb-keyboard [data-question-content] input[type=number]{font-size:18px!important}
.qb-keyboard [data-question-content] textarea{box-sizing:border-box;min-height:4rem;max-height:max(4rem,calc(var(--qb-visible-height) - 10rem));padding:.55rem .75rem!important;border-radius:.75rem;font-size:16px!important;line-height:1.4;resize:none}
.qb-keyboard [data-question-content] select{box-sizing:border-box;min-height:2.75rem;height:2.75rem;padding-top:.45rem;padding-bottom:.45rem;font-size:16px!important}
.qb-keyboard [data-question-content] button{min-height:2.5rem;padding:.5rem .7rem;font-size:.875rem;line-height:1.25;border-radius:.75rem}
.qb-keyboard [data-question-content] [data-birth-date-select] select{min-height:2.75rem;height:2.75rem;font-size:16px!important}
.qb-keyboard [data-question-header] button{min-height:2rem;height:2rem}
.qb-keyboard [data-question-navigation] button{min-height:2.5rem;padding-top:.5rem;padding-bottom:.5rem;border-radius:.75rem}
.qb-keyboard [data-question-content] h1{margin-top:.5rem;font-size:1rem;line-height:1.35}
.qb-keyboard fieldset{margin-top:.5rem}
.qb-keyboard [data-question-navigation]{gap:.25rem;padding-top:.25rem}
.qb-keyboard [data-question-content] [data-profile-question]{padding:.5rem}
.qb-keyboard [data-question-content] [data-profile-question] label{font-size:.8125rem}
.qb-keyboard [data-question-content] .rounded-full{padding:.25rem .55rem;font-size:.6875rem}
.qb-keyboard [data-question-content] p{line-height:1.4}
@media (max-width:380px){.qb-keyboard{padding:.375rem!important}.qb-keyboard [data-question-content] input:not([type=checkbox]):not([type=radio]):not([type=hidden]){padding-inline:.625rem!important}.qb-keyboard [data-question-navigation] button{padding-inline:.4rem;font-size:10px}}

@media (prefers-reduced-motion:reduce){.qb-in,.qb-pop,.qb-float,.qb-shake,.qb-pulse{animation:none!important}.qb-confetti{display:none}}
`;

type KeyboardViewport = {
  top: number;
  left: number;
  width: number;
  height: number;
};

/** Mobile keyboards can shrink the visual viewport without resizing the page. */
function useQuestionKeyboardViewport(
  root: RefObject<HTMLDivElement | null>,
  active: boolean,
) {
  const [viewport, setViewport] = useState<KeyboardViewport | null>(null);
  const baseline = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const visual = window.visualViewport;
    let frame = 0;
    let keyboardOpen = false;
    const update = () => {
      const height = visual?.height ?? window.innerHeight;
      const layoutHeight = Math.max(
        window.innerHeight,
        document.documentElement.clientHeight,
      );
      // Reset on rotation; retain the full height when a browser resizes both viewports.
      if (baseline.current.width !== window.innerWidth) {
        baseline.current = { width: window.innerWidth, height: layoutHeight };
      }
      baseline.current.height = Math.max(
        baseline.current.height,
        layoutHeight,
        height,
      );
      const focused = document.activeElement;
      const editing =
        focused instanceof HTMLElement &&
        root.current?.contains(focused) &&
        focused.matches(
          'input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]',
        );
      // Normalize pinch zoom so it does not look like keyboard occlusion.
      keyboardOpen =
        active &&
        window.innerWidth < 1024 &&
        baseline.current.height - height * (visual?.scale ?? 1) > 120 &&
        (!!editing || keyboardOpen);
      const next = keyboardOpen
        ? {
            top: visual?.offsetTop ?? 0,
            left: visual?.offsetLeft ?? 0,
            width: visual?.width ?? window.innerWidth,
            height,
          }
        : null;
      setViewport((previous) =>
        previous?.top === next?.top &&
        previous?.left === next?.left &&
        previous?.width === next?.width &&
        previous?.height === next?.height
          ? previous
          : next,
      );
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };
    update();
    visual?.addEventListener("resize", schedule);
    visual?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      visual?.removeEventListener("resize", schedule);
      visual?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
    };
  }, [active, root]);

  return active ? viewport : null;
}

/** Consume one browser Back to dismiss the keyboard, preserving Next's router state. */
function useKeyboardBackGuard(
  root: RefObject<HTMLDivElement | null>,
  open: boolean,
) {
  const entry = useRef<{ token: string; url: string } | null>(null);
  const releaseTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!open) return;
    window.clearTimeout(releaseTimer.current);
    const key = "niqahaProfileKeyboard";
    const url = window.location.href;
    let guard = entry.current;
    if (
      !guard ||
      guard.url !== url ||
      window.history.state?.[key] !== guard.token
    ) {
      guard = { token: `${Date.now()}-${Math.random()}`, url };
      window.history.pushState(
        { ...window.history.state, [key]: guard.token },
        "",
        url,
      );
      entry.current = guard;
    }
    const current = guard;
    let consumed = false;
    const dismiss = () => {
      if (
        window.location.href !== url ||
        window.history.state?.[key] === current.token
      )
        return;
      consumed = true;
      entry.current = null;
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && root.current?.contains(focused))
        focused.blur();
    };
    window.addEventListener("popstate", dismiss);
    return () => {
      window.removeEventListener("popstate", dismiss);
      // Native keyboard dismissal may emit resize before popstate. Let that Back
      // settle before removing an unused entry, avoiding a second page traversal.
      if (!consumed)
        releaseTimer.current = window.setTimeout(() => {
          if (
            window.location.href === url &&
            window.history.state?.[key] === current.token
          ) {
            entry.current = null;
            window.history.back();
          }
        }, 100);
    };
  }, [open, root]);
}

function questionFlow(
  schema: ProfileQuestionSchema,
  profile: Record<string, any>,
) {
  return (
    schema.questions
      .filter(
        (q) =>
          q.path !== "age" &&
          !q.locked &&
          questionApplies(q, profile.gender) &&
          locationQuestionVisible(q, profile),
      )
      // Sort by configured priority, before deriving conditional required flags.
      .sort(
        (a, b) =>
          a.section - b.section ||
          (a.path === "gender" ? -1 : b.path === "gender" ? 1 : 0) ||
          Number(b.required) - Number(a.required) ||
          a.order - b.order,
      )
      .map((q) => ({
        ...q,
        question: locationQuestionLabel(q),
        required: q.required && locationQuestionApplies(q, profile),
      }))
  );
}

/** Same rules the server uses to count a question as answered. */
function isAnswered(q: ProfileQuestion, value: unknown) {
  if (q.path === "dateOfBirth")
    return ageFromBirthDate(value as string) !== undefined;
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "string" && !value.trim()) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (q.type === "checkbox")
    return q.required ? value === true : typeof value === "boolean";
  if (q.type === "number")
    return Number(value) !== 0 && Number.isFinite(Number(value));
  if (q.type === "date") return questionAnswerFitsInput(value, q);
  return true;
}

function Confetti() {
  const colors = ["#db2777", "#f59e0b", "#10b981", "#6366f1", "#f43f5e"];
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {Array.from({ length: 30 }, (_, i) => (
        <span
          key={i}
          className="qb-confetti absolute top-0 block h-2.5 w-1.5 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 8) * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}

function Ring({ value, size = 112 }: { value: number; size?: number }) {
  const r = size / 2 - 9,
    c = 2 * Math.PI * r;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${value}% সম্পূর্ণ`}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth="9"
          className="stroke-pink-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          className="stroke-pink-600 transition-all duration-700"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-gray-900">
          {bn(value)}%
        </span>
        <span className="text-[11px] text-gray-500">সম্পূর্ণ</span>
      </span>
    </div>
  );
}

/** Big, tappable answer controls (one question per screen). */
function BigAnswer({
  q,
  value,
  options,
  onChange,
  onPicked,
  onEnter,
}: {
  q: ProfileQuestion;
  value: unknown;
  options: { label: string; value: string }[];
  onChange: (next: Answer) => void;
  onPicked: () => void;
  onEnter: () => void;
}) {
  const [filter, setFilter] = useState("");
  const [editingOptions, setEditingOptions] = useState(false);
  // Saved profile data may arrive after mount. Derive the collapsed state from
  // the live value so an existing answer never opens a long picker by default.
  const hasAnswer = value !== undefined && value !== null && value !== "";
  const showOptions = !hasAnswer || editingOptions;
  const raw =
    value === undefined ||
    value === null ||
    (["number", "date"].includes(q.type) &&
      !questionAnswerFitsInput(value, q, options))
      ? ""
      : value;
  const chip = (active: boolean) =>
    `flex w-full items-center justify-between gap-3 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 sm:rounded-2xl sm:px-4 sm:py-3.5 sm:text-[15px] ${
      active
        ? "border-pink-600 bg-pink-600 text-white shadow-sm"
        : "border-gray-200 bg-white text-gray-800 hover:border-pink-300 hover:bg-pink-50"
    }`;
  const big =
    "w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-3 text-base text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-pink-500 sm:rounded-2xl sm:px-4 sm:py-4 sm:text-lg";

  if (q.path === "dateOfBirth")
    return (
      <BirthDateSelect
        id="member-birth-date"
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
        required={q.required}
        large
      />
    );

  if (["phoneNumber", "guardianPhone", "whatsapp"].includes(q.path || ""))
    return (
      <PhoneNumberInput
        id="qb-phone-answer"
        value={String(value || "")}
        onChange={onChange}
        required={q.required}
        placeholder="মোবাইল নম্বর লিখুন"
      />
    );

  if (q.path === "address.area") {
    const term = String(raw ?? "").trim();
    const normalize = (text: string) =>
      text.normalize("NFKC").toLocaleLowerCase().trim();
    const needle = normalize(term);
    const matches = needle
      ? options
          .filter(
            (option) =>
              normalize(option.label).includes(needle) ||
              normalize(option.value).includes(needle),
          )
          .slice(0, 8)
      : [];
    const exact = needle
      ? options.find(
          (option) =>
            normalize(option.value) === needle ||
            normalize(option.label) === needle,
        )
      : undefined;
    const updateArea = (next: string) => {
      const key = normalize(next);
      const match = options.find(
        (option) =>
          normalize(option.value) === key || normalize(option.label) === key,
      );
      onChange(match?.value ?? next);
    };
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor="qb-area-answer"
            className="block text-sm font-semibold text-gray-700"
          >
            আপনার এলাকার নাম
          </label>
          <input
            autoFocus
            id="qb-area-answer"
            dir="auto"
            type="text"
            maxLength={120}
            value={String(raw ?? "")}
            onChange={(event) => updateArea(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onEnter();
              }
            }}
            placeholder="যেমন: গুলশান, মিরপুর, সাভার..."
            className={`${big} text-base`}
          />
        </div>
        {term ? (
          <div className="rounded-2xl border border-emerald-200 bg-white p-3">
            {exact ? (
              <p className="text-sm font-semibold text-emerald-700">
                ✓ এই এলাকা তালিকায় আছে
              </p>
            ) : matches.length ? (
              <p className="text-sm font-semibold text-gray-600">
                কাছাকাছি নাম পাওয়া গেছে। চাইলে বেছে নিন; না হলে নিজের লেখা নামই
                থাকবে।
              </p>
            ) : (
              <p className="text-sm font-semibold text-emerald-700">
                তালিকায় নেই। আপনার লেখা নামেই সংরক্ষণ হবে।
              </p>
            )}
            {matches.length > 0 && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {matches.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={
                      normalize(String(raw ?? "")) === normalize(option.value)
                    }
                    className={chip(
                      normalize(String(raw ?? "")) === normalize(option.value),
                    )}
                    onClick={() => {
                      onChange(option.value);
                      onPicked();
                    }}
                  >
                    <span>{option.label}</span>
                    {normalize(String(raw ?? "")) ===
                      normalize(option.value) && (
                      <Check className="h-5 w-5 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm leading-6 text-gray-600">
            আপনার এলাকার নাম লিখুন। তালিকায় মিল পেলে বেছে নিন; না থাকলে নিজের
            এলাকার নাম লিখেই এগিয়ে যান।
          </p>
        )}
      </div>
    );
  }

  if (q.type === "checkbox")
    return (
      <div className="grid grid-cols-2 gap-3">
        {[
          { v: true, label: "হ্যাঁ" },
          { v: false, label: "না" },
        ].map((item) => (
          <button
            key={String(item.v)}
            type="button"
            aria-pressed={raw === item.v}
            onClick={() => {
              onChange(item.v);
              if (item.v) onPicked();
            }}
            className={chip(raw === item.v)}
          >
            <span className="text-base sm:text-lg">{item.label}</span>
            {raw === item.v && <Check className="h-5 w-5" />}
          </button>
        ))}
      </div>
    );

  if (q.type === "multi_checkbox") {
    const chosen = savedMultiValues(raw);
    const choices = questionOptionsWithSavedAnswer(q, options, value);
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-500">যতগুলো প্রযোজ্য, সব বেছে নিন</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {choices.map((option) => {
            const on = chosen.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={on}
                className={chip(on)}
                onClick={() =>
                  onChange(
                    on
                      ? chosen.filter((v) => v !== option.value)
                      : [...chosen, option.value],
                  )
                }
              >
                <span>{option.label}</span>
                {on && <Check className="h-5 w-5 shrink-0" />}
              </button>
            );
          })}
        </div>
        {!choices.length && (
          <p className="text-sm text-amber-700">
            এই প্রশ্নের কোনো উত্তর এখনো যোগ করা হয়নি।
          </p>
        )}
      </div>
    );
  }

  if ((q.type === "select" || q.type === "dropdown") && options.length) {
    const current = String(raw);
    const savedOther =
      current && !options.some((option) => option.value === current);
    if (options.length <= 12)
      return (
        <div
          className={`grid gap-2 ${options.length > 4 ? "sm:grid-cols-2" : ""}`}
        >
          {savedOther && (
            <button type="button" aria-pressed className={chip(true)}>
              <span>{current}</span>
              <Check className="h-5 w-5" />
            </button>
          )}
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={current === option.value}
              className={chip(current === option.value)}
              onClick={() => {
                onChange(option.value);
                onPicked();
              }}
            >
              <span>{option.label}</span>
              {current === option.value && (
                <Check className="h-5 w-5 shrink-0" />
              )}
            </button>
          ))}
        </div>
      );
    const selectedOption = options.find((option) => option.value === current);
    const selectedLabel = selectedOption?.label || current;
    const isCountry =
      q.optionSource === "countries" ||
      q.path === "residenceCountry" ||
      q.path === "nationality";
    const normalize = (text: string) =>
      text.normalize("NFKC").toLocaleLowerCase().trim();
    const term = normalize(filter);
    const matches = term
      ? options.filter(
          (option) =>
            normalize(option.label).includes(term) ||
            normalize(option.value).includes(term),
        )
      : [];
    const shown = matches.slice(0, 12);
    const selectedCountry = isCountry
      ? countryCatalog.find((country) => country.en === current)
      : undefined;
    const flag = selectedCountry?.code
      ? [...selectedCountry.code.toUpperCase()]
          .map((char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
          .join("")
      : "";
    const bangladesh = isCountry
      ? options.find((option) => option.value === "Bangladesh")
      : undefined;

    if (current && !showOptions)
      return (
        <div className="space-y-3">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
              {flag || <Check className="h-5 w-5 text-emerald-600" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-500">
                {isCountry ? "নির্বাচিত দেশ" : "নির্বাচিত উত্তর"}
              </p>
              <p className="mt-0.5 break-words text-base font-bold text-gray-900">
                {isCountry && current === "Bangladesh"
                  ? "বাংলাদেশ · Bangladesh"
                  : selectedLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilter("");
              setEditingOptions(true);
            }}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-pink-700 transition-colors hover:border-pink-300 hover:bg-pink-50"
          >
            <Pencil className="h-4 w-4" />{" "}
            {isCountry ? "অন্য দেশ বেছে নিন" : "উত্তর পরিবর্তন করুন"}
          </button>
        </div>
      );

    return (
      <div className="space-y-3">
        {!current && isCountry && bangladesh && (
          <button
            type="button"
            className={chip(false)}
            onClick={() => {
              onChange(bangladesh.value);
              setEditingOptions(false);
              onPicked();
            }}
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">🇧🇩</span>বাংলাদেশ · Bangladesh
            </span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>
        )}
        <label className="relative block">
          <span className="sr-only">{isCountry ? "দেশ খুঁজুন" : "উত্তর খুঁজুন"}</span>
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            autoFocus
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={
              isCountry ? "দেশের নাম লিখে খুঁজুন..." : "নাম লিখে খুঁজুন..."
            }
            className={`${big} pl-12 text-base`}
          />
        </label>
        {current && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm">
            <span className="text-gray-600">
              এখন নির্বাচিত:{" "}
              <strong className="text-gray-900">{selectedLabel}</strong>
            </span>
            <button
              type="button"
              onClick={() => setEditingOptions(false)}
              className="font-semibold text-pink-700 hover:underline"
            >
              এটাই রাখুন
            </button>
          </div>
        )}
        {!term && (
          <p className="text-sm leading-6 text-gray-500">
            {isCountry
              ? "বাংলাদেশে থাকলে উপরের অপশনটি বেছে নিন। অন্য দেশ হলে নাম লিখে খুঁজুন।"
              : "নাম লিখলেই মিল থাকা উত্তরগুলো দেখাবে।"}
          </p>
        )}
        {term && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {shown.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  aria-pressed={current === option.value}
                  className={chip(current === option.value)}
                  onClick={() => {
                    onChange(option.value);
                    setEditingOptions(false);
                    onPicked();
                  }}
                >
                  <span>{option.label}</span>
                  {current === option.value && (
                    <Check className="h-5 w-5 shrink-0" />
                  )}
                </button>
              </li>
            ))}
            {!shown.length && (
              <li className="rounded-xl bg-gray-50 px-3 py-5 text-center text-sm text-gray-500">
                “{filter}” মেলেনি। বানান ঠিক করে আবার খুঁজুন।
              </li>
            )}
            {matches.length > shown.length && (
              <li className="px-2 py-2 text-xs text-gray-500 sm:col-span-2">
                আরও ফলাফল আছে। আরও নির্দিষ্ট করে লিখুন।
              </li>
            )}
          </ul>
        )}
      </div>
    );
  }

  if (q.type === "textarea")
    return (
      <div>
        <textarea
          autoFocus
          aria-labelledby="qb-question"
          dir="auto"
          rows={5}
          maxLength={5000}
          value={String(raw)}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter")
              onEnter();
          }}
          placeholder="নিজের ভাষায় লিখুন..."
          className={`${big} resize-y text-base leading-7`}
        />
        <p className="mt-1 text-right text-xs text-gray-400">
          {bn(String(raw).length)}/৫০০০
        </p>
      </div>
    );

  return (
    <input
      autoFocus
      aria-labelledby="qb-question"
      dir="auto"
      {...questionInputAttributes(q)}
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
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onEnter();
        }
      }}
      placeholder={q.type === "number" ? "সংখ্যা লিখুন" : "আপনার উত্তর লিখুন..."}
      className={`${big} ${q.type === "number" ? "text-center text-3xl font-bold" : ""}`}
    />
  );
}

export default function ProfileUpdateForm() {
  const router = useRouter();
  const formData = useProfileStore((state) => state.formData);
  const currentStep = useProfileStore((state) => state.currentStep);
  const setCurrentStep = useProfileStore((state) => state.setCurrentStep);
  const initializeForm = useProfileStore((state) => state.initializeForm);
  const updateField = useProfileStore((state) => state.updateField);
  const updateNestedField = useProfileStore((state) => state.updateNestedField);
  const updateCustomField = useProfileStore((state) => state.updateCustomField);
  const updateDynamicAnswer = useProfileStore(
    (state) => state.updateDynamicAnswer,
  );
  const initialized = useRef(false);
  const saved = useRef<Record<string, unknown>>({});
  const savedStep = useRef(0);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState("");
  const [schema, setSchema] = useState<ProfileQuestionSchema>(defaultQuestions);
  const [schemaReady, setSchemaReady] = useState(false);
  const [schemaUnavailable, setSchemaUnavailable] = useState(false);
  const [schemaAttempt, setSchemaAttempt] = useState(0);
  const [view, setView] = useState<View>("journey");
  const queryClient = useQueryClient();
  const { data: locations } = useQueryWrapper<LocationResponse>(
    ["public-location-options"],
    "/profile-questions/locations",
    { staleTime: 60000 },
  );
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const passedQuestions = useRef(new Set<string>());
  const [streak, setStreak] = useState(0);
  const [cheer, setCheer] = useState<{ text: string; n: number } | null>(null);
  const [shake, setShake] = useState(0);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const advancePending = useRef(false);
  const autoAdvanceTimer = useRef<number | null>(null);
  const nextRef = useRef<(skipped?: boolean) => void>(() => {});

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/profile-questions", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((r) => {
        // A cached fallback cannot be treated as the current Admin-required schema.
        if (!r.ok || r.headers.get("X-Profile-Schema-Fallback") === "true")
          throw Error("Live Question Builder configuration unavailable");
        return r.json();
      })
      .then((next: ProfileQuestionSchema) => {
        if (!Array.isArray(next?.questions))
          throw Error("Invalid Question Builder configuration");
        if (!controller.signal.aborted) {
          setSchema(next);
          setSchemaUnavailable(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setSchemaUnavailable(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSchemaReady(true);
      });
    return () => controller.abort();
  }, [schemaAttempt]);

  const {
    data,
    isLoading,
    isError: profileLoadError,
    refetch: reloadProfile,
  } = useQueryWrapper(["get-my-profile"], "/user/get-my-profile");
  const { mutate, isPending } = useCommonMutationApi({
    method: "PATCH",
    url: "/user/update-user",
    mutationKey: ["update-user"],
    successMessage: "আলহামদুলিল্লাহ! আপনার বায়োডাটা জমা হয়েছে।",
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["get-my-profile-for-success"],
      });
      void queryClient.invalidateQueries({ queryKey: ["platform-summary"] });
      router.push("/profile");
    },
  });
  useEffect(() => {
    if (data && !initialized.current) {
      initializeForm(data);
      saved.current = JSON.parse(
        JSON.stringify(useProfileStore.getState().getFormData()),
      ) as Record<string, unknown>;
      const step = Math.max(
        0,
        Math.min(9, Number((data as { draftStep?: number }).draftStep) || 0),
      );
      savedStep.current = step;
      setCurrentStep(step);
      // Keep the gamified journey map as the default even for published biodata.
      // Members can still open their saved answers from the journey map.
      initialized.current = true;
    }
  }, [data, initializeForm, setCurrentStep]);

  const saveDraft = async () => {
    if (!initialized.current) return;
    // Re-read the current form AFTER any older request finishes; never save an
    // obsolete snapshot over a newer answer.
    const snapshot = useProfileStore.getState().getFormData();
    const step = useProfileStore.getState().currentStep;
    const changes = diffBiodataDraft(
      saved.current,
      snapshot as Record<string, unknown>,
    );
    if (!hasBiodataChanges(changes) && step === savedStep.current) {
      setSaveState("saved");
      return;
    }
    setSaveState("saving");
    setSaveError("");
    try {
      const errors = newQuestionRuleErrors(
        snapshot as Record<string, unknown>,
        schema.questions,
        saved.current,
      );
      if (errors.length) throw new Error(errors[0].message);
      const [result, error] = await PatchRequestAxios<{
        message: string;
        data: Record<string, unknown>;
        completion: {
          percentage: number;
          requiredCount: number;
          answeredCount: number;
          remaining: string[];
          nextStep: number;
          schemaRevision: number;
        };
        biodataStage: string;
      }>("/user/update-user", { ...changes, draftStep: step });
      if (!result?.data)
        throw new Error(error?.message || "সার্ভারে সেভ নিশ্চিত করা যায়নি।");
      saved.current = applyBiodataDraft(saved.current, changes);
      savedStep.current = step;
      // The saved profile receives the exact server-calculated completion,
      // matching Admin Member Management (not a stale local estimate).
      queryClient.setQueryData(
        ["get-my-profile"],
        (previous: Record<string, unknown> | undefined) => ({
          ...(previous || {}),
          ...result.data,
          completion: result.completion,
          biodataStage: result.biodataStage,
        }),
      );
      void queryClient.invalidateQueries({
        queryKey: ["get-my-profile-for-success"],
      });
      void queryClient.invalidateQueries({ queryKey: ["platform-summary"] });
      const latest = useProfileStore.getState();
      const remaining = diffBiodataDraft(
        saved.current,
        latest.getFormData() as Record<string, unknown>,
      );
      if (
        !hasBiodataChanges(remaining) &&
        latest.currentStep === savedStep.current
      )
        setSaveState("saved");
      else setSaveState("saving");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "সার্ভারে সেভ করা যায়নি।";
      setSaveError(message);
      setSaveState("error");
      throw error;
    }
  };
  const queueSave = () => {
    saveChain.current = saveChain.current
      .catch(() => {})
      .then(() => saveDraft());
    return saveChain.current;
  };
  // Debounce typing. All writes use the same queue; manual retry and level
  // completion cannot race or overwrite each other.
  useEffect(() => {
    if (!initialized.current) return;
    if (
      !hasBiodataChanges(
        diffBiodataDraft(saved.current, formData as Record<string, unknown>),
      ) &&
      currentStep === savedStep.current
    )
      return;
    const timer = window.setTimeout(() => {
      void queueSave().catch(() => {});
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [formData, currentStep]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const retry = () => {
      if (initialized.current) void queueSave().catch(() => {});
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Warn before an accidental reload/close if any answer still awaits a
  // confirmed server save. No private biodata is written to localStorage.
  useEffect(() => {
    const warnIfUnsaved = (event: BeforeUnloadEvent) => {
      if (!initialized.current) return;
      const store = useProfileStore.getState();
      const changes = diffBiodataDraft(
        saved.current,
        store.getFormData() as Record<string, unknown>,
      );
      if (
        !hasBiodataChanges(changes) &&
        store.currentStep === savedStep.current
      )
        return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnIfUnsaved);
    return () => window.removeEventListener("beforeunload", warnIfUnsaved);
  }, []);

  const gender = formData.gender as string | undefined;
  const flow = useMemo(
    () => questionFlow(schema, formData),
    [schema, formData],
  );
  const levels = useMemo(
    () =>
      schema.sections
        .map((section) => ({
          section,
          questions: flow.filter((q) => q.section === section.id),
        }))
        .filter((level) => level.questions.length),
    [schema.sections, flow],
  );
  useEffect(() => {
    if (
      levels.length &&
      !levels.some((level) => level.section.id === currentStep)
    )
      setCurrentStep(levels[0].section.id);
  }, [levels, currentStep, setCurrentStep]);

  const answered = (q: ProfileQuestion, profile = formData) =>
    isAnswered(q, readQuestionAnswer(profile, q));
  const levelIndex = Math.max(
    0,
    levels.findIndex((level) => level.section.id === currentStep),
  );
  const level = levels[levelIndex];
  const levelQuestions = level?.questions ?? [];
  // Revealing Area after a location choice must not move the active question.
  const qi = Math.max(
    0,
    levelQuestions.findIndex((q) => q.id === activeQuestionId),
  );
  const setQi = (index: number) =>
    setActiveQuestionId(levelQuestions[index]?.id ?? null);
  const question =
    levelQuestions[Math.min(qi, Math.max(0, levelQuestions.length - 1))];
  const questionRoot = useRef<HTMLDivElement>(null);
  const questionContent = useRef<HTMLDivElement>(null);
  const keyboardViewport = useQuestionKeyboardViewport(
    questionRoot,
    view === "play" && !!question,
  );
  useKeyboardBackGuard(questionRoot, !!keyboardViewport);

  useEffect(() => {
    if (!keyboardViewport) return;
    let frame = 0;
    const root = questionRoot.current;
    const revealInput = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const content = questionContent.current;
        const focused = document.activeElement;
        if (
          !content ||
          !(focused instanceof HTMLElement) ||
          !content.contains(focused)
        )
          return;
        const bounds = focused.getBoundingClientRect();
        const visible = content.getBoundingClientRect();
        // Scroll only the answer area, leaving both navigation controls in place.
        if (
          bounds.top < visible.top + 12 ||
          bounds.height > visible.height - 24
        ) {
          content.scrollTop += bounds.top - visible.top - 12;
        } else if (bounds.bottom > visible.bottom - 12) {
          content.scrollTop += bounds.bottom - visible.bottom + 12;
        }
      });
    };
    revealInput();
    root?.addEventListener("focusin", revealInput);
    return () => {
      window.cancelAnimationFrame(frame);
      root?.removeEventListener("focusin", revealInput);
    };
  }, [keyboardViewport, question?.id, shake]);

  const answeredCount = flow.filter((q) => answered(q)).length;
  // Mirrors the live Dynamic Question Builder rules in backend profile-rules.ts.
  // Includes locked required fields and counts optional fields as optional.
  const requiredProgress = useMemo(
    () => previewBiodataCompletion(formData as Record<string, any>, schema),
    [formData, schema],
  );
  const percent = requiredProgress.percentage;
  const levelComplete = (l: { questions: ProfileQuestion[] }) =>
    l.questions.some((q) => answered(q)) &&
    l.questions.every((q) => !q.required || answered(q));
  const completedLevels = levels.filter(levelComplete).length;
  const connectionBalance = (
    data as { numberOfConnections?: number } | undefined
  )?.numberOfConnections;
  const requiredMissing = requiredProgress.remaining;
  const ruleErrors = questionRuleErrors(formData, schema.questions);
  const currentRuleError = ruleErrors.find(
    (error) =>
      error.questionId === question?.id ||
      error.otherQuestionId === question?.id,
  )?.message;
  const nextDisabled =
    isAdvancing ||
    !!currentRuleError ||
    (!!question?.required && !answered(question));
  const name =
    typeof formData.name === "string" ? formData.name.split(" ")[0] : "";

  useEffect(() => {
    if (!cheer) return;
    const timer = window.setTimeout(() => setCheer(null), 1300);
    return () => window.clearTimeout(timer);
  }, [cheer]);

  const optionsFor = (q: ProfileQuestion) =>
    profileQuestionOptions(q, gender, formData, locations?.entries);
  const displayAnswer = (q: ProfileQuestion) => {
    const value = readQuestionAnswer(formData, q);
    if (!isAnswered(q, value)) return "";
    if (q.type === "date") return questionDisplayValue(value, q);
    const options = optionsFor(q);
    if (Array.isArray(value))
      return value
        .map(
          (item) =>
            options.find((option) => option.value === item)?.label ||
            String(item),
        )
        .join(", ");
    if (typeof value === "boolean") return value ? "হ্যাঁ" : "না";
    return (
      options.find((option) => option.value === String(value))?.label ||
      String(value)
    );
  };
  const setAnswer = (q: ProfileQuestion, answer: Answer) => {
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
    const answerChanged =
      readQuestionAnswer(useProfileStore.getState().formData, q) !== answer;
    if (
      answerChanged &&
      [
        "address.district",
        "address.upazila",
        "address.cityCorporation",
      ].includes(q.path)
    ) {
      const dependents =
        q.path === "address.district"
          ? ["address.upazila", "address.cityCorporation", "address.area"]
          : ["address.area"];
      for (const dependent of schema.questions) {
        if (dependents.includes(dependent.path || ""))
          passedQuestions.current.delete(dependent.id);
      }
    }
    const normalized =
      typeof answer === "string" && NUMERIC_PATHS.includes(q.path)
        ? answer === ""
          ? undefined
          : Number(answer)
        : answer;
    const [parent, field] = q.path.split(".");
    if (field) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateNestedField(parent as any, field, normalized);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (q.path === "address.district" && answerChanged) {
        updateNestedField("address" as any, "upazila", "");
        updateNestedField("address" as any, "cityCorporation", "");
        updateNestedField("address" as any, "area", "");
      }
      if (q.path === "address.cityCorporation" && answerChanged) {
        if (answer) updateNestedField("address" as any, "upazila", "");
        if (answer || formData.address?.cityCorporation)
          updateNestedField("address" as any, "area", "");
      }
      if (q.path === "address.upazila" && answerChanged) {
        if (answer) updateNestedField("address" as any, "cityCorporation", "");
        if (answer || formData.address?.upazila)
          updateNestedField("address" as any, "area", "");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } else updateField(q.path as any, normalized as any);
  };

  const goLevel = (index: number, startAt?: number) => {
    const target = levels[index];
    if (!target) return;
    passedQuestions.current.clear();
    setCurrentStep(target.section.id);
    const firstOpen = target.questions.findIndex(
      (q) => locationQuestionApplies(q, formData) && !answered(q),
    );
    setActiveQuestionId(
      target.questions[startAt ?? (firstOpen >= 0 ? firstOpen : 0)]?.id ?? null,
    );
    setView("play");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const continueJourney = () => {
    const requiredLevel = levels.findIndex((l) =>
      l.questions.some((q) => q.required && !answered(q)),
    );
    const openLevel =
      requiredLevel >= 0
        ? requiredLevel
        : levels.findIndex((l) =>
            l.questions.some(
              (q) => locationQuestionApplies(q, formData) && !answered(q),
            ),
          );
    if (openLevel >= 0) goLevel(openLevel);
    else setView("finish");
  };
  const next = async (skipped = false) => {
    if (!question || view !== "play" || advancePending.current) return;
    if (autoAdvanceTimer.current !== null) {
      window.clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    const fresh = useProfileStore.getState().formData;
    const error = newQuestionRuleErrors(
      fresh,
      schema.questions,
      saved.current,
    ).find(
      (row) =>
        row.questionId === question.id || row.otherQuestionId === question.id,
    );
    if (error) {
      setShake((n) => n + 1);
      toast.error(error.message);
      return;
    }
    const isDone = answered(question, fresh);
    if (!skipped && question.required && !isDone) {
      setShake((n) => n + 1);
      toast.error("এই প্রশ্নের উত্তর দেওয়া আবশ্যিক");
      return;
    }
    advancePending.current = true;
    setIsAdvancing(true);
    try {
      // Flush debounced edits through the same queue before leaving this answer.
      await queueSave();
      if (skipped || !isDone) setStreak(0);
      else {
        setStreak((s) => s + 1);
        setCheer({
          text: CHEERS[Math.floor(Math.random() * CHEERS.length)],
          n: Date.now(),
        });
      }
      // Answers can reveal location questions or change required flags while the
      // save is pending. Resolve the next ID from the latest profile, never qi.
      const latest = useProfileStore.getState().formData;
      const latestFlow = questionFlow(schema, latest);
      const currentIndex = latestFlow.findIndex((q) => q.id === question.id);
      passedQuestions.current.add(question.id);
      const available = (q: ProfileQuestion) =>
        !passedQuestions.current.has(q.id) &&
        locationQuestionApplies(q, latest) &&
        !answered(q, latest);
      // Newly revealed fields (e.g. Area) may sort before the current question.
      // Visit those once; never loop back to an answer already given or skipped.
      const sameSection = latestFlow.filter(
        (q) => q.section === question.section,
      );
      const sectionIndex = sameSection.findIndex((q) => q.id === question.id);
      const following =
        currentIndex < 0
          ? undefined
          : sameSection.slice(sectionIndex + 1).find(available) ||
            sameSection.slice(0, sectionIndex).find(available) ||
            latestFlow
              .slice(currentIndex + 1)
              .find((q) => q.section !== question.section && available(q));
      if (following) {
        setCurrentStep(following.section);
        setActiveQuestionId(following.id);
      } else setView("finish");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // Keep this question and its draft visible so the member can retry.
    } finally {
      advancePending.current = false;
      setIsAdvancing(false);
    }
  };
  useEffect(() => {
    nextRef.current = next;
  });
  useEffect(
    () => () => {
      if (autoAdvanceTimer.current !== null)
        window.clearTimeout(autoAdvanceTimer.current);
    },
    [question?.id, view],
  );
  const autoAdvance = () => {
    if (autoAdvanceTimer.current !== null)
      window.clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = window.setTimeout(() => {
      autoAdvanceTimer.current = null;
      nextRef.current(false);
    }, 350);
  };
  const submit = async () => {
    const errors = questionRuleErrors(
      useProfileStore.getState().formData,
      schema.questions,
    );
    if (errors.length) {
      toast.error(errors[0].message);
      return;
    }
    const stage = currentBiodataStage(data as BiodataStatusSource);
    if (
      stage === "deleted" ||
      stage === "under_review" ||
      stage === "published"
    ) {
      toast.info(
        "বায়োডাটা ইতোমধ্যে জমা হয়েছে। এখন তথ্য Edit/Update করতে পারবেন।",
      );
      return;
    }
    if (requiredMissing.length) {
      setView("finish");
      toast.error("কয়েকটি আবশ্যিক প্রশ্ন বাকি আছে");
      return;
    }
    try {
      await queueSave();
    } catch {
      toast.error("উত্তর সংরক্ষণ করা যায়নি। নিচে ‘আবার চেষ্টা করুন’ চাপ দিন।");
      return;
    }
    // The backend validates the already-saved full profile; do not resend
    // credentials, identity metadata, or older answers at submission time.
    mutate({ submit: true, draftStep: useProfileStore.getState().currentStep });
  };

  const saveBadge = (
    <span
      className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600"
      aria-live="polite"
    >
      {saveState === "saving" ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> সংরক্ষণ হচ্ছে…
        </>
      ) : saveState === "error" ? (
        <>
          <span
            role="alert"
            className="inline-flex items-center gap-1 font-semibold text-red-600"
          >
            <AlertCircle className="h-3.5 w-3.5" /> সংরক্ষণ ব্যর্থ
          </span>
          <button
            type="button"
            onClick={() => {
              void queueSave().catch(() => {});
            }}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-pink-200 bg-white px-2.5 py-1 font-semibold text-pink-700 hover:bg-pink-50 focus-visible:outline-2 focus-visible:outline-pink-600"
          >
            <RefreshCw className="h-3.5 w-3.5" /> আবার চেষ্টা করুন
          </button>
          {saveError && (
            <span
              className="w-full break-words text-[11px] leading-5 text-red-600"
              title={saveError}
            >
              {saveError}
            </span>
          )}
        </>
      ) : saveState === "saved" ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600" /> সংরক্ষিত
        </>
      ) : null}
    </span>
  );
  const shell = (children: ReactNode) => (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-[#fff7f9] px-3 py-4 sm:px-4 sm:py-8">
      <style>{CSS}</style>
      {children}
    </div>
  );

  if (isLoading || !schemaReady || (!!data && !initialized.current))
    return shell(
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-gray-600">
        <Loader2 className="h-9 w-9 animate-spin text-pink-600" /> আপনার
        বায়োডাটা খোলা হচ্ছে...
      </div>,
    );
  if (profileLoadError || (!data && !isLoading))
    return shell(
      <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="size-10 text-red-500" />
        <h1 className="text-xl font-bold text-gray-900">বায়োডাটা খোলা যায়নি</h1>
        <p className="text-sm leading-6 text-gray-600">
          সার্ভার থেকে তথ্য আনা যায়নি। আপনার আগের তথ্য মুছে দেওয়া হয়নি।
        </p>
        <button
          type="button"
          onClick={() => {
            void reloadProfile();
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-pink-600 px-5 text-sm font-bold text-white hover:bg-pink-700"
        >
          <RefreshCw className="size-4" /> আবার চেষ্টা করুন
        </button>
      </div>,
    );

  if (schemaUnavailable)
    return shell(
      <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center gap-4 rounded-2xl border border-amber-200 bg-white p-7 text-center">
        <AlertCircle className="size-9 text-amber-600" />
        <h1 className="text-xl font-bold text-gray-900">
          সর্বশেষ Required প্রশ্ন লোড করা যায়নি
        </h1>
        <p className="text-sm leading-6 text-gray-600">
          Admin যে Dynamic Question Builder প্রশ্নগুলো চালু রেখেছেন, সেগুলো ছাড়া সঠিক
          সম্পূর্ণতার হার দেখানো যাবে না। আপনার আগের উত্তর সংরক্ষিত আছে।
        </p>
        <button
          type="button"
          onClick={() => {
            setSchemaReady(false);
            setSchemaAttempt((n) => n + 1);
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-pink-600 px-5 text-sm font-semibold text-white hover:bg-pink-700"
        >
          <RefreshCw className="size-4" /> আবার চেষ্টা করুন
        </button>
      </div>,
    );

  const savedStage = currentBiodataStage(data as BiodataStatusSource);
  const submittedBefore = isSubmittedBiodata(data as BiodataStatusSource);
  if (savedStage === "deleted")
    return shell(
      <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center gap-3 rounded-2xl bg-white p-6 text-center">
        <ShieldCheck className="size-10 text-pink-600" aria-hidden />
        <h1 className="text-xl font-bold text-gray-900">
          বায়োডাটা মুছে ফেলা হয়েছে
        </h1>
        <p className="text-sm leading-6 text-gray-600">
          অ্যাডমিনের অনুমোদনের পর আপনার বায়োডাটা সরানো হয়েছে। অনুরোধের অবস্থা দেখতে
          প্রোফাইলে যান।
        </p>
        <Link
          href="/profile#deletion-request"
          className="rounded-lg bg-pink-600 px-4 py-3 text-sm font-semibold text-white hover:bg-pink-700"
        >
          অনুরোধের অবস্থা দেখুন
        </Link>
      </div>,
    );

  if (view === "play" && question) {
    const value = readQuestionAnswer(formData, question);
    const Icon = LEVEL_ICONS[level.section.id] || Sparkles;
    return shell(
      <div
        ref={questionRoot}
        data-question-viewport
        data-keyboard-open={!!keyboardViewport}
        className={`flex min-h-0 flex-col ${keyboardViewport ? "qb-keyboard fixed z-[70] bg-[#fff7f9] p-2 sm:p-3" : "relative mx-auto max-w-3xl"}`}
        style={
          keyboardViewport
            ? ({
                top: keyboardViewport.top,
                left: keyboardViewport.left,
                width: keyboardViewport.width,
                height: keyboardViewport.height,
                "--qb-visible-height": `${keyboardViewport.height}px`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <div
          data-question-header
          className="flex shrink-0 items-center gap-2 sm:gap-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-600">
              <span className="flex min-w-0 items-center gap-1.5 truncate">
                <Icon className="h-4 w-4 shrink-0 text-pink-600" /> ধাপ{" "}
                {bn(levelIndex + 1)}: {level.section.title}
              </span>
              <span className="shrink-0">
                {bn(Math.min(qi + 1, levelQuestions.length))}/
                {bn(levelQuestions.length)}
              </span>
            </div>
            <div className="mt-1.5 flex gap-1" aria-hidden>
              {levelQuestions.map((q, i) => (
                <span
                  key={q.id}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${i < qi || (i === qi && answered(q)) ? "bg-pink-600" : i === qi ? "bg-pink-300" : answered(q) ? "bg-pink-200" : "bg-gray-200"}`}
                />
              ))}
            </div>
          </div>
        </div>

        {cheer && (
          <div
            key={cheer.n}
            className="qb-float pointer-events-none absolute right-2 top-16 z-10 rounded-full bg-emerald-500 px-3 py-1 text-sm font-bold text-white shadow-lg"
          >
            {cheer.text}
          </div>
        )}

        <div
          ref={questionContent}
          data-question-content
          className={
            keyboardViewport
              ? "min-h-0 flex-1 overflow-y-auto overscroll-contain"
              : undefined
          }
        >
          <div
            key={question.id + ":" + shake}
            className={`qb-in rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl ${keyboardViewport ? "my-1.5 p-2" : "mt-5 p-4 sm:mt-7 sm:p-8"} ${shake ? "qb-shake" : ""}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {question.required ? (
                <span className="rounded-full bg-pink-50 px-3 py-1.5 text-xs font-bold text-pink-700 ring-1 ring-pink-100">
                  আবশ্যিক
                </span>
              ) : (
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                  ঐচ্ছিক · চাইলে পরে দিতে পারবেন
                </span>
              )}
            </div>
            <h1
              id="qb-question"
              dir="auto"
              className={`font-bold leading-snug text-gray-900 ${keyboardViewport ? "mt-1.5 text-base" : "mt-4 text-2xl sm:text-[28px]"}`}
            >
              {question.question}
            </h1>
            {question.path === "residenceCountry" && (
              <p className="mt-2 text-sm leading-6 text-gray-600">
                আপনি বর্তমানে যে দেশে থাকেন, সেটি বেছে নিন।
              </p>
            )}
            {(question.path === "address.upazila" ||
              question.path === "address.cityCorporation") && (
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-sm text-gray-600">
                  উপজেলা অথবা সিটি কর্পোরেশন — যেকোনো একটি নির্বাচন করুন।
                </p>
                {levelQuestions.map(
                  (alternative, index) =>
                    alternative.path ===
                      (question.path === "address.upazila"
                        ? "address.cityCorporation"
                        : "address.upazila") && (
                      <button
                        key={alternative.id}
                        type="button"
                        disabled={isAdvancing}
                        onClick={() => setQi(index)}
                        className="self-start rounded-lg border border-pink-200 px-3 py-2 text-sm font-semibold text-pink-700 hover:bg-pink-50"
                      >
                        {alternative.path === "address.upazila"
                          ? "উপজেলা নির্বাচন করুন"
                          : "সিটি কর্পোরেশন নির্বাচন করুন"}
                      </button>
                    ),
                )}
              </div>
            )}
            <fieldset
              disabled={isAdvancing}
              className={`min-w-0 ${keyboardViewport ? "mt-2" : "mt-6"}`}
              aria-labelledby="qb-question"
              aria-invalid={!!currentRuleError}
              aria-describedby={
                currentRuleError ? "qb-answer-error" : undefined
              }
            >
              <SavedQuestionAnswer
                q={question}
                value={value}
                options={optionsFor(question)}
                onChange={(answer) => setAnswer(question, answer)}
              />
              <BigAnswer
                key={question.id}
                q={question}
                value={value}
                options={optionsFor(question)}
                onChange={(answer) => setAnswer(question, answer)}
                onPicked={autoAdvance}
                onEnter={() => next(false)}
              />
              {currentRuleError && (
                <p
                  id="qb-answer-error"
                  role="alert"
                  className="mt-2 text-sm text-destructive"
                >
                  {currentRuleError}
                </p>
              )}
              {question.required && !answered(question) && (
                <p id="qb-next-help" className="mt-3 text-sm text-gray-500">
                  উত্তর দিলে পরবর্তী প্রশ্নে যেতে পারবেন।
                </p>
              )}
            </fieldset>
          </div>
        </div>

        <div
          data-question-navigation
          className={`z-20 flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-white/95 backdrop-blur ${keyboardViewport ? "pt-1.5" : "sticky bottom-0 mt-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"}`}
          aria-busy={isAdvancing}
        >
          <div
            className={`min-w-0 ${keyboardViewport ? "max-h-8 overflow-hidden text-[11px]" : "text-xs"}`}
          >
            {saveBadge}
          </div>
          <div
            className={`grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 ${keyboardViewport ? "gap-1" : "gap-2 sm:gap-3"}`}
          >
            <button
              type="button"
              data-question-action="back"
              disabled={isAdvancing}
              onClick={() => {
                if (qi > 0) setQi(qi - 1);
                else setView("journey");
              }}
              aria-label="আগের প্রশ্নে ফিরে যান"
              className={`flex min-w-0 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 ${keyboardViewport ? "min-h-9 px-2 text-[11px]" : "min-h-12 px-3 text-xs sm:text-sm"}`}
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">পূর্ববর্তী</span>
            </button>
            <button
              type="button"
              data-question-action="next"
              disabled={nextDisabled}
              aria-describedby={
                question.required && !answered(question)
                  ? "qb-next-help"
                  : undefined
              }
              onClick={() => {
                void next(false);
              }}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-pink-600 px-3 font-bold text-white shadow-md shadow-pink-600/20 transition-colors hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50 ${keyboardViewport ? "min-h-9 px-3 text-[11px]" : "min-h-12 px-4 text-xs sm:min-w-48 sm:text-sm"}`}
            >
              <span className="whitespace-nowrap">
                {isAdvancing
                  ? "সংরক্ষণ হচ্ছে…"
                  : qi < levelQuestions.length - 1
                    ? "পরবর্তী প্রশ্ন"
                    : levelIndex < levels.length - 1
                      ? "পরবর্তী বিভাগে যান"
                      : "শেষ ধাপে যান"}
              </span>
              {!isAdvancing && <ChevronRight className="h-4 w-4 shrink-0" />}
            </button>
            <button
              type="button"
              data-question-action="skip"
              disabled={isAdvancing}
              onClick={() => {
                void next(true);
              }}
              aria-label={
                question.required ? "প্রশ্নটি পরে দিন" : "প্রশ্নটি এড়িয়ে যান"
              }
              className={`flex min-w-0 items-center justify-center gap-1 rounded-xl border-2 border-amber-300 bg-amber-50 font-bold text-amber-900 shadow-sm transition-colors hover:border-amber-400 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${keyboardViewport ? "min-h-9 px-2 text-[11px]" : "min-h-12 px-3 text-xs sm:text-sm"}`}
            >
              <span className="truncate">
                {question.required ? "পরে দেব" : "এড়িয়ে যান"}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>,
    );
  }

  if (view === "levelDone" && level) {
    const Icon = LEVEL_ICONS[level.section.id] || Trophy;
    const done = level.questions.filter((q) => answered(q)).length;
    const nextLevel = levels[levelIndex + 1];
    return shell(
      <div className="relative mx-auto max-w-lg overflow-hidden rounded-3xl bg-white p-6 text-center shadow-[0_10px_30px_rgba(219,39,119,0.1)] sm:p-10">
        <Confetti />
        <div className="qb-pop mx-auto flex size-24 items-center justify-center rounded-full bg-pink-600 text-white shadow-lg shadow-pink-600/30">
          <Icon className="h-11 w-11" />
        </div>
        <p className="mt-5 text-sm font-semibold text-pink-700">
          ধাপ {bn(levelIndex + 1)} সম্পন্ন!
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-gray-900">
          “{level.section.title}” বিভাগ শেষ হয়েছে
        </h1>
        <p className="mt-2 text-gray-600">
          {bn(level.questions.length)}টির মধ্যে {bn(done)}টি প্রশ্নের উত্তর দিয়েছেন।
        </p>
        <div className="mt-6 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-amber-50 p-3">
            <p className="flex items-center justify-center gap-1 text-lg font-extrabold text-amber-600">
              {bn(answeredCount)}
            </p>
            <p className="text-xs text-gray-600">মোট উত্তর</p>
          </div>
          <div className="rounded-2xl bg-pink-50 p-3">
            <p className="text-lg font-extrabold text-pink-700">
              {bn(percent)}%
            </p>
            <p className="text-xs text-gray-600">বায়োডাটা</p>
          </div>
          <div className="rounded-2xl bg-orange-50 p-3">
            <p className="flex items-center justify-center gap-1 text-lg font-extrabold text-orange-600">
              <Flame className="h-4 w-4" />
              {bn(streak)}
            </p>
            <p className="text-xs text-gray-600">টানা উত্তর</p>
          </div>
        </div>
        <div className="mt-6 space-y-2">
          {nextLevel ? (
            <button
              type="button"
              onClick={() => goLevel(levelIndex + 1)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-pink-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-pink-600/20 hover:bg-pink-700"
            >
              পরবর্তী বিভাগ: {nextLevel.section.title}{" "}
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setView("finish")}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-pink-600 px-6 py-3.5 font-bold text-white hover:bg-pink-700"
            >
              <Trophy className="h-5 w-5" /> শেষ ধাপে যান
            </button>
          )}
          <button
            type="button"
            onClick={() => setView("journey")}
            className="w-full rounded-full px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            যাত্রার ম্যাপ দেখুন
          </button>
        </div>
        <div className="mt-3 flex justify-center">{saveBadge}</div>
      </div>,
    );
  }

  if (view === "finish")
    return shell(
      <div className="relative mx-auto max-w-lg overflow-hidden rounded-3xl bg-white p-6 text-center shadow-[0_10px_30px_rgba(219,39,119,0.1)] sm:p-10">
        {!requiredMissing.length && !submittedBefore && <Confetti />}
        <div className="qb-pop mx-auto flex size-24 items-center justify-center rounded-full bg-amber-400 text-white shadow-lg shadow-amber-400/40">
          {requiredMissing.length ? (
            <ListChecks className="h-11 w-11" />
          ) : (
            <PartyPopper className="h-11 w-11" />
          )}
        </div>
        {submittedBefore && savedStage !== "rejected" ? (
          <>
            <h1 className="mt-5 text-2xl font-extrabold text-gray-900">
              আপনার বায়োডাটা ইতোমধ্যে জমা হয়েছে
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              আবার Submit করার প্রয়োজন নেই। পূর্বের তথ্য এডিট করতে পারবেন এবং
              প্রোফাইলে Under Review / Published অবস্থা দেখতে পারবেন।
            </p>
            <Link
              href="/profile"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-pink-600 px-6 text-sm font-bold text-white hover:bg-pink-700"
            >
              আমার প্রোফাইল দেখুন
            </Link>
          </>
        ) : requiredMissing.length ? (
          <>
            <h1 className="mt-5 text-2xl font-extrabold text-gray-900">
              প্রায় শেষ!
            </h1>
            <p className="mt-2 text-gray-600">
              জমা দেওয়ার আগে আর {bn(requiredMissing.length)}টি আবশ্যিক প্রশ্ন বাকি।
            </p>
            <ul className="mt-5 space-y-2 text-left">
              {requiredMissing.slice(0, 8).map((q) => {
                const li = levels.findIndex((l) => l.section.id === q.section);
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() =>
                        goLevel(
                          li,
                          levels[li]?.questions.findIndex(
                            (item) => item.id === q.id,
                          ),
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-2xl border-2 border-gray-100 px-4 py-3 text-left hover:border-pink-300 hover:bg-pink-50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-gray-500">
                          {levels[li]?.section.title}
                        </span>
                        <span className="line-clamp-2 text-sm font-semibold text-gray-900">
                          {q.question}
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-pink-600" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-2xl font-extrabold text-gray-900">
              {savedStage === "rejected"
                ? "সংশোধিত বায়োডাটা আবার জমা দিন"
                : "মাশাআল্লাহ, আপনার বায়োডাটা তৈরি!"}
            </h1>
            <p className="mt-2 text-gray-600">
              {savedStage === "rejected"
                ? "আগের উত্তরগুলো সংরক্ষিত আছে। প্রয়োজনীয় সংশোধন করে পুনরায় জমা দিন।"
                : `${bn(answeredCount)}টি প্রশ্নের উত্তর দিয়েছেন এবং ${bn(completedLevels)}টি বিভাগ সম্পন্ন করেছেন। এবার জমা দিন; যাচাইয়ের পর প্রকাশ করা হবে।`}
            </p>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={isPending}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-pink-600 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-pink-600/25 hover:bg-pink-700 disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}{" "}
              বায়োডাটা জমা দিন
            </button>
          </>
        )}
        <div className="mt-3 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setView("review")}
            className="rounded-full px-6 py-3 text-sm font-semibold text-pink-700 hover:bg-pink-50"
          >
            সব উত্তর একবার দেখে নিন
          </button>
          <button
            type="button"
            onClick={() => setView("journey")}
            className="rounded-full px-6 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            যাত্রার ম্যাপ
          </button>
        </div>
      </div>,
    );

  if (view === "review")
    return shell(
      <div className="mx-auto max-w-3xl space-y-4">
        {submittedBefore && (
          <div className="rounded-2xl border border-pink-200 bg-white p-5 shadow-sm">
            <h1 className="font-bold text-pink-800">
              {savedStage === "published"
                ? "Published · আপনার বায়োডাটা প্রকাশিত"
                : savedStage === "rejected"
                  ? "সংশোধন প্রয়োজন"
                  : "Submitted · Under Review"}
            </h1>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              একবার জমা দেওয়া বায়োডাটার উত্তরগুলো এখানে আছে। উত্তর এডিট করলে তা
              স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে; নতুন করে শুরু করতে হবে না।
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link
                href="/profile"
                className="inline-flex min-h-10 items-center rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white"
              >
                প্রোফাইল ও স্ট্যাটাস দেখুন
              </Link>
              {savedStage === "rejected" && (
                <button
                  type="button"
                  onClick={() => setView("finish")}
                  className="inline-flex min-h-10 items-center rounded-lg border border-pink-300 px-4 py-2 text-sm font-semibold text-pink-700 hover:bg-pink-50"
                >
                  সংশোধন শেষ হলে আবার Submit করুন
                </button>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setView("journey")}
            aria-label="ফিরে যান"
            className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm hover:bg-pink-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">আপনার উত্তরগুলো</h1>
            <p className="text-sm text-gray-500">
              যেকোনো উত্তরে ট্যাপ করে বদলাতে পারবেন
            </p>
          </div>
        </div>
        {levels.map((l, li) => {
          const Icon = LEVEL_ICONS[l.section.id] || Sparkles;
          return (
            <section
              key={l.section.id}
              className="overflow-hidden rounded-3xl bg-white shadow-sm"
            >
              <h2 className="flex items-center gap-2 border-b border-pink-50 px-5 py-3 font-bold text-gray-900">
                <Icon className="h-5 w-5 text-pink-600" /> {l.section.title}
                {levelComplete(l) && (
                  <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    সম্পন্ন
                  </span>
                )}
              </h2>
              <ul className="divide-y divide-gray-50">
                {l.questions.map((q, i) => {
                  const shown = displayAnswer(q);
                  return (
                    <li key={q.id}>
                      <button
                        type="button"
                        onClick={() => goLevel(li, i)}
                        className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-pink-50/50"
                      >
                        <span className="min-w-0 flex-1">
                          <span
                            className="block text-sm text-gray-500"
                            dir="auto"
                          >
                            {q.question}
                            {q.required && (
                              <span className="text-pink-600"> *</span>
                            )}
                          </span>
                          <span
                            className={`mt-0.5 block break-words text-[15px] ${shown ? "font-semibold text-gray-900" : "italic text-gray-400"}`}
                            dir="auto"
                          >
                            {shown || "উত্তর দেওয়া হয়নি"}
                          </span>
                        </span>
                        <Pencil className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>,
    );

  // Journey map (home of the game).
  const started = answeredCount > 0;
  return shell(
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(219,39,119,0.08)] sm:p-7">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <Ring value={percent} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-pink-700">
              {name ? `স্বাগতম, ${name}!` : "স্বাগতম!"}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight text-gray-900 sm:text-3xl">
              {percent >= 100
                ? "আপনার বায়োডাটা সম্পূর্ণ"
                : started
                  ? "আপনার বায়োডাটা যাত্রা চলছে"
                  : "চলুন বায়োডাটা তৈরি শুরু করি"}
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-gray-600">
              একবারে একটি প্রশ্নের উত্তর দিন। আপনার উত্তর নিজে থেকেই সংরক্ষিত হবে।
              কোনো প্রশ্ন পরে দিতে চাইলে উপরের “এড়িয়ে যান” চাপুন।
            </p>
            <p
              className="mt-2 text-[13px] font-semibold text-slate-700"
              aria-live="polite"
            >
              {requiredProgress.requiredCount > 0
                ? `আবশ্যিক প্রশ্নের উত্তর: ${bn(requiredProgress.answeredCount)} / ${bn(requiredProgress.requiredCount)}`
                : !gender
                  ? "বায়োডাটা শুরু করলে আবশ্যিক প্রশ্ন গণনা হবে"
                  : "বর্তমানে কোনো আবশ্যিক প্রশ্ন নেই"}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-gray-500">
              আপনার জন্য প্রযোজ্য আবশ্যিক প্রশ্ন অনুযায়ী অগ্রগতি। সংরক্ষণ হলে এই হিসাব
              প্রশাসকও দেখতে পারবেন।
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {typeof connectionBalance === "number" && (
                <Link
                  href="/profile/numbers"
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700 hover:bg-amber-100"
                >
                  <Gem className="h-4 w-4" />
                  {bn(connectionBalance)} বাকি কানেকশন
                </Link>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-3 py-1 text-sm font-bold text-pink-700">
                <Trophy className="h-4 w-4" />
                {bn(completedLevels)}/{bn(levels.length)} ধাপ
              </span>
              {saveBadge}
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={continueJourney}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-pink-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-pink-600/20 hover:bg-pink-700"
          >
            {percent >= 100
              ? "জমা দিতে এগিয়ে যান"
              : started
                ? "যেখানে থেমেছিলেন সেখান থেকে চালিয়ে যান"
                : "শুরু করুন"}{" "}
            <ChevronRight className="h-5 w-5" />
          </button>
          {started && (
            <button
              type="button"
              onClick={() => setView("review")}
              className="rounded-full border-2 border-pink-200 bg-white px-6 py-3 text-sm font-bold text-pink-700 hover:bg-pink-50"
            >
              সব উত্তর দেখুন
            </button>
          )}
        </div>
      </section>

      <section
        aria-label="ধাপসমূহ"
        className="rounded-3xl bg-white p-4 shadow-sm sm:p-6"
      >
        <h2 className="mb-4 font-bold text-gray-900">আপনার যাত্রা</h2>
        <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[27px] before:top-6 before:w-0.5 before:bg-pink-100">
          {levels.map((l, li) => {
            const Icon = LEVEL_ICONS[l.section.id] || Sparkles;
            const done = l.questions.filter((q) => answered(q)).length;
            const complete = levelComplete(l);
            const isCurrent =
              !complete &&
              levels.findIndex((item) => !levelComplete(item)) === li;
            return (
              <li key={l.section.id} className="relative">
                <button
                  type="button"
                  onClick={() => goLevel(li)}
                  className={`flex w-full items-center gap-4 rounded-2xl border-2 p-2.5 pr-4 text-left transition-colors ${isCurrent ? "border-pink-300 bg-pink-50" : "border-transparent hover:bg-gray-50"}`}
                >
                  <span
                    className={`relative z-[1] flex size-[38px] shrink-0 items-center justify-center rounded-full sm:size-10 ${complete ? "bg-pink-600 text-white" : isCurrent ? "qb-pulse bg-white text-pink-600 ring-2 ring-pink-500" : "bg-gray-100 text-gray-400"}`}
                    style={{ marginLeft: 8 }}
                  >
                    {complete ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-gray-500">
                      ধাপ {bn(li + 1)}
                    </span>
                    <span className="block truncate font-bold text-gray-900">
                      {l.section.title}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                        <span
                          className="block h-full rounded-full bg-pink-500"
                          style={{
                            width: `${(done / l.questions.length) * 100}%`,
                          }}
                        />
                      </span>
                      <span className="text-xs text-gray-500">
                        {bn(done)}/{bn(l.questions.length)}
                      </span>
                    </span>
                  </span>
                  {complete ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      সম্পন্ন
                    </span>
                  ) : isCurrent ? (
                    <span className="rounded-full bg-pink-600 px-3 py-1 text-xs font-bold text-white">
                      চালিয়ে যান
                    </span>
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="flex flex-col items-start gap-3 rounded-3xl bg-gradient-to-br from-pink-600 to-rose-500 p-5 text-white shadow-sm sm:flex-row sm:items-center">
        <Sparkles className="h-8 w-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">টাইপ করতে ভালো লাগছে না?</p>
          <p className="text-sm text-white/85">
            আমাদের সহায়কের সাথে গল্পের মতো কথা বলে বায়োডাটা পূরণ করুন।
          </p>
        </div>
        <Link
          href="/profile/ai-profile"
          className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-pink-700 hover:bg-pink-50"
        >
          কথা বলে পূরণ করুন
        </Link>
      </section>

      <AiBiodataAssistant />
    </div>,
  );
}
