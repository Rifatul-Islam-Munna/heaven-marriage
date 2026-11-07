"use client";

import Link from "next/link";
import type { Route } from "next";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ChevronRight, Facebook, Instagram, Linkedin, Mail, MapPin, Phone, FileText,
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
const iconButton = "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-pink-300/25 bg-pink-400/10 text-pink-200 transition-colors hover:border-pink-300/60 hover:bg-pink-400/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300";

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
      "relative isolate overflow-hidden border-t-[3px] border-pink-500 bg-[#2b1725] text-[#fbeaf1]",
      hide && "hidden",
    )}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 -z-10 size-[370px] rounded-full bg-pink-500/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 -z-10 size-80 rounded-full bg-rose-300/5 blur-3xl" />
      <div className="container mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid items-start gap-x-12 gap-y-9 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,.65fr)_minmax(0,.9fr)]">
          {/* The identity and registration details stay visually prominent, including on mobile. */}
          <section aria-label="Niqaha সম্পর্কে" className="min-w-0 text-left">
            <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-pink-300">
              <Image src="/logo.png" width={56} height={56} alt="Niqaha logo"
                className="size-12 rounded-lg bg-white/95 p-1 object-contain" />
              <span className="font-heading text-3xl font-bold tracking-wide text-[#f9d8e6]">niqaha</span>
            </Link>
            <p className="mt-4 max-w-lg text-[15px] font-medium leading-7 text-[#eed7e2] sm:text-base">
              ইসলামিক মূল্যবোধ ও আধুনিক প্রযুক্তির সমন্বয়ে বিশ্বস্ত বিবাহ সেবা
              প্রদানকারী প্ল্যাটফর্ম।
            </p>
            <div className="mt-5 space-y-3 text-[15px] font-semibold leading-6 sm:text-base">
              <a href={"mailto:" + contacts.email} className="flex min-w-0 items-start gap-3 text-[#f9e5ed] hover:text-pink-200">
                <Mail className="mt-0.5 size-5 shrink-0 text-pink-300" aria-hidden />
                <span className="break-all">{contacts.email}</span>
              </a>
              <a href={"tel:" + contacts.general} className="flex items-start gap-3 text-[#f9e5ed] hover:text-pink-200">
                <Phone className="mt-0.5 size-5 shrink-0 text-pink-300" aria-hidden />
                01748919251 — শুধু কল
              </a>
              <p className="flex items-start gap-3 text-[#f9e5ed]">
                <MapPin className="mt-0.5 size-5 shrink-0 text-pink-300" aria-hidden />
                {contacts.address}
              </p>
            </div>
            {tradeLicense && (
              <div aria-label="প্রতিষ্ঠানের ট্রেড লাইসেন্স নম্বর"
                className="mt-5 inline-flex max-w-full items-start gap-3 rounded-xl border border-pink-300/25 bg-white/[0.065] px-4 py-3">
                <FileText className="mt-0.5 size-5 shrink-0 text-pink-200" aria-hidden />
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-pink-200">ট্রেড লাইসেন্স নম্বর</p>
                  <p className="mt-0.5 break-all text-base font-bold tracking-wide text-white">{tradeLicense}</p>
                </div>
              </div>
            )}
          </section>

          <nav aria-label="ফুটারের দ্রুত লিংক" className="text-left">
            <h2 className="mb-4 font-heading text-xl font-bold text-[#f9d8e6]">দ্রুত লিংক</h2>
            <ul className="grid gap-2.5">
              {navItems.map(item => (
                <li key={item.href}>
                  <Link href={item.href as Route}
                    className="group inline-flex min-h-8 items-center gap-2 text-[15px] font-semibold text-[#f5dfe9] transition-colors hover:text-pink-200 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-pink-300">
                    <ChevronRight className="size-4 shrink-0 text-pink-300 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <section aria-label="সামাজিক যোগাযোগ ও অফিস সময়" className="min-w-0 text-left">
            <h2 className="mb-4 font-heading text-xl font-bold text-[#f9d8e6]">যোগাযোগ করুন</h2>
            <div className="flex flex-wrap gap-2.5">
              {socialLinks.map(({ name, href, icon: Icon }) => (
                <a key={name} href={href} aria-label={name}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className={iconButton}>
                  <Icon className="size-5" aria-hidden />
                </a>
              ))}
              {tiktok ? (
                <a href={tiktok} target="_blank" rel="noopener noreferrer"
                  aria-label="Niqaha TikTok" title="Niqaha TikTok"
                  className={iconButton}>
                  <FaTiktok className="size-5" aria-hidden />
                </a>
              ) : (
                <span role="img" aria-label="TikTok: অফিসিয়াল লিংক এখনো যুক্ত হয়নি"
                  title="অফিশিয়াল TikTok URL Admin Settings থেকে সেট করুন"
                  className="inline-flex size-11 cursor-not-allowed items-center justify-center rounded-xl border border-white/10 bg-white/5 text-pink-200/50">
                  <FaTiktok className="size-5" aria-hidden />
                </span>
              )}
            </div>
            <div className="mt-5 rounded-xl border border-pink-300/15 bg-white/[0.055] p-4">
              <h3 className="mb-2 text-[15px] font-bold text-pink-200">অফিস টাইম</h3>
              <p className="text-sm font-medium leading-6 text-[#f7e5ee]">
                শনি - বৃহস্পতি: সকাল ০৯:০০ - রাত ০৯:০০
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-pink-300">
                শুক্রবার অফিস বন্ধ; জরুরি প্রয়োজনে কল করুন
              </p>
            </div>
          </section>
        </div>

        <div className="mt-9 border-t border-pink-200/20 pt-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <PolicyLinks className="gap-x-5 gap-y-2 text-sm font-semibold"
              linkClassName="text-pink-200 hover:text-white" />
            <button type="button"
              onClick={() => window.dispatchEvent(new Event("niqaha:open-cookie-settings"))}
              className="text-sm font-semibold text-pink-200 underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-pink-300">
              কুকি সেটিংস
            </button>
          </div>
          <div className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-pink-200/15 pt-5 md:flex-row md:items-center">
            <p className="text-sm font-semibold leading-6 text-[#f2dce6]">
              কপিরাইট © {new Date().getFullYear()} niqaha - সমস্ত অধিকার সংরক্ষিত
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-[#f2dce6]">
                Developed by <span className="font-bold text-pink-200">Rifatul Islam</span>
              </span>
              <div className="flex items-center gap-2">
                <a href="mailto:munnarifat20@gmail.com" className="text-pink-200 hover:text-white" aria-label="Email Rifatul Islam"><Mail className="size-4" /></a>
                <a href="tel:+8801907565617" className="text-pink-200 hover:text-white" aria-label="Call Rifatul Islam"><Phone className="size-4" /></a>
                <a href="https://www.linkedin.com/in/rifatul-islam-munna/" target="_blank" rel="noopener noreferrer"
                  className="text-pink-200 hover:text-white" aria-label="LinkedIn Rifatul Islam"><Linkedin className="size-4" /></a>
                <a href="https://www.facebook.com/munna.rifat.3/" target="_blank" rel="noopener noreferrer"
                  className="text-pink-200 hover:text-white" aria-label="Facebook Rifatul Islam"><Facebook className="size-4" /></a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
