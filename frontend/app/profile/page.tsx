"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  AlertCircle, BadgeCheck, Bookmark, Check, ChevronRight, Copy, Eye, EyeOff, IdCard, Loader2, Mail, Pencil, Phone,
  Settings, ShieldCheck, Sparkles, Trash2, User as UserIcon, Users, Heart, HeartHandshake,
} from "lucide-react";
import { toast } from "sonner";
import PlatformOverview from "@/components/custom/profile/PlatformOverview";
import BiodataProgressPanel from "@/components/custom/profile/BiodataProgressPanel";
import BiodataDeletionPanel from "@/components/custom/profile/BiodataDeletionPanel";
import { currentBiodataStage } from "@/lib/biodata-status";
import { UserType, User as ProfileUser } from "@/@types/user";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";

export interface UserInfo {
  _id: string;
  name: string;
  userId: string;
  role: UserType;
  email: string;
  phoneNumber: string;
  password: string;
  isOtpVerified: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "অ্যাডমিন", manager: "ম্যানেজার", seo: "SEO এডিটর", blog: "ব্লগ এডিটর", editor: "এডিটর",
};

function Pill({ tone, children }: { tone: "green" | "gray" | "red" | "pink"; children: React.ReactNode }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    gray: "bg-gray-100 text-gray-700 ring-gray-500/20",
    red: "bg-red-50 text-red-700 ring-red-600/20",
    pink: "bg-pink-50 text-pink-700 ring-pink-600/20",
  } as const;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>{children}</span>;
}

function InfoItem({ icon, label, value, action }: { icon: React.ReactNode; label: string; value: React.ReactNode; action?: React.ReactNode }) {
  return <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4">
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-600">{icon}</span>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-gray-500">{label}</p>
      <div className="mt-0.5 break-words text-[15px] font-semibold text-gray-900">{value}</div>
    </div>
    {action}
  </div>;
}

const quickLinks = [
  { href: "/profile/matches", label: "Find My Matches", hint: "আপনার প্রত্যাশা অনুযায়ী বায়োডাটা ও মিলের কারণ দেখুন", icon: Sparkles },
  { href: "/profile/ai-profile", label: "AI দিয়ে বায়োডাটা", hint: "প্রশ্নের উত্তর দিয়ে দ্রুত পূরণ করুন", icon: Sparkles },
  { href: "/profile/short-list", label: "My Favourites", hint: "আমি যাদের Favourite করেছি", icon: Heart },
  { href: "/profile/favourited-me", label: "Who Favourited Me", hint: "যারা আমার বায়োডাটা Favourite করেছেন", icon: HeartHandshake },
  { href: "/profile/numbers", label: "আমার সংযোগ", hint: "যাদের যোগাযোগ নম্বর পেয়েছেন", icon: Users },
  { href: "/profile/settings", label: "প্রোফাইল সেটিংস", hint: "পাসওয়ার্ড, ফোন ও ইমেইল", icon: Settings },
] as const;

