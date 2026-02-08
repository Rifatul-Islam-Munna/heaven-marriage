"use client";
import Link from "next/link";
import {
  Heart,
  Mail,
  Phone,
  Facebook,
  Instagram,
  MessageCircle,
  Linkedin,
  FacebookIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";

const navItems = [
  { label: "হোম", href: "/" },
  { label: "আমাদের সম্পর্কে", href: "/about" },
  { label: "জিজ্ঞাসা", href: "/biodata" },
  { label: "নির্দেশনা", href: "/guidelines" },
  { label: "যোগাযোগ", href: "/contact" },
];

const socialLinks = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/share/18CQA5bDtn/",
    icon: Facebook,
  },
  { name: "WhatsApp", href: "https://wa.me/01748919251", icon: MessageCircle },
  {
    name: "Instagram",
    href: "https://www.instagram.com/niqaha.combd?igsh=MWw3dzVyYXE5cjY2MQ==",
    icon: Instagram,
  },
];

export default function Footer() {
  const pathName = usePathname();
  return (
    <footer
      className={cn(
        `w-full border-t bg-gradient-to-br from-pink-50 to-purple-50`,
        {
          hidden:
            pathName.includes("/profile") || pathName.includes("/dashboard"),
        },
      )}
    >
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="mb-4 inline-flex items-center gap-2">
              <Image
                src={"/footer_image.png"}
                width={120}
                height={120}
                alt="footer_logo"
                className=" w-20 h-20 md:w-24 md:h-24 object-contain"
              />
            </Link>

            <p className="mb-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              ইসলামিক মূল্যবোধ ও আধুনিক প্রযুক্তির সমন্বয়ে বিশ্বস্ত বিবাহ সেবা
              প্রদানকারী প্ল্যাটফর্ম।
            </p>

            <div className="space-y-2 text-sm text-muted-foreground">
              <a
                href="mailto:niqahabd@gmail.com"
                className="flex items-center gap-2 transition-colors hover:text-pink-600"
              >
                <Mail className="h-4 w-4" />
                <span>niqahabd@gmail.com </span>
              </a>
              <a
                href="tel:+8801748919251"
                className="flex items-center gap-2 transition-colors hover:text-pink-600"
              >
                <Phone className="h-4 w-4" />
                <span>01748919251 </span>
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-4 font-heading text-lg font-semibold text-foreground">
              দ্রুত লিংক
            </h4>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-pink-600"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="mb-4 font-heading text-lg font-semibold text-foreground">
              যোগাযোগ করুন
            </h4>

            <div className="flex gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-600 text-white transition-transform hover:scale-110 hover:bg-pink-700"
                    aria-label={social.name}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>

            <div className="mt-6 rounded-lg bg-white/60 p-4">
              <h5 className="mb-2 text-sm font-semibold text-foreground">
                অফিস টাইম
              </h5>
              <p className="text-xs text-muted-foreground">
                শনি - শুক্র: সকাল ০৯:০০ - রাত ০৯:০০
              </p>
              <p className="text-xs text-pink-600">সোমবার বন্ধ</p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 border-t border-pink-200 pt-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              কপিরাইট © {new Date().getFullYear()} niqaha - সমস্ত অধিকার
              সংরক্ষিত
            </p>

            <div className="flex items-center pb-9 md:pb-0.5 gap-3">
              <span className="text-sm text-muted-foreground">
                Developed by{" "}
                <span className="font-semibold text-foreground">
                  Rifatul Islam
                </span>
              </span>
              <div className="flex gap-2">
                <a
                  href="mailto:munnarifat20@gmail.com"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-600 text-white transition-transform hover:scale-110 hover:bg-pink-700"
                  aria-label="Email Rifatul Islam"
                >
                  <Mail className="h-4 w-4" />
                </a>
                <a
                  href="tel:+8801907565617"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-600 text-white transition-transform hover:scale-110 hover:bg-pink-700"
                  aria-label="Call Rifatul Islam"
                >
                  <Phone className="h-4 w-4" />
                </a>
                <a
                  href="https://www.linkedin.com/in/rifatul-islam-munna/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-600 text-white transition-transform hover:scale-110 hover:bg-pink-700"
                  aria-label="LinkedIn Rifatul Islam"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
                <a
                  href="https://www.facebook.com/munna.rifat.3/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-600 text-white transition-transform hover:scale-110 hover:bg-pink-700"
                  aria-label="LinkedIn Rifatul Islam"
                >
                  <FacebookIcon className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
