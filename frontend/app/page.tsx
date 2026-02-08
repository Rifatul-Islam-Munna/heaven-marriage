import { ComponentExample } from "@/components/component-example";
import AboutSection from "@/components/custom/Home/about-sections";
import BiodataFilter from "@/components/custom/Home/biodata-filter";
import CreateBiodataSection from "@/components/custom/Home/CreateBiodataSection";
import EarlyMarriageSection from "@/components/custom/Home/early-marriage-section";
import HeroSection from "@/components/custom/Home/hero-section";
import HMSBenefitsSection from "@/components/custom/Home/hms-benefits-section";
import IslamicMarriageSection from "@/components/custom/Home/islamic-marriage-section";
import MarriageBenefitsSection from "@/components/custom/Home/marriage-benefits-section";
import OfficeHoursSection from "@/components/custom/Home/office-hours-section";
import PricingSection from "@/components/custom/Home/PricingSection";
import RegistrationSection from "@/components/custom/Home/registration-section";

export default function Page() {
  return (
    <main className=" w-full min-h-dvh">
      <HeroSection />
      <BiodataFilter />
      <CreateBiodataSection />
      <PricingSection />
      <AboutSection />
      <IslamicMarriageSection />
      <EarlyMarriageSection />
      <MarriageBenefitsSection />
      <HMSBenefitsSection />
      {/*     <RegistrationSection /> */}
      {/*  <OfficeHoursSection /> */}
    </main>
  );
}
