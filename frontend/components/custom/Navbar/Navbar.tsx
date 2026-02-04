// components/navbar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Heart, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ArrowNarrowRightIcon from "@/components/ui/arrow-narrow-right-icon";
import { useUser } from "@/lib/useUser";
import { UserNav } from "./UserNav";

import { cn } from "@/lib/utils";

// Navigation items array
const navItems = [
  { label: "হোম", href: "/" },
  { label: "আমাদের সম্পর্কে", href: "/about" },
  { label: "জিজ্ঞাসা", href: "/faq" },
  { label: "নির্দেশনা", href: "/guidelines" },
  { label: "যোগাযোগ", href: "/contact" },
];

// Language options
const languages = [
  { value: "bn", label: "বাংলা" },
  { value: "en", label: "English" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState("bn");
  const { user } = useUser();

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      )}
    >
      <div className=" container md:w-full lg:container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Heart className="h-8 w-8 fill-pink-500 text-pink-500" />
              <span className="font-heading text-2xl font-bold text-primary">
                Heaven Marriage
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-heading text-base md:text-sm lg:text-base font-medium text-foreground transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-4 md:flex">
            {/* Language Selector */}
            <Select value={currentLang} onValueChange={setCurrentLang}>
              <SelectTrigger className="w-[100px] border-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Login Button */}
            {user ? (
              <UserNav user={user} />
            ) : (
              <Button
                variant="default"
                className="bg-primary font-heading font-semibold hover:bg-primary/90"
                asChild
              >
                <Link href="/login">লগইন</Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Mobile Language Selector */}
            <Select value={currentLang} onValueChange={setCurrentLang}>
              <SelectTrigger className="w-[80px] border-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex  md:hidden">
              {user && <UserNav user={user} />}
            </div>

            {/* Mobile Sheet Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[280px] px-6 sm:w-[350px]"
              >
                <SheetHeader className="mb-8">
                  <SheetTitle className="flex items-center gap-2">
                    <Heart className="h-6 w-6 fill-pink-500 text-pink-500" />
                    <span className="font-heading text-xl font-bold text-primary">
                      Heaven Marriage
                    </span>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-2">
                  {/* Mobile Navigation Links */}
                  {navItems.map((item, index) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="group flex items-center justify-between rounded-lg px-4 py-3 font-heading text-base font-medium text-foreground transition-all hover:bg-accent hover:text-primary"
                      style={{
                        animation: `slideIn 0.3s ease-out ${index * 0.1}s both`,
                      }}
                    >
                      <span>{item.label}</span>
                      <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  ))}

                  {/* Mobile Login Button */}
                  <Button
                    className="mt-6 w-full bg-primary font-heading text-base font-semibold hover:bg-primary/90"
                    asChild
                  >
                    <Link href="/login" onClick={() => setIsOpen(false)}>
                      লগইন
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </nav>
  );
}
