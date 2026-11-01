"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowUp, BadgeCheck, BookOpen, Briefcase, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Crown, Flag, Gem, GraduationCap, Heart, HeartHandshake, House,
  Loader2, Lock, MapPin, MessageCircle, Phone, Share2, ShieldCheck, User as UserIcon, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { User } from "@/@types/user";
import { GetRequestNormal, PostRequestAxios } from "@/api-hooks/api-hooks";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import {
  countries, economicStatusOptions, educationMediumOptions, fiqhOptions, marriedStatus, polygamyConsentOptions,
  professionOptions, religiousEducationOptions, skinColorOptions,
} from "@/staticData/all-data";
import { districts } from "@/staticData/districts";
import { upazilas } from "@/staticData/upazilas";
import { useUser } from "@/lib/useUser";
import { requestNumber } from "@/actions/auth";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { leadEvent, viewContentEvent } from "@/lib/google-tag-manager";
import { defaultQuestions, questionDisplayValue, questionUsesSeparateStorage, type ProfileQuestionSchema } from "@/lib/profile-questions";

interface ProfileViewProps { id: string }
type Fact = { path?: string; label: string; value: unknown };
type ShownFact = { label: string; value: string };
type Section = { id: string; title: string; icon: LucideIcon; facts: ShownFact[] };

const BN = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBn = (value: string | number) => String(value).replace(/\d/g, d => BN[Number(d)]);
const REPORT_REASONS = ["ভুল বা মিথ্যা তথ্য", "অশোভন ছবি বা কথা", "প্রতারণার সন্দেহ", "অন্য কারণ"];

function formatHeight(height: string | number) {
  const [feet, inches] = String(height).split(".");
  return `${toBn(feet)} ফুট ${toBn(inches || "0")} ইঞ্চি`;
}
function whatsappUrl(number: string) {
  let digits = number.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "88" + digits;
  return "https://wa.me/" + digits;
}
/** Public answers the backend allowed, for questions that have no fixed slot on this page. */
function extraEntries(user: User, schema: ProfileQuestionSchema, section: number): ShownFact[] {
  return schema.questions.filter(q =>
    q.section === section && q.enabled && q.showPublic &&
    (!q.path || questionUsesSeparateStorage(q) || q.path.startsWith("pledge.") || q.path === "howYouWannaGetMarried" ||
      defaultQuestions.questions.find(original => original.id === q.id)?.section !== q.section) &&
    user.publicAnswers?.[q.id] !== undefined && user.publicAnswers?.[q.id] !== null && user.publicAnswers?.[q.id] !== "" &&
    !(Array.isArray(user.publicAnswers?.[q.id]) && (user.publicAnswers?.[q.id] as string[]).length === 0),
  ).sort((a, b) => a.order - b.order)
    .map(q => ({ label: q.publicLabel || q.question, value: questionDisplayValue(user.publicAnswers?.[q.id], q) }))
    .filter(fact => fact.value);
}

function FactList({ facts }: { facts: ShownFact[] }) {
  return <dl className="sm:grid sm:grid-cols-2 sm:gap-x-6">
    {facts.map((fact, index) => {
      const long = fact.value.length > 75 || fact.label.length > 65;
      return <div key={fact.label + index} className={"min-w-0 border-b border-pink-100 py-3.5 last:border-0 sm:border-b " + (long ? "sm:col-span-2" : "")}>
        <dt className="text-[14px] font-medium leading-6 text-gray-600" dir="auto">{fact.label}</dt>
        <dd className="mt-1 whitespace-pre-line break-words text-[16px] font-semibold leading-[1.8] text-gray-900" dir="auto">{fact.value}</dd>
      </div>;
    })}
  </dl>;
}

function SectionCard({ section, expanded, onToggle, showTopicLink }: { section: Section; expanded: boolean; onToggle: () => void; showTopicLink: boolean }) {
  const Icon = section.icon;
  return <section data-biodata-section id={section.id} className="scroll-mt-24 overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm">
    <h3>
      <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={"details-" + section.id}
        className="flex min-h-[76px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-pink-50 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary sm:px-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-primary"><Icon className="size-5" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold leading-7 text-gray-900">{section.title}</span>
          <span className="block text-[13px] leading-5 text-gray-600">{toBn(section.facts.length)}টি তথ্য · {expanded ? "লুকাতে চাপ দিন" : "দেখতে চাপ দিন"}</span>
        </span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pink-50 text-primary">
          <ChevronDown aria-hidden className={"size-5 transition-transform " + (expanded ? "rotate-180" : "")} />
        </span>
      </button>
    </h3>
    <div id={"details-" + section.id} className={(expanded ? "block" : "hidden") + " border-t border-pink-100 px-4 sm:px-5"}>
      <FactList facts={section.facts} />
      {showTopicLink && <a href="#biodata-topics" className="mb-3 mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-pink-50 px-3 py-2 text-[14px] font-bold text-primary hover:bg-pink-100 focus-visible:outline-2 focus-visible:outline-primary">
        <ArrowUp className="size-4" aria-hidden /> অন্য তথ্যের তালিকায় ফিরুন
      </a>}
    </div>
  </section>;
}

