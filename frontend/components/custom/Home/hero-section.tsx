// components/hero-section.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ChevronDown, Heart, Shield, Users } from "lucide-react";

export default function HeroSection() {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        {/* Loading Skeleton */}
        {!isVideoLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-pink-950 via-black to-purple-950" />
        )}

        {/* Desktop Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlayThrough={() => setIsVideoLoaded(true)}
          className={`hidden h-full w-full object-cover md:block ${
            isVideoLoaded ? "opacity-100" : "opacity-0"
          } transition-opacity duration-1000`}
        >
          <source src="/videos/hero-desktop.mp4" type="video/mp4" />
        </video>

        {/* Mobile Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlayThrough={() => setIsVideoLoaded(true)}
          className={`block h-full w-full object-cover md:hidden ${
            isVideoLoaded ? "opacity-100" : "opacity-0"
          } transition-opacity duration-1000`}
        >
          <source src="/videos/hero-mobile.mp4" type="video/mp4" />
        </video>

        {/* Dark Overlay - Much stronger */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/85" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-32 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-8 text-center">
          {/* Logo/Brand Mark (Optional) */}
          <div
            className="animate-in fade-in zoom-in duration-700"
            style={{ animationDelay: "0.1s", animationFillMode: "both" }}
          >
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-pink-500/20 backdrop-blur-sm">
              <Heart className="h-8 w-8 fill-pink-500 text-pink-500" />
            </div>
          </div>

          {/* Main Heading */}
          <div
            className="animate-in fade-in slide-in-from-bottom-4 duration-1000 space-y-4"
            style={{ animationDelay: "0.2s", animationFillMode: "both" }}
          >
            <h1 className="font-heading text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
              Heaven Marriage
            </h1>
            <h2 className="font-heading text-5xl font-bold leading-tight tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
              <span className="bg-gradient-to-r from-pink-400 via-pink-500 to-pink-600 bg-clip-text text-transparent">
                Solutions
              </span>
            </h2>
          </div>

          {/* Subtitle */}
          <p
            className="animate-in fade-in slide-in-from-bottom-4 duration-1000 mx-auto max-w-2xl text-xl font-medium leading-relaxed text-gray-200 sm:text-2xl md:text-3xl"
            style={{ animationDelay: "0.4s", animationFillMode: "both" }}
          >
            বিশুদ্ধতা, বিশ্বস্ততা ও সুন্নাহ-সম্মত বিবাহের নির্ভরযোগ্য প্রতিষ্ঠান
          </p>

          {/* CTA Button */}
          <div
            className="animate-in fade-in slide-in-from-bottom-4 duration-1000 pt-4"
            style={{ animationDelay: "0.6s", animationFillMode: "both" }}
          >
            <Button
              size="lg"
              className="group h-14 bg-pink-600 px-10 font-heading text-lg font-bold shadow-2xl shadow-pink-500/50 transition-all hover:scale-105 hover:bg-pink-700 hover:shadow-pink-500/70"
              asChild
            >
              <Link href="/about" className="flex items-center gap-2">
                আমাদের সম্পর্কে জানুন
                <ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div
            className="animate-in fade-in slide-in-from-bottom-4 duration-1000 flex flex-wrap items-center justify-center gap-8 pt-8 md:gap-12"
            style={{ animationDelay: "0.8s", animationFillMode: "both" }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 backdrop-blur-sm">
                <Shield className="h-6 w-6 text-green-400" />
              </div>
              <span className="text-sm font-medium text-gray-300">
                ১০০% হালাল
              </span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20 backdrop-blur-sm">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-gray-300">
                সম্পূর্ণ বিনামূল্যে
              </span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20 backdrop-blur-sm">
                <Heart className="h-6 w-6 text-purple-400" />
              </div>
              <span className="text-sm font-medium text-gray-300">
                নিরাপদ ও গোপনীয়
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium text-gray-400">Scroll</span>
          <ChevronDown className="h-6 w-6 text-gray-400" />
        </div>
      </div>

      {/* Bottom Gradient Fade */}
    </section>
  );
}
