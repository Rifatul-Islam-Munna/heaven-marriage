// app/about/page.tsx

import ExpatMessageSection from "@/components/custom/about/expat-message-section";
import HMSGoalsSection from "@/components/custom/about/hms-goals-section";
import HMSIntroductionSection from "@/components/custom/about/hms-introduction-section";
import HMSMembersSection from "@/components/custom/about/hms-members-section";
import SpecialAnnouncementSection from "@/components/custom/about/special-announcement-section";
import WelcomeSectionWithImage from "@/components/custom/about/welcome-section-with-image";
import WhatWeDontDoSection from "@/components/custom/about/what-we-dont-do-section";
import { Heart, BookOpen } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero/Title Section */}
      <section className="relative w-full overflow-hidden border-b bg-gradient-to-br from-pink-50 via-purple-50/30 to-background py-16 md:py-24">
        {/* Decorative Background */}
        <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-pink-200/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-pink-300/20 blur-3xl" />

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-pink-100 px-4 py-2 text-sm font-medium text-pink-700">
              <Heart className="h-4 w-4 fill-pink-600 text-pink-600" />
              <span>আমাদের সম্পর্কে জানুন</span>
            </div>

            {/* Main Title */}
            <h1 className="mb-6 font-heading text-4xl font-bold leading-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              Heaven Marriage সম্পর্কে
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              ইসলামিক মূল্যবোধ ও আধুনিক প্রযুক্তির সমন্বয়ে গড়ে ওঠা বাংলাদেশের
              বিশ্বস্ত বিবাহ সেবা প্ল্যাটফর্ম
            </p>

            {/* Icon Decoration */}
            <div className="flex items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 p-3 shadow-lg shadow-pink-500/30">
                <Heart className="h-full w-full text-white" />
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 p-3 shadow-lg shadow-pink-500/30">
                <BookOpen className="h-full w-full text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections will go here */}
      <div className="  w-full">
        {/* Placeholder for future sections */}
        <WelcomeSectionWithImage />
        <HMSIntroductionSection />
        <HMSGoalsSection />
        <WhatWeDontDoSection />
        <ExpatMessageSection />
        <HMSMembersSection />
        <SpecialAnnouncementSection />
      </div>
    </div>
  );
}