const User = () => {
  const router = useRouter();
  const { data: user, isLoading, refetch } = useQueryWrapper<ProfileUser>(["get-my-profile-for-success"], "/user/get-my-profile");

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-3 text-gray-600"><Loader2 className="h-9 w-9 animate-spin text-pink-500" /> তথ্য লোড হচ্ছে...</div>
  </div>;

  if (!user) return <div className="min-h-[60vh] bg-gray-50 px-4 py-10">
    <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-gray-400" />
      <p className="mt-3 text-gray-700">আপনার তথ্য পাওয়া যায়নি। পেজটি আবার লোড করুন।</p>
      <button type="button" onClick={() => refetch()} className="mt-4 rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700">আবার চেষ্টা করুন</button>
    </div>
  </div>;

  const stage = currentBiodataStage(user);
  const staffRole = user.role && ROLE_LABEL[String(user.role)];
  const avatar = user.gender ? (String(user.gender).toLowerCase() === "male" ? "/male.png" : "/female.png") : null;
  const copyId = () => {
    if (!user.userId) return;
    void navigator.clipboard.writeText(String(user.userId)).then(() => toast.success("বায়োডাটা নম্বর কপি হয়েছে"), () => toast.error("কপি করা যায়নি"));
  };

  return <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm">
        <div className="h-16 bg-pink-50 sm:h-20" aria-hidden />
        <div className="-mt-10 flex flex-col gap-4 px-5 pb-5 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-end gap-4">
            <div className="size-20 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-pink-100 shadow-sm sm:size-24">
              {avatar ? <Image src={avatar} alt="" width={96} height={96} className="size-full object-cover" />
                : <span className="flex size-full items-center justify-center text-pink-600"><UserIcon className="h-9 w-9" /></span>}
            </div>
            <div className="min-w-0 pb-1">
              <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">{user.name || "আপনার প্রোফাইল"}</h1>
              {user.userId && <button type="button" onClick={copyId} className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-pink-700" title="কপি করুন">
                বায়োডাটা নং <span className="font-mono font-semibold text-gray-700">#{user.userId}</span><Copy className="h-3.5 w-3.5" />
              </button>}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {stage !== "deleted" && <button type="button" onClick={() => router.push("/profile/my-profile")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pink-700">
              <Pencil className="h-4 w-4" /> বায়োডাটা এডিট করুন
            </button>}
            {stage === "published" && user.userId && <button type="button" onClick={() => router.push(`/biodata/${user.userId}`)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <Eye className="h-4 w-4" /> অন্যরা যেমন দেখে
            </button>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-gray-100 px-5 py-3 sm:px-6">
          {user.isOtpVerified ? <Pill tone="green"><BadgeCheck className="h-3.5 w-3.5" /> অ্যাকাউন্ট যাচাইকৃত</Pill>
            : <Pill tone="red"><AlertCircle className="h-3.5 w-3.5" /> অ্যাকাউন্ট যাচাই করা হয়নি</Pill>}
          {stage === "published" ? <Pill tone="green"><Eye className="h-3.5 w-3.5" /> Published · প্রকাশিত</Pill>
            : stage === "under_review" ? <Pill tone="pink"><ShieldCheck className="h-3.5 w-3.5" /> Under Review · যাচাই হচ্ছে</Pill>
              : stage === "rejected" ? <Pill tone="red"><AlertCircle className="h-3.5 w-3.5" /> সংশোধন প্রয়োজন</Pill>
                : stage === "deleted" ? <Pill tone="red"><Trash2 className="h-3.5 w-3.5" /> বায়োডাটা সরানো হয়েছে</Pill>
                  : <Pill tone="gray"><EyeOff className="h-3.5 w-3.5" /> খসড়া</Pill>}
          {staffRole && <Pill tone="pink"><ShieldCheck className="h-3.5 w-3.5" /> {staffRole}</Pill>}

        </div>
      </section>

      {!staffRole && <BiodataProgressPanel profile={user} />}

      <PlatformOverview />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">অ্যাকাউন্টের তথ্য</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoItem icon={<UserIcon className="h-5 w-5" />} label="নাম" value={user.name || <span className="text-gray-400">দেওয়া হয়নি</span>} />
            <InfoItem icon={<IdCard className="h-5 w-5" />} label="বায়োডাটা নম্বর" value={user.userId ? <span className="font-mono">#{user.userId}</span> : <span className="text-gray-400">নেই</span>}
              action={user.userId ? <button type="button" onClick={copyId} aria-label="বায়োডাটা নম্বর কপি করুন" className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><Copy className="h-4 w-4" /></button> : undefined} />
            <InfoItem icon={<Mail className="h-5 w-5" />} label="ইমেইল" value={user.email || <span className="text-gray-400">যুক্ত করা হয়নি</span>} />
            <InfoItem icon={<Phone className="h-5 w-5" />} label="ফোন নম্বর" value={user.phoneNumber || <span className="text-gray-400">যুক্ত করা হয়নি</span>} />
            <InfoItem icon={<Users className="h-5 w-5" />} label="বাকি কানেকশন" value={(user.numberOfConnections ?? 0).toLocaleString("bn-BD")}
              action={<Link href="/profile/numbers" className="self-center text-xs font-semibold text-pink-700 hover:underline">দেখুন</Link>} />
            <InfoItem icon={<ShieldCheck className="h-5 w-5" />} label="অ্যাকাউন্টের ধরন" value={staffRole || "সদস্য"} />
          </div>
          <p className="mt-4 text-xs text-gray-500">ফোন, ইমেইল বা পাসওয়ার্ড বদলাতে <Link href="/profile/settings" className="font-medium text-pink-700 underline">প্রোফাইল সেটিংস</Link> এ যান।</p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">দ্রুত যান</h2>
          <ul className="space-y-1">
            {quickLinks.filter(item => user.role === UserType.USER || !["/profile/matches", "/profile/short-list", "/profile/favourited-me"].includes(item.href)).map(item => {
              const Icon = item.icon;
              return <li key={item.href}>
                <Link href={item.href as Route} className="group flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-pink-50">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 group-hover:bg-white group-hover:text-pink-600"><Icon className="h-4.5 w-4.5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-900">{item.label}</span>
                    <span className="block truncate text-xs text-gray-500">{item.hint}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-pink-600" />
                </Link>
              </li>;
            })}
          </ul>
        </section>
      </div>

      {user.role === UserType.USER && <BiodataDeletionPanel deleted={stage === "deleted"} />}
    </div>

  </div>;
};

export default User;
