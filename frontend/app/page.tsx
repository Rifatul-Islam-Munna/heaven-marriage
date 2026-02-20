// app/bn/page.tsx
import type { Metadata } from "next";
import Script from "next/script";

import AboutSection from "@/components/custom/Home/about-sections";
import BiodataFilter from "@/components/custom/Home/biodata-filter";
import CreateBiodataSection from "@/components/custom/Home/CreateBiodataSection";
import EarlyMarriageSection from "@/components/custom/Home/early-marriage-section";
import HeroSection from "@/components/custom/Home/hero-section";
import HMSBenefitsSection from "@/components/custom/Home/hms-benefits-section";
import IslamicMarriageSection from "@/components/custom/Home/islamic-marriage-section";
import MarriageBenefitsSection from "@/components/custom/Home/marriage-benefits-section";
import PricingSection from "@/components/custom/Home/PricingSection";

const SITE_NAME = "Niqaha";
const SITE_URL = "https://niqaha.com";
const OG_IMAGE = `${SITE_URL}/logo.png`; // create this
const BN_TITLE = "হালাল ম্যাট্রিমনি বাংলাদেশ | Niqaha";
const BN_DESC =
  "Niqaha বাংলাদেশের হালাল ম্যাট্রিমনি প্ল্যাটফর্ম। বায়োডাটা তৈরি করুন, উপযুক্ত প্রোফাইল খুঁজুন এবং নিরাপদভাবে প্রস্তাব আদান-প্রদান করুন।";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: BN_TITLE,
  description: BN_DESC,
  alternates: {
    canonical: "/bn",
    languages: {
      "bn-BD": "/bn",
      en: "/",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/bn`,
    siteName: SITE_NAME,
    title: BN_TITLE,
    description: BN_DESC,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Niqaha" }],
    locale: "bn_BD",
  },
  twitter: {
    card: "summary_large_image",
    title: BN_TITLE,
    description: BN_DESC,
    images: [OG_IMAGE],
  },
};

export default function PageBn() {
  const jsonLdWebSiteBn = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_URL}/bn`,
    inLanguage: "bn-BD",
  };

  const jsonLdOrganization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
  };

  return (
    <main className="w-full min-h-dvh">
      <Script
        id="jsonld-website-bn"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSiteBn) }}
      />
      <Script
        id="jsonld-org"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
      />

      {/* Ideally your HeroSection should show Bangla H1 + intro text on /bn */}
      <HeroSection />
      <BiodataFilter />
      <CreateBiodataSection />
      <PricingSection />
      <AboutSection />
      <IslamicMarriageSection />
      <EarlyMarriageSection />
      <MarriageBenefitsSection />
      <HMSBenefitsSection />
    </main>
  );
}
