"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Briefcase, Check, ChevronRight, CloudOff, Flame, Gem, GraduationCap, HeartHandshake, House, ListChecks,
  Loader2, MapPin, MessageCircle, PartyPopper, Pencil, Search, ShieldCheck, Sparkles, Star, Trophy, User, X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useProfileStore } from "@/zustan/useProfileStore";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { PatchRequestAxios } from "@/api-hooks/api-hooks";
import {
  defaultQuestions, questionApplies, questionUsesSeparateStorage, readQuestionAnswer,
  type ProfileQuestion, type ProfileQuestionSchema,
} from "@/lib/profile-questions";
import { profileQuestionOptions } from "@/lib/profile-question-options";
import AiBiodataAssistant from "./AiBiodataAssistant";

type View = "journey" | "play" | "levelDone" | "review" | "finish";
type Answer = string | number | boolean | string[];

const LEVEL_ICONS: LucideIcon[] = [User, MapPin, GraduationCap, Sparkles, House, Briefcase, Gem, HeartHandshake, MessageCircle, ShieldCheck];
const CHEERS = ["দারুণ!", "চমৎকার!", "খুব ভালো!", "এগিয়ে চলুন!", "অসাধারণ!", "বাহ!"];
const NUMERIC_PATHS = ["age", "weight", "familyInfo.brotherCount", "familyInfo.sisterCount", "personalInformation.height"];
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
@media (prefers-reduced-motion:reduce){.qb-in,.qb-pop,.qb-float,.qb-shake,.qb-pulse{animation:none!important}.qb-confetti{display:none}}
`;

/** Same rules the server uses to count a question as answered. */
function isAnswered(q: ProfileQuestion, value: unknown) {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (q.type === "checkbox") return q.required ? value === true : typeof value === "boolean";
  if (q.type === "number") return Number(value) !== 0 && !Number.isNaN(Number(value));
  return true;
}

function Confetti() {
  const colors = ["#db2777", "#f59e0b", "#10b981", "#6366f1", "#f43f5e"];
  return <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    {Array.from({ length: 30 }, (_, i) => <span key={i} className="qb-confetti absolute top-0 block h-2.5 w-1.5 rounded-sm"
      style={{ left: `${(i * 37) % 100}%`, background: colors[i % colors.length], animationDelay: `${(i % 8) * 80}ms` }} />)}
  </div>;
}

function Ring({ value, size = 112 }: { value: number; size?: number }) {
  const r = size / 2 - 9, c = 2 * Math.PI * r;
  return <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${value}% সম্পূর্ণ`}>
    <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="9" className="stroke-pink-100" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="9" strokeLinecap="round" className="stroke-pink-600 transition-all duration-700"
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
    </svg>
    <span className="absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-2xl font-extrabold text-gray-900">{bn(value)}%</span>
      <span className="text-[11px] text-gray-500">সম্পূর্ণ</span>
    </span>
  </div>;
}

