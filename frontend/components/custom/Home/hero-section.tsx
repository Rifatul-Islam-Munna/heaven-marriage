"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ChevronDown, Heart, Shield, Users } from "lucide-react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { WebData } from "@/@types/user";

export default function HeroSection() {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { data: webData, isLoading } = useQueryWrapper<WebData>(
    ["web-data"],
    "/web-data",
    { gcTime: 85000, staleTime: 85000 },
    25000,
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Debug: Log video URLs
  useEffect(() => {
    if (webData) {
      console.log("Video URLs:", {
        desktop: webData?.home?.heroVideo?.bigScreen,
        mobile: webData?.home?.heroVideo?.mobileScreen,
      });
    }
  }, [webData]);

  const videoSrc = isMobile
    ? webData?.home?.heroVideo?.mobileScreen
    : webData?.home?.heroVideo?.bigScreen;

  return (
    <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        {/* Loading Skeleton - Show until data is loaded AND video is ready */}
        {(isLoading || !isVideoLoaded || !videoSrc) && (
          <div className="absolute inset-0 bg-gradient-to-br from-pink-950 via-black to-purple-950 animate-pulse" />
        )}

        {/* Only render video when we have the source */}
        {videoSrc && (
          <>
            {/* Desktop Video */}
            <video
              key={webData?.home?.heroVideo?.bigScreen} // Force re-render when URL changes
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onLoadedData={() => {
                console.log("Desktop video loaded");
                setIsVideoLoaded(true);
                setVideoError(false);
              }}
              onError={(e) => {
                console.error("Desktop video error:", e);
                setVideoError(true);
              }}
              className={`hidden h-full w-full object-cover md:block ${
                isVideoLoaded && !videoError ? "opacity-100" : "opacity-0"
              } transition-opacity duration-1000`}
            >
              <source
                src={webData?.home?.heroVideo?.bigScreen}
                type="video/mp4"
              />
            </video>

            {/* Mobile Video */}
            <video
              key={webData?.home?.heroVideo?.mobileScreen} // Force re-render when URL changes
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onLoadedData={() => {
                console.log("Mobile video loaded");
                setIsVideoLoaded(true);
                setVideoError(false);
              }}
              onError={(e) => {
                console.error("Mobile video error:", e);
                setVideoError(true);
              }}
              className={`block h-full w-full object-cover md:hidden ${
                isVideoLoaded && !videoError ? "opacity-100" : "opacity-0"
              } transition-opacity duration-1000`}
            >
              <source
                src={webData?.home?.heroVideo?.mobileScreen}
                type="video/mp4"
              />
            </video>
          </>
        )}

        {/* Error Fallback */}
        {videoError && (
          <div className="absolute inset-0 bg-gradient-to-br from-pink-950 via-black to-purple-950" />
        )}

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/85" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-32 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-8 text-center">
          {/* Logo/Brand Mark */}
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
              niqaha
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
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {/* Primary */}
              <Button
                size="lg"
                className="group  animate-bounce  relative h-14 w-full overflow-hidden rounded-full px-10 font-heading text-[17px] font-extrabold text-white sm:w-auto"
                asChild
              >
                <Link
                  href="/signup"
                  className="flex items-center justify-center gap-2"
                >
                  {/* Glow + gradient layers */}
                  <span className="pointer-events-none absolute inset-0">
                    <span className="absolute -inset-24 bg-[radial-gradient(circle_at_30%_30%,rgba(236,72,153,0.8),transparent_55%)] opacity-60 blur-2xl" />
                    <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-600" />
                    <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </span>

                  {/* Glass edge */}
                  <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/15" />

                  {/* Content */}
                  <span className="relative flex items-center gap-2">
                    <span className="relative">
                      {/* Pulse glow behind text */}
                      <span className="absolute -inset-x-3 -inset-y-2 rounded-full bg-pink-400/25 blur-md animate-pulse" />

                      {/* Text shimmer */}
                      <span className="relative inline-block bg-gradient-to-r from-white via-pink-100 to-white bg-[length:220%_100%] bg-clip-text text-transparent animate-[shimmer_1.6s_linear_infinite]">
                        বায়োডাটা তৈরি করুন
                      </span>
                    </span>

                    <ArrowUpRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </span>

                  {/* Shine sweep */}
                  <span className="pointer-events-none absolute -left-24 top-0 h-full w-24 rotate-12 bg-white/20 blur-md transition-all duration-500 group-hover:left-[110%]" />
                </Link>
              </Button>

              {/* Secondary */}
              <Button
                size="lg"
                variant="outline"
                className="group relative h-14 w-full rounded-full border-white/15 bg-white/5 px-10 font-heading text-[17px] font-extrabold text-white backdrop-blur sm:w-auto"
                asChild
              >
                <Link
                  href="/about"
                  className="flex items-center justify-center gap-2"
                >
                  <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/10" />
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-pink-500/15 to-fuchsia-500/15 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <span className="relative flex items-center gap-2">
                    আমাদের সম্পর্কে জানুন
                    <ArrowUpRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </span>
                </Link>
              </Button>
            </div>
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
    </section>
  );
}