export default function ProfileView({ id }: ProfileViewProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useUser();
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportText, setReportText] = useState("");
  const [reporting, setReporting] = useState(false);
  // All permitted biodata details start visible, including admin-added questions.
  const [closedSections, setClosedSections] = useState<Set<string>>(() => new Set());
  const topicRailRef = useRef<HTMLDivElement>(null);
  const [topicScroll, setTopicScroll] = useState({ left: false, right: false });
  const { data: userData, isLoading, refetch } = useQueryWrapper<User>(
    ["get-user", id], `/user/get-one-user?id=${id}`, { enabled: !!id, staleTime: 0 }, 0, "bio-data-info",
  );
  // Always render with the exact question revision the backend used to filter this profile.
  const questionSchema = userData?.publicQuestionSchema || defaultQuestions;
  // Premium badge follows the admin's "Show premium to members" switch.
  const { data: publicSettings } = useQueryWrapper<{ premium?: { visible?: boolean } }>(["public-settings"], "/public/settings");
  const showPremiumBadge = publicSettings?.premium?.visible === true;

  useEffect(() => {
    if (userData) viewContentEvent({
      biodata_id: userData._id, biodata_number: userData.userId, gender: userData.gender, age: userData.age,
      district: userData.address?.district, education: userData.educationInfo?.highestEducation, profession: userData.occupational?.profession,
    }, String(userData._id));
  }, [userData]);
  useEffect(() => { if (user?._id && userData?._id) void PostRequestAxios("/platform/visit/" + userData._id, {}); }, [user?._id, userData?._id]);

  // Keep the previous/next controls accurate as the rail is swiped or resized.
  useEffect(() => {
    const rail = topicRailRef.current;
    if (!rail) return;
    const sync = () => {
      const left = rail.scrollLeft > 3;
      const right = rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 3;
      setTopicScroll(current => current.left === left && current.right === right ? current : { left, right });
    };
    sync();
    rail.addEventListener("scroll", sync, { passive: true });
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    resizeObserver?.observe(rail);
    return () => { rail.removeEventListener("scroll", sync); resizeObserver?.disconnect(); };
  }, [userData]);

  const { mutate: shortlist, isPending: shortlisting } = useCommonMutationApi({
    method: "POST", url: "/user/add-to-shortlist", mutationKey: ["add-to-shortlist"],
    successMessage: "পছন্দের তালিকায় যুক্ত হয়েছে",
    onSuccess: (data) => { if (data.created) leadEvent(String(id), "interest"); },
  });
  const { mutateAsync: requestPhone, isPending: requestingPhone } = useMutation({
    mutationKey: ["request-number"],
    mutationFn: (payload: { userId: string; requestUserId: string }) => requestNumber(payload),
    onSuccess: (data) => {
      if (data?.data) { toast.success("পরিচয় ও যোগাযোগ আনলক হয়েছে"); return; }
      toast.error(data?.error?.message);
    },
  });
  const unlocking = requestingPhone || checkingAccess;

  if (isLoading) return <div className="min-h-screen bg-gray-50 px-4 py-6">
    <div className="mx-auto max-w-6xl animate-pulse space-y-4 lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-6 lg:space-y-0">
      <div className="h-80 rounded-3xl bg-white" />
      <div className="space-y-4"><div className="h-40 rounded-2xl bg-white" /><div className="h-64 rounded-2xl bg-white" /></div>
    </div>
  </div>;

  if (!userData) return <div className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4">
    <div className="max-w-sm rounded-3xl bg-white p-8 text-center shadow-sm">
      <UserIcon className="mx-auto h-10 w-10 text-gray-300" />
      <h1 className="mt-3 text-lg font-bold text-gray-900">বায়োডাটাটি পাওয়া যায়নি</h1>
      <p className="mt-1 text-sm text-gray-600">এটি সরিয়ে নেওয়া হতে পারে বা লুকানো আছে।</p>
      <Link href="/biodata" className="mt-5 inline-flex rounded-full bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pink-700">অন্য বায়োডাটা দেখুন</Link>
    </div>
  </div>;

  // ---- Visibility rules (unchanged): the admin question settings decide what is public. ----
  const configFor = (path?: string) => questionSchema.questions.find(q => q.path === path);
  const showField = (path?: string) => {
    if (!path) return true;
    const q = configFor(path);
    const original = defaultQuestions.questions.find(row => row.path === path);
    return !q || (q.enabled && q.showPublic && !questionUsesSeparateStorage(q) && (!original || original.section === q.section));
  };
  const labelFor = (path: string | undefined, fallback: string) => configFor(path)?.publicLabel || fallback;
  const shown = (rows: Fact[]): ShownFact[] => rows.filter(row => showField(row.path)).map(row => {
    const q = configFor(row.path);
    const raw = row.path?.split(".").reduce<unknown>((part, key) => (part as Record<string, unknown> | undefined)?.[key], userData);
    const option = q && ["select", "dropdown"].includes(q.type) ? q.options.find(o => o.value === String(raw)) : undefined;
    const value = option?.label ?? (typeof row.value === "boolean" ? (row.value ? "হ্যাঁ" : "না") : row.value);
    return { label: labelFor(row.path, row.label), value: value === undefined || value === null ? "" : String(value) };
  }).filter(fact => fact.value.trim() !== "" && fact.value !== "NaN");
  const extras = (section: number) => extraEntries(userData, questionSchema, section);
  const pick = (list: { value: string; label: string }[], value?: string) => value ? list.find(o => o.value === value)?.label || value : undefined;
  const bnDistrict = (value?: string) => districts.find(d => d.name === value)?.bn_name || value;
  const bnUpazila = (value?: string) => upazilas.find(u => u.name === value)?.bn_name || value;
  const alive = (value: unknown) => value === undefined || value === null || value === "" ? undefined : value ? "জীবিত" : "মৃত";

  const gender = showField("gender") ? userData.gender : undefined;
  const biodataNo = `${gender === "male" ? "NG-" : gender === "female" ? "NB-" : ""}${userData.userId}`;
  const unlocked = !!userData.identityUnlocked;
  const a = userData.address, e = userData.educationInfo, f = userData.familyInfo, p = userData.personalInformation;
  const o = userData.occupational, w = userData.marriageInformationWomen, m = userData.marriageInformationMan, x = userData.expectedLifePartner;
  const area = [bnUpazila(a?.upazila), bnDistrict(a?.district)].filter(Boolean).join(", ");
  const maritalLabel = configFor("maritalStatus")?.options.find(opt => opt.value === String(userData.maritalStatus))?.label
    || marriedStatus.find(item => item.en === userData.maritalStatus)?.bn || userData.maritalStatus;

  const keyFacts = shown([
    { path: "age", label: "বয়স", value: userData.age ? `${toBn(userData.age)} বছর` : undefined },
    { path: "personalInformation.height", label: "উচ্চতা", value: p?.height ? formatHeight(p.height) : undefined },
    { path: "maritalStatus", label: "বৈবাহিক অবস্থা", value: maritalLabel },
    { path: "address.district", label: "জেলা", value: bnDistrict(a?.district) },
    { path: "occupational.profession", label: "পেশা", value: pick(professionOptions, o?.profession) },
    { path: "educationInfo.highestEducation", label: "শিক্ষা", value: e?.highestEducation },
  ]);
  const contactFacts = shown([
    { path: "name", label: "নাম", value: unlocked ? userData.name : undefined },
    { path: "fatherName", label: "পিতার নাম", value: userData.fatherName },
    { path: "motherName", label: "মাতার নাম", value: userData.motherName },
    { label: "মোবাইল", value: userData.phoneNumber },
    { path: "whatsapp", label: "WhatsApp", value: userData.whatsapp },
    { path: "guardianPhone", label: "অভিভাবকের নম্বর", value: userData.guardianPhone },
  ]);

  const sections: Section[] = ([
    { id: "basic", title: "মৌলিক তথ্য", icon: UserIcon, facts: [...shown([
      { path: "gender", label: "লিঙ্গ", value: gender ? (gender === "male" ? "পুরুষ" : "মহিলা") : undefined },
      { path: "maritalStatus", label: "বৈবাহিক অবস্থা", value: maritalLabel },
      { path: "age", label: "বয়স", value: userData.age ? `${toBn(userData.age)} বছর` : undefined },
      { path: "personalInformation.height", label: "উচ্চতা", value: p?.height ? formatHeight(p.height) : undefined },
      { path: "personalInformation.skinTone", label: "গাত্রবর্ণ", value: pick(skinColorOptions, p?.skinTone) },
      { path: "weight", label: "ওজন", value: userData.weight ? `${toBn(userData.weight)} কেজি` : undefined },
      { path: "bloodGroup", label: "রক্তের গ্রুপ", value: userData.bloodGroup },
      { path: "nationality", label: "জাতীয়তা", value: countries.find(item => item.en.trim() === userData.nationality)?.bn || userData.nationality },
    ]), ...extras(0)] },
    { id: "address", title: "ঠিকানা", icon: MapPin, facts: [...shown([
      { path: "address.permanentAddress", label: "স্থায়ী ঠিকানা", value: a?.permanentAddress || (area ? `${area}, বাংলাদেশ` : undefined) },
      { path: "address.presentAddress", label: "বর্তমান ঠিকানা", value: a?.presentAddress || (area ? `${area}, বাংলাদেশ` : undefined) },
      { path: "address.district", label: "জেলা", value: bnDistrict(a?.district) },
      { path: "address.upazila", label: "উপজেলা", value: bnUpazila(a?.upazila) },
      { path: "address.extraInfo", label: "কোথায় বড় হয়েছেন?", value: a?.extraInfo },
    ]), ...extras(1)] },
    { id: "education", title: "শিক্ষাগত যোগ্যতা", icon: GraduationCap, facts: [...shown([
      { path: "educationInfo.educationMethod", label: "শিক্ষা মাধ্যম", value: pick(educationMediumOptions, e?.educationMethod) },
      { path: "educationInfo.highestEducation", label: "সর্বোচ্চ শিক্ষাগত যোগ্যতা", value: e?.highestEducation },
      { path: "educationInfo.educationBackground", label: "শিক্ষাগত পটভূমি", value: e?.educationBackground },
      { path: "educationInfo.highestEducationBoard", label: "বিভাগ", value: e?.highestEducationBoard },
      { path: "educationInfo.highestEducationGroup", label: "বিষয়", value: e?.highestEducationGroup },
      { path: "educationInfo.highestEducationPassingYear", label: "পাসের সন", value: e?.highestEducationPassingYear },
      { path: "educationInfo.currentlyDoingHightEducation", label: "বর্তমান পড়াশোনা", value: e?.currentlyDoingHightEducation },
      { path: "educationInfo.sSCPassingYear", label: "এস.এস.সি / দাখিল পাসের সন", value: e?.sSCPassingYear },
      { path: "educationInfo.sSCPassingGroup", label: "এস.এস.সি বিভাগ", value: e?.sSCPassingGroup },
      { path: "educationInfo.sSCResult", label: "এস.এস.সি ফলাফল", value: e?.sSCResult },
      { path: "educationInfo.hSCPassingYear", label: "এইচ.এস.সি / আলিম পাসের সন", value: e?.hSCPassingYear },
      { path: "educationInfo.hSCPassingGroup", label: "এইচ.এস.সি বিভাগ", value: e?.hSCPassingGroup },
      { path: "educationInfo.hSCResult", label: "এইচ.এস.সি ফলাফল", value: e?.hSCResult },
    ]), ...extras(2)] },
    { id: "occupation", title: "পেশা", icon: Briefcase, facts: [...shown([
      { path: "occupational.profession", label: "পেশা", value: pick(professionOptions, o?.profession) },
      { path: "occupational.workingDetails", label: "পেশার বিস্তারিত", value: o?.workingDetails },
      { path: "occupational.salary", label: "মাসিক আয়", value: o?.salary },
    ]), ...extras(5)] },
    { id: "family", title: "পারিবারিক তথ্য", icon: House, facts: [...shown([
      { path: "familyInfo.isFatherAlive", label: "পিতা", value: alive(f?.isFatherAlive) },
      { path: "familyInfo.fathersProfession", label: "পিতার পেশা", value: f?.fathersProfession },
      { path: "familyInfo.isMotherAlive", label: "মাতা", value: alive(f?.isMotherAlive) },
      { path: "familyInfo.mothersProfession", label: "মাতার পেশা", value: f?.mothersProfession },
      { path: "familyInfo.brotherCount", label: "ভাই", value: f?.brotherCount !== undefined && f?.brotherCount !== null ? `${toBn(f.brotherCount)} জন` : undefined },
      { path: "familyInfo.brotherInformation", label: "ভাইদের তথ্য", value: f?.brotherInformation },
      { path: "familyInfo.sisterCount", label: "বোন", value: f?.sisterCount !== undefined && f?.sisterCount !== null ? `${toBn(f.sisterCount)} জন` : undefined },
      { path: "familyInfo.sisterInformation", label: "বোনদের তথ্য", value: f?.sisterInformation },
      { path: "familyInfo.familyFinancial", label: "পারিবারিক অর্থনৈতিক অবস্থা", value: pick(economicStatusOptions, f?.familyFinancial) },
      { path: "familyInfo.familyAssetDetails", label: "পারিবারিক সম্পদ", value: f?.familyAssetDetails },
      { path: "familyInfo.familyReligiousCondition", label: "পারিবারিক দ্বীনি পরিবেশ", value: f?.familyReligiousCondition },
    ]), ...extras(4)] },
    { id: "personal", title: "ব্যক্তিগত ও দ্বীনি তথ্য", icon: BookOpen, facts: [...shown([
      { path: "personalInformation.prayerFiverTimeFrom", label: "পাঁচ ওয়াক্ত নামাজ পড়েন?", value: p?.prayerFiverTimeFrom },
      { path: "personalInformation.MissPrayerTime", label: "সপ্তাহে কত ওয়াক্ত নামাজ কাযা হয়?", value: p?.MissPrayerTime },
      { path: "personalInformation.reciteQuran", label: "কুরআন তিলাওয়াত পারেন?", value: p?.reciteQuran },
      { path: "personalInformation.fiqhFollow", label: "অনুসৃত ফিকহ", value: pick(fiqhOptions, p?.fiqhFollow) },
      { path: "personalInformation.islamicStudy", label: "দ্বীনি শিক্ষা", value: pick(religiousEducationOptions, p?.islamicStudy) },
      { path: "personalInformation.outsideClothes", label: "বাইরে সাধারণত কী পোশাক পরেন?", value: p?.outsideClothes },
      ...(userData.gender === "female" ? [{ path: "personalInformation.womenNiqbYear", label: "কবে থেকে নিকাবসহ পর্দা করছেন?", value: p?.womenNiqbYear }] : []),
      ...(userData.gender === "male" ? [
        { path: "personalInformation.manBeard", label: "সুন্নতি দাড়ি আছে? কবে থেকে?", value: p?.manBeard },
        { path: "personalInformation.manClothAboveAnkels", label: "টাখনুর উপরে কাপড় পরেন?", value: p?.manClothAboveAnkels },
      ] : []),
      { path: "personalInformation.maharaNonMahram", label: "মাহরাম/নন-মাহরাম মেনে চলেন?", value: p?.maharaNonMahram },
      { path: "personalInformation.physicalStructure", label: "শারীরিক গড়ন", value: p?.physicalStructure },
      { path: "personalInformation.digitalMedia", label: "নাটক/সিনেমা/গান দেখেন বা শোনেন?", value: p?.digitalMedia },
      { path: "personalInformation.mentalOrPhysicalIssue", label: "শারীরিক বা মানসিক কোনো সমস্যা", value: p?.mentalOrPhysicalIssue },
      { path: "personalInformation.specialWorkOfDeen", label: "দ্বীনের বিশেষ মেহনতে যুক্ত?", value: p?.specialWorkOfDeen },
      { path: "personalInformation.majarBeliveStatus", label: "মাজার সম্পর্কে ধারণা", value: p?.majarBeliveStatus },
      { path: "personalInformation.islamicBookName", label: "পড়া ইসলামি বই", value: p?.islamicBookName },
      { path: "personalInformation.islamicScholarsName", label: "পছন্দের আলেম", value: p?.islamicScholarsName },
      { path: "personalInformation.extraInfoHobby", label: "শখ ও পছন্দ-অপছন্দ", value: p?.extraInfoHobby },
    ]), ...extras(3)] },
    { id: "marriage", title: "বিবাহ সম্পর্কিত তথ্য", icon: Gem, facts: [...shown([
      ...(w ? [
        { path: "marriageInformationWomen.isGuardiansAgreed", label: "অভিভাবক বিয়েতে রাজি?", value: w.isGuardiansAgreed },
        { path: "marriageInformationWomen.jobAfterMarriage", label: "বিয়ের পর চাকরি করতে চান?", value: w.jobAfterMarriage },
        { path: "marriageInformationWomen.studyAfterMarriage", label: "বিয়ের পর পড়াশোনা চালাতে চান?", value: w.studyAfterMarriage },
        { path: "marriageInformationWomen.thoughtsOnMarriage", label: "বিয়ে সম্পর্কে ধারণা", value: w.thoughtsOnMarriage },
        { path: "marriageInformationWomen.childCustody", label: "আগের সংসারের সন্তান থাকবে কার কাছে?", value: w.childCustody },
        { path: "marriageInformationWomen.polygamyConsentOptions", label: "বহুবিবাহে (মাসনা) রাজি?", value: pick(polygamyConsentOptions, w.polygamyConsentOptions) },
        { path: "marriageInformationWomen.caringforChildren", label: "সৎ সন্তানের দায়িত্ব নিতে প্রস্তুত?", value: w.caringforChildren },
      ] : []),
      ...(m ? [
        { path: "marriageInformationMan.isGuardiansAgreed", label: "অভিভাবক বিয়েতে রাজি?", value: m.isGuardiansAgreed },
        { path: "marriageInformationMan.wifeVailAfterMarriage", label: "বিয়ের পর স্ত্রীকে পর্দায় রাখতে পারবেন?", value: m.wifeVailAfterMarriage },
        { path: "marriageInformationMan.allowWifeStudyAfterMarriage", label: "স্ত্রীকে পড়াশোনা করতে দেবেন?", value: m.allowWifeStudyAfterMarriage },
        { path: "marriageInformationMan.wifeJobAfterMarriage", label: "স্ত্রীকে চাকরি করতে দেবেন?", value: m.wifeJobAfterMarriage },
        { path: "marriageInformationMan.livingPlaceAfterMarriage", label: "বিয়ের পর কোথায় থাকবেন?", value: m.livingPlaceAfterMarriage },
        { path: "marriageInformationMan.expectedAnyGiftFromMarriage", label: "পাত্রীপক্ষের কাছে উপহার আশা করেন?", value: m.expectedAnyGiftFromMarriage },
        { path: "marriageInformationMan.thoughtsOnMarriage", label: "বিয়ে সম্পর্কে ধারণা", value: m.thoughtsOnMarriage },
      ] : []),
    ]), ...extras(6)] },
    { id: "partner", title: "যেমন জীবনসঙ্গী চান", icon: HeartHandshake, facts: [...shown([
      { path: "expectedLifePartner.age", label: "বয়স", value: x?.age },
      { path: "expectedLifePartner.complexion", label: "গাত্রবর্ণ", value: x?.complexion },
      { path: "expectedLifePartner.height", label: "উচ্চতা", value: x?.height },
      { path: "expectedLifePartner.education", label: "শিক্ষাগত যোগ্যতা", value: x?.education },
      { path: "expectedLifePartner.district", label: "জেলা", value: bnDistrict(x?.district) },
      { path: "expectedLifePartner.upazila", label: "উপজেলা", value: bnUpazila(x?.upazila) },
      { path: "expectedLifePartner.maritalStatus", label: "বৈবাহিক অবস্থা", value: marriedStatus.find(item => item.en === x?.maritalStatus)?.bn || x?.maritalStatus },
      { path: "expectedLifePartner.profession", label: "পেশা", value: x?.profession },
      { path: "expectedLifePartner.financialCondition", label: "অর্থনৈতিক অবস্থা", value: x?.financialCondition },
      { path: "expectedLifePartner.expectedQuality", label: "যে গুণাবলি আশা করেন", value: x?.expectedQuality },
    ]), ...extras(7)] },
    { id: "extra", title: questionSchema.sections[8]?.title || "অতিরিক্ত তথ্য", icon: MessageCircle, facts: extras(8) },
    { id: "pledge", title: questionSchema.sections[9]?.title || "অঙ্গীকার", icon: ShieldCheck, facts: extras(9) },
  ] as Section[]).filter(section => section.facts.length);

  const requireLogin = () => {
    if (user?._id) return true;
    toast("আগে লগইন করুন", { description: "লগইন করার পর এই কাজটি করতে পারবেন।" });
    router.push("/login");
    return false;
  };
  const scrollTopics = (direction: -1 | 1) => {
    const rail = topicRailRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.8, 150),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };
  const scrollTo = (target: string) => document.getElementById(target)?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start",
  });
  const visitSection = (target: string) => {
    setClosedSections(previous => {
      if (!previous.has(target)) return previous;
      const next = new Set(previous);
      next.delete(target);
      return next;
    });
    window.requestAnimationFrame(() => scrollTo(target));
  };
  const toggleSection = (target: string) => setClosedSections(previous => {
    const next = new Set(previous);
    if (next.has(target)) next.delete(target);
    else next.add(target);
    return next;
  });
  const allOpen = sections.every(section => !closedSections.has(section.id));
  const toggleAll = () => setClosedSections(allOpen ? new Set(sections.map(section => section.id)) : new Set());
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `বায়োডাটা ${biodataNo}`, url });
      else { await navigator.clipboard.writeText(url); toast.success("লিংক কপি হয়েছে"); }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error("শেয়ার করা যায়নি। আবার চেষ্টা করুন।");
    }
  };
  const copyNumber = () => void navigator.clipboard.writeText(biodataNo).then(
    () => toast.success("বায়োডাটা নম্বর কপি হয়েছে"),
    () => toast.error("কপি করা যায়নি"),
  );
  const onContact = () => {
    if (unlocked) { scrollTo("contact"); return; }
    if (requireLogin()) setUnlockOpen(true);
  };
  const unlock = async () => {
    if (!user?._id || !userData._id) return;
    setCheckingAccess(true);
    try {
      const currentUser = await queryClient.fetchQuery({
        queryKey: ["number-request-user-profile", user._id],
        queryFn: () => GetRequestNormal<User>("/user/get-my-profile", 0, "number-request-user-profile"),
        staleTime: 0,
      });
      if (!userData.identityUnlocked && (currentUser?.numberOfConnections ?? 0) <= 0) {
        toast("আপনার কোনো কানেকশন নেই", { description: "প্যাকেজ বেছে নিয়ে কানেকশন কিনুন।" });
        router.push("/#pricing");
        return;
      }
      const result = await requestPhone({ userId: currentUser._id ?? user._id, requestUserId: userData._id });
      if (result?.data) {
        await refetch();
        await Promise.all(["number-request-user-profile", "get-my-profile", "get-my-profile-for-success"].map(key =>
          queryClient.invalidateQueries({ queryKey: [key], exact: false })));
        window.setTimeout(() => scrollTo("contact"), 300);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "কিছু একটা সমস্যা হয়েছে");
    } finally { setCheckingAccess(false); }
  };
  const sendReport = async () => {
    if (!requireLogin()) return;
    setReporting(true);
    const message = reportText.trim() ? `${reportReason}: ${reportText.trim()}` : reportReason;
    const [result, error] = await PostRequestAxios("/platform/request/report", { targetId: userData._id, message });
    setReporting(false);
    if (result) { toast.success("রিপোর্ট পাঠানো হয়েছে। আমাদের টিম দেখবে।"); setReportOpen(false); setReportText(""); }
    else toast.error(error?.message || "রিপোর্ট পাঠানো যায়নি");
  };

  const avatar = gender ? (gender === "male" ? "/male.png" : "/female.png") : null;
  const likeButton = (full: boolean) => <button type="button" onClick={() => { if (requireLogin()) shortlist({ shortlistedUserId: id }); }} disabled={shortlisting}
    className={"inline-flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-pink-200 bg-white px-3 py-3 font-bold text-primary transition-colors hover:bg-pink-50 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60 " + (full ? "w-full text-[15px]" : "text-[12px] sm:text-sm")}>
    {shortlisting ? <Loader2 className="size-4 animate-spin" /> : <Heart className="size-4" />}
    {full ? "পছন্দের তালিকায় রাখুন" : "পছন্দে রাখুন"}
  </button>;
  const contactButton = <button type="button" onClick={onContact} disabled={unlocking}
    className="flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-[14px] font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60">
    {unlocking ? <Loader2 className="size-5 shrink-0 animate-spin" /> : unlocked ? <Phone className="size-5 shrink-0" /> : <Lock className="size-5 shrink-0" />}
    {unlocked ? "নম্বর দেখুন" : "নম্বর আনলক করুন"}
  </button>;

  return <div className="min-h-screen bg-white pb-32 text-gray-900 lg:pb-12">
    <div className="mx-auto max-w-6xl px-3 pt-4 sm:px-5 lg:pt-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/biodata" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-white hover:text-primary focus-visible:outline-2 focus-visible:outline-rose-500">
          <ArrowLeft className="size-4" aria-hidden /> সব বায়োডাটায় ফিরে যান
        </Link>
        <span className="hidden text-xs font-medium text-gray-600 sm:block">বায়োডাটা দেখুন • বুঝুন • তারপর সিদ্ধান্ত নিন</span>
      </div>

      <div className="lg:grid lg:grid-cols-[332px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <aside className="space-y-4 lg:sticky lg:top-24">
          <section aria-label="বায়োডাটা সারসংক্ষেপ" className="overflow-hidden rounded-[28px] border border-pink-100 bg-white shadow-[0_14px_45px_-28px_rgba(83,39,58,.3)]">
            <div className="relative overflow-hidden bg-primary px-5 pb-9 pt-4 text-white">
              <span aria-hidden className="pointer-events-none absolute -right-12 -top-14 size-44 rounded-full border border-white/15" />
              <span aria-hidden className="pointer-events-none absolute -right-2 -top-6 size-36 rounded-full border border-white/10" />
              <div className="relative flex items-center justify-between gap-3">
                <span className="text-[13px] font-bold text-white/95">নিখাহা · বায়োডাটা</span>
                <button type="button" onClick={() => void share()} aria-label="বায়োডাটা শেয়ার করুন" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white">
                  <Share2 className="size-4" aria-hidden /> শেয়ার
                </button>
              </div>
              <p className="relative mt-3 text-[15px] font-semibold text-white">এক নজরে পরিচয়</p>
              <p className="relative mt-0.5 text-[13px] leading-5 text-white/95">গুরুত্বপূর্ণ তথ্যগুলো আগে দেখুন</p>
            </div>

            <div className="relative -mt-7 rounded-t-[24px] bg-white px-4 pb-5 sm:px-5">
              <div className="flex items-end justify-between gap-3">
                <div className="flex size-[74px] shrink-0 items-center justify-center overflow-hidden rounded-[22px] border-[5px] border-white bg-pink-50 shadow-[0_4px_16px_-10px_rgba(50,26,37,.3)]">
                  {avatar ? <Image src={avatar} alt="প্রতীকী প্রোফাইল ছবি" width={64} height={64} className="size-[62px] object-contain" /> : <Heart className="size-8 text-primary" aria-hidden />}
                </div>
                <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                  <ShieldCheck className="size-3.5" aria-hidden /> ব্যক্তিগত তথ্য সুরক্ষিত
                </span>
              </div>

              <h1 className="mt-3 text-[22px] font-bold leading-8 text-gray-900 sm:text-2xl">
                {unlocked && showField("name") && userData.name ? userData.name : gender === "male" ? "পাত্রের বায়োডাটা" : gender === "female" ? "পাত্রীর বায়োডাটা" : "বায়োডাটা পরিচিতি"}
              </h1>
              {!unlocked && <p className="mt-0.5 flex items-center gap-1.5 text-[13px] leading-6 text-gray-600"><Lock className="size-3.5" aria-hidden /> নাম দেখতে যোগাযোগ আনলক করতে হবে</p>}

              <button type="button" onClick={copyNumber} title="বায়োডাটা নম্বর কপি করুন" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-pink-50 px-3.5 text-sm font-bold text-primary transition-colors hover:bg-pink-100 focus-visible:outline-2 focus-visible:outline-rose-500">
                নং {biodataNo} <Copy className="size-3.5" aria-hidden /> <span className="sr-only">কপি করুন</span>
              </button>

              <div className="mt-3 flex flex-wrap gap-2">
                {gender && <span className="rounded-full border border-pink-100 bg-white px-3 py-1 text-xs font-semibold text-gray-600">{gender === "male" ? "পাত্র" : "পাত্রী"}</span>}
                {userData.isVerified && <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-gray-600"><BadgeCheck className="size-3.5" aria-hidden /> যাচাইকৃত</span>}
                {showPremiumBadge && userData.isSubscriber && <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-gray-600"><Crown className="size-3.5" aria-hidden /> প্রিমিয়াম</span>}
              </div>

              {keyFacts.length > 0 && <>
                <div className="mt-5 flex items-center gap-2"><span className="h-px flex-1 bg-pink-100" /><span className="text-[11px] font-bold tracking-wide text-primary">মূল তথ্য</span><span className="h-px flex-1 bg-pink-100" /></div>
                <dl className="mt-3 grid grid-cols-2 gap-2">
                  {keyFacts.map(fact => <div key={fact.label} className="min-w-0 rounded-[14px] border border-pink-100 bg-pink-50/40 px-3 py-2.5">
                    <dt className="text-xs font-medium text-gray-600">{fact.label}</dt>
                    <dd className="mt-1 line-clamp-2 break-words text-[14px] font-bold leading-6 text-gray-900" dir="auto">{fact.value}</dd>
                  </div>)}
                </dl>
              </>}

              <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
                <button type="button" onClick={() => visitSection("basic")} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-[13px] font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-rose-500">
                  বিস্তারিত পড়ুন <ChevronDown className="size-4" aria-hidden />
                </button>
                {sections.some(section => section.id === "partner") && <button type="button" onClick={() => visitSection("partner")} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-pink-100 px-2 text-[13px] font-semibold text-primary hover:bg-pink-50 focus-visible:outline-2 focus-visible:outline-rose-500">
                  জীবনসঙ্গীর প্রত্যাশা
                </button>}
              </div>

              <div className="mt-5 hidden space-y-2 border-t border-pink-100 pt-5 lg:block">
                <div className="flex">{contactButton}</div>
                {likeButton(true)}
                <button type="button" onClick={() => { if (requireLogin()) setReportOpen(true); }} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-pink-50">
                  <Flag className="size-4" aria-hidden /> প্রোফাইল রিপোর্ট করুন
                </button>
              </div>
            </div>
          </section>

          <div className="hidden rounded-[22px] border border-pink-100 bg-white px-5 py-4 shadow-sm lg:block">
            <p className="flex items-center gap-2 font-bold text-gray-900"><HeartHandshake className="size-5 text-primary" aria-hidden /> সিদ্ধান্ত নেওয়ার আগে</p>
            <ol className="mt-3 space-y-3 text-[13px] leading-6 text-gray-600">
              <li>১. প্রোফাইলের তথ্যগুলো ভালোভাবে পড়ুন।</li>
              <li>২. পছন্দ হলে সংরক্ষণ করে পরিবারের সাথে আলোচনা করুন।</li>
              <li>৩. আগ্রহী হলে যোগাযোগ আনলক করুন।</li>
            </ol>
          </div>
        </aside>

        <main className="mt-5 min-w-0 space-y-4 lg:mt-0">
          <header className="px-1 pb-1 pt-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">বিস্তারিত পরিচিতি</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-[22px] font-bold leading-9 text-gray-900 sm:text-[26px]">প্রোফাইলের সব তথ্য</h2>
                <p className="mt-1 text-[13px] leading-6 text-gray-600">সব তথ্য নিচে খোলা আছে। পছন্দের বিষয়ে চাপ দিয়ে সরাসরি সেখানে যান।</p>
              </div>
              {sections.length > 1 && <button type="button" onClick={toggleAll} className="min-h-10 shrink-0 rounded-xl border border-pink-100 bg-white px-3 text-[12px] font-bold text-primary hover:bg-pink-50 focus-visible:outline-2 focus-visible:outline-rose-500">
                {allOpen ? "সব বন্ধ করুন" : "সব তথ্য দেখুন"}
              </button>}
            </div>
          </header>

          {sections.length > 1 && <nav id="biodata-topics" aria-label="বায়োডাটার বিষয়ভিত্তিক তালিকা" className="scroll-mt-24 rounded-2xl border border-pink-100 bg-white px-3 py-3 sm:px-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[16px] font-bold leading-6 text-gray-900">যে তথ্য চান, বেছে নিন</h3>
                <p className="text-[12px] leading-5 text-gray-600">ডানে-বামে সরান, তারপর চাপ দিন ↔</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => scrollTopics(-1)} disabled={!topicScroll.left} aria-label="আগের বিভাগ দেখুন"
                  className="flex size-9 items-center justify-center rounded-xl border border-pink-200 bg-white text-primary hover:bg-pink-50 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-35">
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
                <button type="button" onClick={() => scrollTopics(1)} disabled={!topicScroll.right} aria-label="পরের বিভাগ দেখুন"
                  className="flex size-9 items-center justify-center rounded-xl border border-pink-200 bg-white text-primary hover:bg-pink-50 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-35">
                  <ChevronRight className="size-5" aria-hidden />
                </button>
              </div>
            </div>
            <div className="relative">
              <div ref={topicRailRef} tabIndex={0} role="group" aria-label="বিষয়গুলো আঙুল দিয়ে পাশে সরান"
                className="flex snap-x snap-proximity items-center gap-2 overflow-x-auto overscroll-x-contain whitespace-nowrap pb-1 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {sections.map(section => {
                  const Icon = section.icon;
                  return <button key={section.id} type="button" onClick={() => visitSection(section.id)}
                    aria-label={section.title + " অংশে যান"}
                    className="inline-flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-xl border border-pink-200 bg-pink-50/50 px-3 py-2 text-[14px] font-semibold text-gray-900 transition-colors hover:border-primary/50 hover:bg-pink-100 focus-visible:outline-2 focus-visible:outline-primary">
                    <Icon className="size-[18px] shrink-0 text-primary" aria-hidden />
                    <span>{section.title}</span>
                  </button>;
                })}
              </div>
              {topicScroll.left && <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-white to-transparent" />}
              {topicScroll.right && <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent" />}
            </div>
          </nav>}

          {sections.map(section => <SectionCard key={section.id} section={section} expanded={!closedSections.has(section.id)} onToggle={() => toggleSection(section.id)} showTopicLink={sections.length > 1} />)}

          <section className="rounded-[22px] border border-pink-100 bg-pink-50/60 px-5 py-5 lg:hidden">
            <h2 className="flex items-center gap-2 text-[17px] font-bold text-gray-900"><HeartHandshake className="size-5" aria-hidden /> এরপর কী করবেন?</h2>
            <ol className="mt-3 space-y-2.5 text-[14px] leading-6 text-gray-700">
              <li><b>১.</b> প্রোফাইলের তথ্যগুলো ভালোভাবে পড়ুন।</li>
              <li><b>২.</b> পছন্দ হলে তালিকায় রাখুন এবং পরিবারকে দেখান।</li>
              <li><b>৩.</b> সিদ্ধান্ত নিলে যোগাযোগ আনলক করুন।</li>
            </ol>
          </section>

          <section id="contact" className={`scroll-mt-24 rounded-[24px] border border-pink-100 p-5 shadow-[0_8px_36px_-24px_rgba(40,70,52,.18)] sm:p-6 ${unlocked ? "bg-white" : "bg-gradient-to-br from-pink-50 via-white to-white"}`}>
            <h2 className="flex items-center gap-2.5 text-xl font-bold text-gray-900">
              <span className={`flex size-9 items-center justify-center rounded-xl ${unlocked ? "bg-emerald-50 text-primary" : "bg-white text-primary shadow-sm"}`}>
                {unlocked ? <Check className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              </span>
              পরিচয় ও যোগাযোগ
            </h2>
            {unlocked ? <>
              <p className="mt-1 text-sm text-primary">আনলক করা আছে। অভিভাবকের মাধ্যমে সম্মানের সাথে যোগাযোগ করুন।</p>
              {contactFacts.length ? <div className="mt-2 divide-y divide-gray-100">
                {contactFacts.map(fact => {
                  const phone = /মোবাইল|WhatsApp|নম্বর/.test(fact.label) && /\d{6,}/.test(fact.value.replace(/\D/g, ""));
                  const isWhatsapp = fact.label.includes("WhatsApp");
                  return <div key={fact.label} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-gray-500">{fact.label}</p>
                      <p className="break-words text-[15px] font-semibold text-gray-900" dir="auto">{fact.value}</p>
                    </div>
                    {phone && <a href={isWhatsapp ? whatsappUrl(fact.value) : `tel:${fact.value.replace(/[^\d+]/g, "")}`} target={isWhatsapp ? "_blank" : undefined} rel="noopener noreferrer"
                      className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary">
                      {isWhatsapp ? <MessageCircle className="h-4 w-4" /> : <Phone className="h-4 w-4" />}{isWhatsapp ? "মেসেজ" : "কল"}
                    </a>}
                  </div>;
                })}
              </div> : <p className="mt-3 text-sm text-gray-600">এই সদস্য এখনো যোগাযোগের তথ্য যোগ করেননি।</p>}
            </> : <>
              <p className="mt-2 text-[15px] leading-7 text-gray-700">নাম, পিতা-মাতার নাম ও মোবাইল নম্বর গোপন রাখা আছে। দেখতে <b className="text-primary">১টি কানেকশন</b> লাগবে।</p>
              <div aria-hidden className="mt-3 space-y-2 select-none">
                {["মোবাইল", "অভিভাবকের নম্বর"].map(label => <div key={label} className="flex items-center justify-between rounded-xl border border-pink-100 bg-white px-3 py-2.5">
                  <span className="text-[13px] text-gray-500">{label}</span><span className="font-mono text-sm tracking-widest text-gray-300 blur-[3px]">01•••••••••</span>
                </div>)}
              </div>
              <button type="button" onClick={onContact} disabled={unlocking}
                className="mt-4 flex w-full items-center justify-center gap-2 min-h-12 rounded-2xl bg-primary px-5 py-3 font-bold text-white hover:bg-primary disabled:opacity-60 sm:w-auto sm:px-6">
                {unlocking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />} আনলক করুন (১ কানেকশন)
              </button>
              <p className="mt-3 text-sm text-gray-500">কানেকশন নেই? <Link href="/#pricing" className="font-semibold text-primary underline">প্যাকেজ দেখুন</Link></p>
            </>}
          </section>


          <button type="button" onClick={() => { if (requireLogin()) setReportOpen(true); }}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-white focus-visible:outline-2 focus-visible:outline-rose-500 lg:hidden">
            <Flag className="size-4" aria-hidden /> কোনো সমস্যা দেখছেন? রিপোর্ট করুন
          </button>
        </main>
      </div>
    </div>

    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-pink-100 bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2.5 shadow-[0_-5px_24px_-14px_rgba(42,18,30,.18)] backdrop-blur-md lg:hidden">
      <div className="mx-auto max-w-xl">
        {!unlocked && <p className="mb-2 text-center text-[11px] font-semibold text-gray-600">নম্বর দেখতে ১টি কানেকশন লাগবে</p>}
        <div className="flex items-center gap-2">
          {likeButton(false)}
          {contactButton}
        </div>
      </div>
    </div>

    <AlertDialog open={unlockOpen} onOpenChange={setUnlockOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>যোগাযোগ আনলক করবেন?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-[15px] leading-6">
              <p>বায়োডাটা নং {biodataNo} এর নাম, পিতা-মাতার নাম ও মোবাইল নম্বর দেখতে আপনার <b className="text-primary">১টি কানেকশন</b> খরচ হবে।</p>
              <p className="text-sm text-gray-500">একবার আনলক করলে পরে আবার দেখতে নতুন কানেকশন লাগবে না।</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>না, এখন না</AlertDialogCancel>
          <AlertDialogAction onClick={() => void unlock()} disabled={unlocking} className="bg-primary hover:bg-primary">হ্যাঁ, আনলক করুন</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={reportOpen} onOpenChange={setReportOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>প্রোফাইল রিপোর্ট করুন</DialogTitle>
          <DialogDescription>কী সমস্যা দেখছেন জানান। আপনার নাম প্রোফাইলের মালিককে জানানো হবে না।</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2" role="radiogroup" aria-label="রিপোর্টের কারণ">
            {REPORT_REASONS.map(reason => <label key={reason} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm ${reportReason === reason ? "border-pink-500 bg-pink-50" : "border-gray-200"}`}>
              <input type="radio" name="report-reason" checked={reportReason === reason} onChange={() => setReportReason(reason)} className="accent-pink-600" />{reason}
            </label>)}
          </div>
          <textarea value={reportText} onChange={event => setReportText(event.target.value)} rows={3} maxLength={1000} dir="auto"
            placeholder="বিস্তারিত লিখুন (ঐচ্ছিক)" className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm outline-none focus:border-pink-400" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setReportOpen(false)} className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">বাতিল</button>
            <button type="button" onClick={() => void sendReport()} disabled={reporting}
              className="inline-flex items-center gap-2 rounded-full bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-60">
              {reporting && <Loader2 className="h-4 w-4 animate-spin" />} রিপোর্ট পাঠান
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