/** Big, tappable answer controls (one question per screen). */
function BigAnswer({ q, value, options, onChange, onPicked, onEnter }: {
  q: ProfileQuestion; value: unknown; options: { label: string; value: string }[];
  onChange: (next: Answer) => void; onPicked: () => void; onEnter: () => void;
}) {
  const [filter, setFilter] = useState("");
  const raw = value === undefined || value === null ? "" : value;
  const chip = (active: boolean) => `flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 ${
    active ? "border-pink-600 bg-pink-600 text-white shadow-sm" : "border-gray-200 bg-white text-gray-800 hover:border-pink-300 hover:bg-pink-50"}`;
  const big = "w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-4 text-lg text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-pink-500";

  if (q.type === "checkbox") return <div className="grid grid-cols-2 gap-3">
    {[{ v: true, label: "হ্যাঁ" }, { v: false, label: "না" }].map(item => <button key={String(item.v)} type="button" aria-pressed={raw === item.v}
      onClick={() => { onChange(item.v); if (item.v) onPicked(); }} className={chip(raw === item.v)}>
      <span className="text-lg">{item.label}</span>{raw === item.v && <Check className="h-5 w-5" />}
    </button>)}
  </div>;

  if (q.type === "multi_checkbox") {
    const chosen = Array.isArray(raw) ? raw.map(String) : [];
    return <div className="space-y-2">
      <p className="text-sm text-gray-500">যতগুলো প্রযোজ্য, সব বেছে নিন</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map(option => {
          const on = chosen.includes(option.value);
          return <button key={option.value} type="button" aria-pressed={on} className={chip(on)}
            onClick={() => onChange(on ? chosen.filter(v => v !== option.value) : [...chosen, option.value])}>
            <span>{option.label}</span>{on && <Check className="h-5 w-5 shrink-0" />}
          </button>;
        })}
      </div>
      {!options.length && <p className="text-sm text-amber-700">এই প্রশ্নের কোনো উত্তর এখনো যোগ করা হয়নি।</p>}
    </div>;
  }

  if ((q.type === "select" || q.type === "dropdown") && options.length) {
    const current = String(raw);
    const savedOther = current && !options.some(option => option.value === current);
    if (options.length <= 12) return <div className={`grid gap-2 ${options.length > 4 ? "sm:grid-cols-2" : ""}`}>
      {savedOther && <button type="button" aria-pressed className={chip(true)}><span>{current}</span><Check className="h-5 w-5" /></button>}
      {options.map(option => <button key={option.value} type="button" aria-pressed={current === option.value} className={chip(current === option.value)}
        onClick={() => { onChange(option.value); onPicked(); }}>
        <span>{option.label}</span>{current === option.value && <Check className="h-5 w-5 shrink-0" />}
      </button>)}
    </div>;
    const term = filter.trim().toLowerCase();
    const shown = options.filter(option => !term || option.label.toLowerCase().includes(term) || option.value.toLowerCase().includes(term));
    return <div className="space-y-2">
      <label className="relative block">
        <span className="sr-only">খুঁজুন</span>
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input autoFocus value={filter} onChange={event => setFilter(event.target.value)} placeholder="টাইপ করে খুঁজুন..." className={`${big} pl-12 text-base`} />
      </label>
      {current && <p className="text-sm text-gray-600">নির্বাচিত: <span className="font-semibold text-pink-700">{options.find(option => option.value === current)?.label || current}</span></p>}
      <ul className="max-h-72 space-y-1.5 overflow-y-auto rounded-2xl pr-1">
        {shown.slice(0, 120).map(option => <li key={option.value}>
          <button type="button" aria-pressed={current === option.value} className={chip(current === option.value)}
            onClick={() => { onChange(option.value); onPicked(); }}>
            <span>{option.label}</span>{current === option.value && <Check className="h-5 w-5 shrink-0" />}
          </button>
        </li>)}
        {!shown.length && <li className="px-2 py-6 text-center text-sm text-gray-500">“{filter}” মিলছে না</li>}
      </ul>
    </div>;
  }

  if (q.type === "textarea") return <div>
    <textarea autoFocus aria-labelledby="qb-question" dir="auto" rows={5} maxLength={5000} value={String(raw)}
      onChange={event => onChange(event.target.value)} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") onEnter(); }}
      placeholder="নিজের ভাষায় লিখুন..." className={`${big} resize-y text-base leading-7`} />
    <p className="mt-1 text-right text-xs text-gray-400">{bn(String(raw).length)}/৫০০০</p>
  </div>;

  return <input autoFocus aria-labelledby="qb-question" dir="auto" type={q.type === "number" ? "number" : "text"}
    inputMode={q.type === "number" ? "decimal" : undefined} value={String(raw)} maxLength={q.type === "number" ? undefined : 5000}
    onChange={event => onChange(q.type === "number" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value)}
    onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); onEnter(); } }}
    placeholder={q.type === "number" ? "সংখ্যা লিখুন" : "আপনার উত্তর লিখুন..."}
    className={`${big} ${q.type === "number" ? "text-center text-3xl font-bold" : ""}`} />;
}

