"use client";

import Link from "next/link";
import type { Route } from "next";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ChevronRight, Clock3, Facebook, Instagram, Linkedin, Mail, MapPin, Phone, FileText,
} from "lucide-react";
import { FaTiktok } from "react-icons/fa6";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { DEFAULT_NIQAHA_TIKTOK, normalizeTikTokProfile } from "@/lib/tiktok-profile";
import { contacts } from "@/lib/contact-config";
import { cn } from "@/lib/utils";
import PolicyLinks from "./PolicyLinks";

const navItems = [
  { label: "হোম", href: "/" },
  { label: "আমাদের সম্পর্কে", href: "/about" },
  { label: "জিজ্ঞাসা", href: "/biodata" },
  { label: "ব্লগ", href: "/blog" },
  { label: "নির্দেশনা", href: "/guidelines" },
  { label: "যোগাযোগ", href: "/contact" },
];

const socialLinks = [
  { name: "Facebook", href: "https://www.facebook.com/share/18CQA5bDtn/", icon: Facebook },
  { name: "Phone", href: "tel:" + contacts.general, icon: Phone },
  { name: "Instagram", href: "https://www.instagram.com/niqaha.combd?igsh=MWw3dzVyYXE5cjY2MQ==", icon: Instagram },
];

// Restrained accent color: pink indicates interaction rather than coloring all text.
const socialButton =
  "group inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-500/40 bg-white/[0.045] text-slate-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-300/70 hover:bg-rose-400/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300";
const contactLink =
  "group flex min-w-0 items-start gap-3 text-[14px] font-medium leading-6 text-slate-200 transition-colors hover:text-white sm:text-[15px] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300";
const contactIcon = "mt-0.5 size-[18px] shrink-0 text-rose-300";
const heading = "font-sans text-[18px] font-bold tracking-tight text-white sm:text-[19px]";

type FooterSettings = { tiktokUrl?: string; tradeLicenseNumber?: string };

