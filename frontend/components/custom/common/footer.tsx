"use client";
import Link from "next/link";
import {
  Heart,
  Mail,
  Phone,
  Facebook,
  Instagram,
  MessageCircle,
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
  { name: "Facebook", href: "#", icon: Facebook },
  { name: "WhatsApp", href: "#", icon: MessageCircle },
  { name: "Instagram", href: "#", icon: Instagram },
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
                href="mailto:heaven-marriage-solutions.com"
                className="flex items-center gap-2 transition-colors hover:text-pink-600"
              >
                <Mail className="h-4 w-4" />
                <span>heaven-marriage-solutions.com</span>
              </a>
              <a
                href="tel:+8801234567890"
                className="flex items-center gap-2 transition-colors hover:text-pink-600"
              >
                <Phone className="h-4 w-4" />
                <span>+880 1234-567890</span>
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
                শনি - শুক্র: ০৯:০০ - ২১:০০
              </p>
              <p className="text-xs text-pink-600">সোমবার বন্ধ</p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 border-t border-pink-200 pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            কপিরাইট © {new Date().getFullYear()} niqaha - সমস্ত অধিকার সংরক্ষিত
          </p>
        </div>
      </div>
    </footer>
  );
}