export default function ProfileUpdateForm() {
  const router = useRouter();
  const formData = useProfileStore(state => state.formData);
  const currentStep = useProfileStore(state => state.currentStep);
  const setCurrentStep = useProfileStore(state => state.setCurrentStep);
  const initializeForm = useProfileStore(state => state.initializeForm);
  const updateField = useProfileStore(state => state.updateField);
  const updateNestedField = useProfileStore(state => state.updateNestedField);
  const updateCustomField = useProfileStore(state => state.updateCustomField);
  const updateDynamicAnswer = useProfileStore(state => state.updateDynamicAnswer);
  const initialized = useRef(false), saved = useRef(""), saveChain = useRef(Promise.resolve());
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [schema, setSchema] = useState<ProfileQuestionSchema>(defaultQuestions);
  const [view, setView] = useState<View>("journey");
  const [qi, setQi] = useState(0);
  const [streak, setStreak] = useState(0);
  const [cheer, setCheer] = useState<{ text: string; points: boolean; n: number } | null>(null);
  const [shake, setShake] = useState(0);
  const openedAnswered = useRef(false);
  const nextRef = useRef<(skipped?: boolean) => void>(() => {});

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/profile-questions", { signal: controller.signal })
      .then(r => r.ok ? r.json() : Promise.reject(Error()))
      .then((next: ProfileQuestionSchema) => { if (Array.isArray(next?.questions)) setSchema(next); })
      .catch(() => { /* The built-in questions stay as the fallback. */ });
    return () => controller.abort();
  }, []);

  const { data, isLoading } = useQueryWrapper(["get-my-profile"], "/user/get-my-profile");
  const { mutate, isPending } = useCommonMutationApi({
    method: "PATCH", url: "/user/update-user", mutationKey: ["update-user"],
    successMessage: "আলহামদুলিল্লাহ! আপনার বায়োডাটা জমা হয়েছে।",
    onSuccess: () => router.push("/profile"),
  });
  useEffect(() => {
    if (data && !initialized.current) {
      initialized.current = true;
      initializeForm(data);
      saved.current = JSON.stringify(useProfileStore.getState().getFormData());
      setCurrentStep(Math.max(0, Math.min(9, (data as { draftStep?: number }).draftStep || 0)));
    }
  }, [data, initializeForm, setCurrentStep]);

  const saveDraft = async (snapshot = useProfileStore.getState().getFormData(), step = useProfileStore.getState().currentStep) => {
    setSaveState("saving");
    const [result, error] = await PatchRequestAxios("/user/update-user", { ...snapshot, draftStep: step });
    if (!result) { setSaveState("error"); throw new Error(error?.message || "Draft save failed"); }
    saved.current = JSON.stringify(snapshot);
    setSaveState("saved");
  };
  // Every answer is saved automatically a moment after it changes.
  useEffect(() => {
    if (!initialized.current || saved.current === JSON.stringify(formData)) return;
    const snapshot = formData;
    const timer = setTimeout(() => {
      saveChain.current = saveChain.current.catch(() => {}).then(() => saveDraft(snapshot, currentStep));
      void saveChain.current.catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData, currentStep]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const retry = () => { void saveDraft().catch(() => {}); };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const gender = formData.gender as string | undefined;
  const flow = useMemo(() => schema.questions.filter(q => !q.locked && questionApplies(q, gender))
    .sort((a, b) => a.section - b.section || a.order - b.order), [schema, gender]);
  const levels = useMemo(() => schema.sections
    .map(section => ({ section, questions: flow.filter(q => q.section === section.id) }))
    .filter(level => level.questions.length), [schema.sections, flow]);
  useEffect(() => {
    if (levels.length && !levels.some(level => level.section.id === currentStep)) setCurrentStep(levels[0].section.id);
  }, [levels, currentStep, setCurrentStep]);

  const answered = (q: ProfileQuestion, profile = formData) => isAnswered(q, readQuestionAnswer(profile, q));
  const levelIndex = Math.max(0, levels.findIndex(level => level.section.id === currentStep));
  const level = levels[levelIndex];
  const levelQuestions = level?.questions ?? [];
  const question = levelQuestions[Math.min(qi, Math.max(0, levelQuestions.length - 1))];
  const answeredCount = flow.filter(q => answered(q)).length;
  const percent = flow.length ? Math.round((answeredCount / flow.length) * 100) : 0;
  const levelComplete = (l: { questions: ProfileQuestion[] }) => l.questions.some(q => answered(q)) && l.questions.every(q => !q.required || answered(q));
  const completedLevels = levels.filter(levelComplete).length;
  const points = answeredCount * 10 + completedLevels * 50;
  const requiredMissing = flow.filter(q => q.required && !answered(q));
  const name = typeof formData.name === "string" ? formData.name.split(" ")[0] : "";

  useEffect(() => { if (question) openedAnswered.current = answered(question); }, [question?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!cheer) return;
    const timer = window.setTimeout(() => setCheer(null), 1300);
    return () => window.clearTimeout(timer);
  }, [cheer]);

  const optionsFor = (q: ProfileQuestion) => profileQuestionOptions(q, gender, formData);
  const displayAnswer = (q: ProfileQuestion) => {
    const value = readQuestionAnswer(formData, q);
    if (!isAnswered(q, value)) return "";
    const options = optionsFor(q);
    if (Array.isArray(value)) return value.map(item => options.find(option => option.value === item)?.label || String(item)).join(", ");
    if (typeof value === "boolean") return value ? "হ্যাঁ" : "না";
    return options.find(option => option.value === String(value))?.label || String(value);
  };
  const setAnswer = (q: ProfileQuestion, answer: Answer) => {
    if (questionUsesSeparateStorage(q)) { updateDynamicAnswer(q.id, answer); return; }
    if (q.legacyKey) { updateCustomField(q.legacyKey, String(answer)); return; }
    if (!q.path) return;
    const normalized = typeof answer === "string" && NUMERIC_PATHS.includes(q.path) ? (answer === "" ? undefined : Number(answer)) : answer;
    const [parent, field] = q.path.split(".");
    if (field) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateNestedField(parent as any, field, normalized);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (q.path === "address.district") updateNestedField("address" as any, "upazila", "");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } else updateField(q.path as any, normalized as any);
  };

  const goLevel = (index: number, startAt?: number) => {
    const target = levels[index];
    if (!target) return;
    setCurrentStep(target.section.id);
    const firstOpen = target.questions.findIndex(q => !answered(q));
    setQi(startAt ?? (firstOpen >= 0 ? firstOpen : 0));
    setView("play");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const continueJourney = () => {
    const requiredLevel = levels.findIndex(l => l.questions.some(q => q.required && !answered(q)));
    const openLevel = requiredLevel >= 0 ? requiredLevel : levels.findIndex(l => l.questions.some(q => !answered(q)));
    if (openLevel >= 0) goLevel(openLevel); else setView("finish");
  };
  const finishLevel = async () => {
    setView("levelDone");
    window.scrollTo({ top: 0, behavior: "smooth" });
    try { await saveChain.current.catch(() => {}); await saveDraft(undefined, currentStep); } catch { /* the save badge shows the problem */ }
  };
  const next = (skipped = false) => {
    if (!question) return;
    const fresh = useProfileStore.getState().formData;
    const isDone = answered(question, fresh);
    if (!skipped && question.required && !isDone) {
      setShake(n => n + 1);
      toast.error("এই প্রশ্নের উত্তর দেওয়া আবশ্যিক");
      return;
    }
    if (skipped || !isDone) setStreak(0);
    else {
      setStreak(s => s + 1);
      setCheer({ text: CHEERS[Math.floor(Math.random() * CHEERS.length)], points: !openedAnswered.current, n: Date.now() });
    }
    if (qi < levelQuestions.length - 1) setQi(qi + 1);
    else void finishLevel();
  };
  useEffect(() => { nextRef.current = next; });
  const autoAdvance = () => window.setTimeout(() => nextRef.current(false), 350);
  const submit = async () => {
    if (requiredMissing.length) { setView("finish"); toast.error("কয়েকটি আবশ্যিক প্রশ্ন বাকি আছে"); return; }
    try { await saveChain.current.catch(() => {}); await saveDraft(); }
    catch { toast.error("সংরক্ষণ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।"); return; }
    mutate({ ...useProfileStore.getState().getFormData(), submit: true, draftStep: currentStep });
  };

  const saveBadge = <span className="inline-flex items-center gap-1 text-xs text-gray-500" aria-live="polite">
    {saveState === "saving" ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> সংরক্ষণ হচ্ছে</>
      : saveState === "error" ? <span className="inline-flex items-center gap-1 text-red-600"><CloudOff className="h-3.5 w-3.5" /> সংরক্ষণ হয়নি, সংযোগ ফিরলে হবে</span>
        : saveState === "saved" ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> সংরক্ষিত</> : null}
  </span>;
  const shell = (children: ReactNode) => <div className="min-h-[calc(100vh-4rem)] w-full bg-[#fff7f9] px-4 py-5 sm:py-8">
    <style>{CSS}</style>{children}
  </div>;

  if (isLoading || (!!data && !initialized.current)) return shell(<div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-gray-600">
    <Loader2 className="h-9 w-9 animate-spin text-pink-600" /> আপনার বায়োডাটা খোলা হচ্ছে...
  </div>);

  if (view === "play" && question) {
    const value = readQuestionAnswer(formData, question);
    const Icon = LEVEL_ICONS[level.section.id] || Sparkles;
    return shell(<div className="relative mx-auto flex max-w-2xl flex-col">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => (qi > 0 ? setQi(qi - 1) : setView("journey"))} aria-label="আগের প্রশ্ন"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm hover:bg-pink-50"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-600">
            <span className="flex min-w-0 items-center gap-1.5 truncate"><Icon className="h-4 w-4 shrink-0 text-pink-600" /> লেভেল {bn(levelIndex + 1)}: {level.section.title}</span>
            <span className="shrink-0">{bn(Math.min(qi + 1, levelQuestions.length))}/{bn(levelQuestions.length)}</span>
          </div>
          <div className="mt-1.5 flex gap-1" aria-hidden>
            {levelQuestions.map((q, i) => <span key={q.id} className={`h-1.5 flex-1 rounded-full transition-colors ${i < qi || (i === qi && answered(q)) ? "bg-pink-600" : i === qi ? "bg-pink-300" : answered(q) ? "bg-pink-200" : "bg-gray-200"}`} />)}
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-amber-600 shadow-sm" title="পয়েন্ট"><Star className="h-4 w-4 fill-amber-400 text-amber-500" />{bn(points)}</span>
        <button type="button" onClick={() => setView("journey")} aria-label="যাত্রার ম্যাপে ফিরুন"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm hover:bg-pink-50"><X className="h-5 w-5" /></button>
      </div>

      {cheer && <div key={cheer.n} className="qb-float pointer-events-none absolute right-2 top-16 z-10 rounded-full bg-emerald-500 px-3 py-1 text-sm font-bold text-white shadow-lg">
        {cheer.text}{cheer.points && " +১০"}
      </div>}

      <div key={question.id + ":" + shake} className={`qb-in mt-6 rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(219,39,119,0.08)] sm:p-8 ${shake ? "qb-shake" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          {question.required ? <span className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-semibold text-pink-700">আবশ্যিক</span>
            : <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">ঐচ্ছিক</span>}
          {streak >= 2 && <span className="qb-pop inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600"><Flame className="h-3.5 w-3.5" /> {bn(streak)} টানা উত্তর</span>}
        </div>
        <h1 id="qb-question" dir="auto" className="mt-4 text-2xl font-bold leading-snug text-gray-900 sm:text-[28px]">{question.question}</h1>
        <div className="mt-6">
          <BigAnswer key={question.id} q={question} value={value} options={optionsFor(question)}
            onChange={answer => setAnswer(question, answer)} onPicked={autoAdvance} onEnter={() => next(false)} />
        </div>
      </div>

      <div className="sticky bottom-0 mt-6 flex items-center gap-3 bg-[#fff7f9]/95 py-3 backdrop-blur">
        <div className="hidden min-w-0 flex-1 sm:block">{saveBadge}</div>
        {!question.required && <button type="button" onClick={() => next(true)} className="rounded-full px-5 py-3.5 text-sm font-semibold text-gray-600 hover:bg-white">এড়িয়ে যান</button>}
        <button type="button" onClick={() => next(false)}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-pink-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-pink-600/20 transition-colors hover:bg-pink-700 sm:flex-none sm:min-w-44">
          {qi < levelQuestions.length - 1 ? "পরবর্তী" : "লেভেল শেষ করুন"} <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="sm:hidden">{saveBadge}</div>
    </div>);
  }

  if (view === "levelDone" && level) {
    const Icon = LEVEL_ICONS[level.section.id] || Trophy;
    const done = level.questions.filter(q => answered(q)).length;
    const nextLevel = levels[levelIndex + 1];
    return shell(<div className="relative mx-auto max-w-lg overflow-hidden rounded-3xl bg-white p-6 text-center shadow-[0_10px_30px_rgba(219,39,119,0.1)] sm:p-10">
      <Confetti />
      <div className="qb-pop mx-auto flex size-24 items-center justify-center rounded-full bg-pink-600 text-white shadow-lg shadow-pink-600/30"><Icon className="h-11 w-11" /></div>
      <p className="mt-5 text-sm font-semibold text-pink-700">লেভেল {bn(levelIndex + 1)} সম্পন্ন!</p>
      <h1 className="mt-1 text-2xl font-extrabold text-gray-900">“{level.section.title}” ব্যাজ অর্জন</h1>
      <p className="mt-2 text-gray-600">{bn(level.questions.length)}টির মধ্যে {bn(done)}টি প্রশ্নের উত্তর দিয়েছেন।</p>
      <div className="mt-6 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-amber-50 p-3"><p className="flex items-center justify-center gap-1 text-lg font-extrabold text-amber-600"><Star className="h-4 w-4 fill-amber-400" />{bn(points)}</p><p className="text-xs text-gray-600">মোট পয়েন্ট</p></div>
        <div className="rounded-2xl bg-pink-50 p-3"><p className="text-lg font-extrabold text-pink-700">{bn(percent)}%</p><p className="text-xs text-gray-600">বায়োডাটা</p></div>
        <div className="rounded-2xl bg-orange-50 p-3"><p className="flex items-center justify-center gap-1 text-lg font-extrabold text-orange-600"><Flame className="h-4 w-4" />{bn(streak)}</p><p className="text-xs text-gray-600">টানা উত্তর</p></div>
      </div>
      <div className="mt-6 space-y-2">
        {nextLevel ? <button type="button" onClick={() => goLevel(levelIndex + 1)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-pink-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-pink-600/20 hover:bg-pink-700">
          পরবর্তী লেভেল: {nextLevel.section.title} <ChevronRight className="h-5 w-5" />
        </button> : <button type="button" onClick={() => setView("finish")}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-pink-600 px-6 py-3.5 font-bold text-white hover:bg-pink-700"><Trophy className="h-5 w-5" /> শেষ ধাপে যান</button>}
        <button type="button" onClick={() => setView("journey")} className="w-full rounded-full px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">যাত্রার ম্যাপ দেখুন</button>
      </div>
      <div className="mt-3 flex justify-center">{saveBadge}</div>
    </div>);
  }

  if (view === "finish") return shell(<div className="relative mx-auto max-w-lg overflow-hidden rounded-3xl bg-white p-6 text-center shadow-[0_10px_30px_rgba(219,39,119,0.1)] sm:p-10">
    {!requiredMissing.length && <Confetti />}
    <div className="qb-pop mx-auto flex size-24 items-center justify-center rounded-full bg-amber-400 text-white shadow-lg shadow-amber-400/40">
      {requiredMissing.length ? <ListChecks className="h-11 w-11" /> : <PartyPopper className="h-11 w-11" />}
    </div>
    {requiredMissing.length ? <>
      <h1 className="mt-5 text-2xl font-extrabold text-gray-900">প্রায় শেষ!</h1>
      <p className="mt-2 text-gray-600">জমা দেওয়ার আগে আর {bn(requiredMissing.length)}টি আবশ্যিক প্রশ্ন বাকি।</p>
      <ul className="mt-5 space-y-2 text-left">
        {requiredMissing.slice(0, 8).map(q => {
          const li = levels.findIndex(l => l.section.id === q.section);
          return <li key={q.id}>
            <button type="button" onClick={() => goLevel(li, levels[li]?.questions.findIndex(item => item.id === q.id))}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-gray-100 px-4 py-3 text-left hover:border-pink-300 hover:bg-pink-50">
              <span className="min-w-0 flex-1"><span className="block text-xs text-gray-500">{levels[li]?.section.title}</span><span className="line-clamp-2 text-sm font-semibold text-gray-900">{q.question}</span></span>
              <ChevronRight className="h-5 w-5 shrink-0 text-pink-600" />
            </button>
          </li>;
        })}
      </ul>
    </> : <>
      <h1 className="mt-5 text-2xl font-extrabold text-gray-900">মাশাআল্লাহ, আপনার বায়োডাটা তৈরি!</h1>
      <p className="mt-2 text-gray-600">{bn(points)} পয়েন্ট আর {bn(completedLevels)}টি ব্যাজ অর্জন করেছেন। এবার জমা দিন, যাচাইয়ের পর প্রকাশ করা হবে।</p>
      <button type="button" onClick={() => void submit()} disabled={isPending}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-pink-600 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-pink-600/25 hover:bg-pink-700 disabled:opacity-60">
        {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} বায়োডাটা জমা দিন
      </button>
    </>}
    <div className="mt-3 flex flex-col gap-1">
      <button type="button" onClick={() => setView("review")} className="rounded-full px-6 py-3 text-sm font-semibold text-pink-700 hover:bg-pink-50">সব উত্তর একবার দেখে নিন</button>
      <button type="button" onClick={() => setView("journey")} className="rounded-full px-6 py-2 text-sm text-gray-500 hover:bg-gray-50">যাত্রার ম্যাপ</button>
    </div>
  </div>);

  if (view === "review") return shell(<div className="mx-auto max-w-3xl space-y-4">
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => setView("journey")} aria-label="ফিরে যান" className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm hover:bg-pink-50"><ArrowLeft className="h-5 w-5" /></button>
      <div><h1 className="text-xl font-bold text-gray-900">আপনার উত্তরগুলো</h1><p className="text-sm text-gray-500">যেকোনো উত্তরে ট্যাপ করে বদলাতে পারবেন</p></div>
    </div>
    {levels.map((l, li) => {
      const Icon = LEVEL_ICONS[l.section.id] || Sparkles;
      return <section key={l.section.id} className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <h2 className="flex items-center gap-2 border-b border-pink-50 px-5 py-3 font-bold text-gray-900"><Icon className="h-5 w-5 text-pink-600" /> {l.section.title}
          {levelComplete(l) && <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">সম্পন্ন</span>}</h2>
        <ul className="divide-y divide-gray-50">
          {l.questions.map((q, i) => {
            const shown = displayAnswer(q);
            return <li key={q.id}>
              <button type="button" onClick={() => goLevel(li, i)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-pink-50/50">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-gray-500" dir="auto">{q.question}{q.required && <span className="text-pink-600"> *</span>}</span>
                  <span className={`mt-0.5 block break-words text-[15px] ${shown ? "font-semibold text-gray-900" : "italic text-gray-400"}`} dir="auto">{shown || "উত্তর দেওয়া হয়নি"}</span>
                </span>
                <Pencil className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
              </button>
            </li>;
          })}
        </ul>
      </section>;
    })}
  </div>);

  // Journey map (home of the game).
  const started = answeredCount > 0;
  return shell(<div className="mx-auto max-w-3xl space-y-5">
    <section className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(219,39,119,0.08)] sm:p-7">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <Ring value={percent} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-pink-700">{name ? `স্বাগতম, ${name}!` : "স্বাগতম!"}</p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight text-gray-900 sm:text-3xl">{percent >= 100 ? "আপনার বায়োডাটা সম্পূর্ণ" : started ? "আপনার বায়োডাটা যাত্রা চলছে" : "চলুন বায়োডাটা তৈরি শুরু করি"}</h1>
          <p className="mt-1.5 text-sm text-gray-600">একবারে একটি প্রশ্ন। প্রতিটি উত্তরে পয়েন্ট, প্রতিটি লেভেলে নতুন ব্যাজ। সব উত্তর সাথে সাথে সংরক্ষিত হয়।</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-600"><Star className="h-4 w-4 fill-amber-400 text-amber-500" />{bn(points)} পয়েন্ট</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-3 py-1 text-sm font-bold text-pink-700"><Trophy className="h-4 w-4" />{bn(completedLevels)}/{bn(levels.length)} ব্যাজ</span>
            {saveBadge}
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={continueJourney}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-pink-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-pink-600/20 hover:bg-pink-700">
          {percent >= 100 ? "জমা দিতে এগিয়ে যান" : started ? "যেখানে থেমেছিলেন সেখান থেকে চালিয়ে যান" : "শুরু করুন"} <ChevronRight className="h-5 w-5" />
        </button>
        {started && <button type="button" onClick={() => setView("review")} className="rounded-full border-2 border-pink-200 bg-white px-6 py-3 text-sm font-bold text-pink-700 hover:bg-pink-50">সব উত্তর দেখুন</button>}
      </div>
    </section>

    <section aria-label="লেভেলসমূহ" className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
      <h2 className="mb-4 font-bold text-gray-900">আপনার যাত্রা</h2>
      <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[27px] before:top-6 before:w-0.5 before:bg-pink-100">
        {levels.map((l, li) => {
          const Icon = LEVEL_ICONS[l.section.id] || Sparkles;
          const done = l.questions.filter(q => answered(q)).length;
          const complete = levelComplete(l);
          const isCurrent = !complete && levels.findIndex(item => !levelComplete(item)) === li;
          return <li key={l.section.id} className="relative">
            <button type="button" onClick={() => goLevel(li)}
              className={`flex w-full items-center gap-4 rounded-2xl border-2 p-2.5 pr-4 text-left transition-colors ${isCurrent ? "border-pink-300 bg-pink-50" : "border-transparent hover:bg-gray-50"}`}>
              <span className={`relative z-[1] flex size-[38px] shrink-0 items-center justify-center rounded-full sm:size-10 ${complete ? "bg-pink-600 text-white" : isCurrent ? "qb-pulse bg-white text-pink-600 ring-2 ring-pink-500" : "bg-gray-100 text-gray-400"}`}
                style={{ marginLeft: 8 }}>
                {complete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-gray-500">লেভেল {bn(li + 1)}</span>
                <span className="block truncate font-bold text-gray-900">{l.section.title}</span>
                <span className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100"><span className="block h-full rounded-full bg-pink-500" style={{ width: `${(done / l.questions.length) * 100}%` }} /></span>
                  <span className="text-xs text-gray-500">{bn(done)}/{bn(l.questions.length)}</span>
                </span>
              </span>
              {complete ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">ব্যাজ অর্জিত</span>
                : isCurrent ? <span className="rounded-full bg-pink-600 px-3 py-1 text-xs font-bold text-white">খেলুন</span>
                  : <ChevronRight className="h-5 w-5 text-gray-300" />}
            </button>
          </li>;
        })}
      </ol>
    </section>

    <section className="flex flex-col items-start gap-3 rounded-3xl bg-gradient-to-br from-pink-600 to-rose-500 p-5 text-white shadow-sm sm:flex-row sm:items-center">
      <Sparkles className="h-8 w-8 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">টাইপ করতে ভালো লাগছে না?</p>
        <p className="text-sm text-white/85">আমাদের সহায়কের সাথে গল্পের মতো কথা বলে বায়োডাটা পূরণ করুন।</p>
      </div>
      <Link href="/profile/ai-profile" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-pink-700 hover:bg-pink-50">কথা বলে পূরণ করুন</Link>
    </section>

    <AiBiodataAssistant />
  </div>);
}