export default function Footer() {
  const pathname = usePathname();
  const { data } = useQueryWrapper<FooterSettings>(
    ["public-settings"], "/public/settings", { staleTime: 60000 },
  );
  const tiktok = normalizeTikTokProfile(data?.tiktokUrl ?? DEFAULT_NIQAHA_TIKTOK);
  const tradeLicense = (data?.tradeLicenseNumber ?? "").trim();
  const hide = pathname.startsWith("/profile") || pathname.startsWith("/dashboard");

  return (
    <footer id="site-footer" data-visual-global="true" className={cn(
      "relative isolate overflow-hidden bg-[#121D2D] text-slate-200",
      hide && "hidden",
    )}>
      {/* Warm brand detailing on an otherwise quiet midnight-blue surface. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-rose-500 via-pink-400 to-[#121D2D]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(244,114,182,0.095),transparent_43%)]" />
      <div className="container relative mx-auto max-w-7xl px-5 pb-6 pt-11 sm:px-6 sm:pt-14 lg:px-8 lg:pt-16">
        <div className="grid items-start gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.6fr)_minmax(0,.9fr)] lg:gap-x-14">
          <section aria-label="Niqaha সম্পর্কে" className="min-w-0 text-left">
            <Link href="/" className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300">
              <Image src="/logo.png" width={56} height={56} alt="Niqaha logo"
                className="size-12 rounded-xl bg-white p-1.5 object-contain shadow-[0_4px_18px_rgba(0,0,0,.1)]" />
              <span className="font-heading text-[30px] font-bold tracking-wide text-white">niqaha</span>
            </Link>
            <p className="mt-5 max-w-[430px] text-[14px] font-normal leading-7 text-slate-300 sm:text-[15px]">
              ইসলামিক মূল্যবোধ ও আধুনিক প্রযুক্তির সমন্বয়ে বিশ্বস্ত বিবাহ সেবা
              প্রদানকারী প্ল্যাটফর্ম।
            </p>
            <div className="mt-6 space-y-3.5">
              <a href={"mailto:" + contacts.email} className={contactLink}>
                <Mail className={contactIcon} aria-hidden />
                <span className="break-all">{contacts.email}</span>
              </a>
              <a href={"tel:" + contacts.general} className={contactLink}>
                <Phone className={contactIcon} aria-hidden />
                <span>01748919251 <span className="text-[12px] text-slate-400">— শুধু কল</span></span>
              </a>
              <p className="flex min-w-0 items-start gap-3 text-[14px] font-medium leading-6 text-slate-200 sm:text-[15px]">
                <MapPin className={contactIcon} aria-hidden />
                <span>{contacts.address}</span>
              </p>
            </div>
            {tradeLicense && (
              <div aria-label="প্রতিষ্ঠানের ট্রেড লাইসেন্স নম্বর"
                className="mt-6 inline-flex max-w-full items-start gap-3 rounded-xl border border-slate-500/30 bg-white/[0.055] px-4 py-3.5">
                <FileText className="mt-0.5 size-[18px] shrink-0 text-rose-300" aria-hidden />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-300">ট্রেড লাইসেন্স নম্বর</p>
                  <p className="mt-1 break-all text-[15px] font-semibold tracking-wide text-white">{tradeLicense}</p>
                </div>
              </div>
            )}
          </section>

          <nav aria-label="ফুটারের দ্রুত লিংক" className="min-w-0 text-left">
            <h2 className={heading}>দ্রুত লিংক</h2>
            <div aria-hidden="true" className="mt-3 h-[2px] w-9 rounded-full bg-rose-400" />
            <ul className="mt-5 grid gap-2">
              {navItems.map(item => (
                <li key={item.href}>
                  <Link href={item.href as Route}
                    className="group inline-flex min-h-9 items-center gap-2 text-[14px] font-medium text-slate-300 transition-colors hover:text-white focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 sm:text-[15px]">
                    <ChevronRight className="size-4 shrink-0 text-rose-300/80 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <section aria-label="সামাজিক যোগাযোগ ও অফিস সময়" className="min-w-0 text-left sm:col-span-2 lg:col-span-1">
            <h2 className={heading}>যোগাযোগ করুন</h2>
            <div aria-hidden="true" className="mt-3 h-[2px] w-9 rounded-full bg-rose-400" />
            <div className="mt-5 flex flex-wrap gap-2.5">
              {socialLinks.map(({ name, href, icon: Icon }) => (
                <a key={name} href={href} aria-label={name}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className={socialButton}>
                  <Icon className="size-[19px]" aria-hidden />
                </a>
              ))}
              {tiktok ? (
                <a href={tiktok} target="_blank" rel="noopener noreferrer"
                  aria-label="Niqaha TikTok" title="Niqaha TikTok"
                  className={socialButton}>
                  <FaTiktok className="size-[19px]" aria-hidden />
                </a>
              ) : (
                <span role="img" aria-label="TikTok: অফিসিয়াল লিংক এখনো যুক্ত হয়নি"
                  title="অফিশিয়াল TikTok URL Admin Settings থেকে সেট করুন"
                  className="inline-flex size-11 cursor-not-allowed items-center justify-center rounded-xl border border-slate-500/25 bg-white/[0.03] text-slate-500">
                  <FaTiktok className="size-[19px]" aria-hidden />
                </span>
              )}
            </div>
            <div className="mt-6 rounded-2xl border border-slate-500/25 bg-[#1C2C40] p-4 sm:p-5">
              <h3 className="flex items-center gap-2 font-sans text-[15px] font-bold text-white">
                <Clock3 className="size-[18px] text-rose-300" aria-hidden />
                অফিস টাইম
              </h3>
              <p className="mt-2 text-[13px] font-medium leading-6 text-slate-200 sm:text-[14px]">
                শনি - বৃহস্পতি: সকাল ০৯:০০ - রাত ০৯:০০
              </p>
              <p className="mt-1 text-[12px] font-medium leading-6 text-slate-300 sm:text-[13px]">
                শুক্রবার অফিস বন্ধ; জরুরি প্রয়োজনে কল করুন
              </p>
            </div>
          </section>
        </div>

        <div className="mt-10 border-t border-slate-500/30 pt-5 lg:mt-12">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <PolicyLinks className="gap-x-6 gap-y-2 text-[13px] font-medium"
              linkClassName="text-slate-300 transition-colors hover:text-white focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300" />
            <button type="button"
              onClick={() => window.dispatchEvent(new Event("niqaha:open-cookie-settings"))}
              className="text-[13px] font-medium text-slate-300 underline underline-offset-4 transition-colors hover:text-white focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300">
              কুকি সেটিংস
            </button>
          </div>
          <div className="mt-5 flex flex-col items-start justify-between gap-3 border-t border-slate-500/20 pt-5 lg:flex-row lg:items-center">
            <p className="text-[13px] font-normal leading-6 text-slate-400">
              কপিরাইট © {new Date().getFullYear()} niqaha — সমস্ত অধিকার সংরক্ষিত
            </p>
            <div className="flex flex-wrap items-center gap-3 text-[13px]">
              <span className="font-normal text-slate-400">
                Developed by <span className="font-semibold text-slate-200">Rifatul Islam</span>
              </span>
              <div className="flex items-center gap-3">
                <a href="mailto:munnarifat20@gmail.com" className="text-slate-300 transition-colors hover:text-rose-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300" aria-label="Email Rifatul Islam"><Mail className="size-4" /></a>
                <a href="tel:+8801907565617" className="text-slate-300 transition-colors hover:text-rose-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300" aria-label="Call Rifatul Islam"><Phone className="size-4" /></a>
                <a href="https://www.linkedin.com/in/rifatul-islam-munna/" target="_blank" rel="noopener noreferrer"
                  className="text-slate-300 transition-colors hover:text-rose-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300" aria-label="LinkedIn Rifatul Islam"><Linkedin className="size-4" /></a>
                <a href="https://www.facebook.com/munna.rifat.3/" target="_blank" rel="noopener noreferrer"
                  className="text-slate-300 transition-colors hover:text-rose-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300" aria-label="Facebook Rifatul Islam"><Facebook className="size-4" /></a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
