// app/biodatas/page.tsx
import BiodataAdvancedFilter from "@/components/custom/common/biodata-advanced-filter";
import BiodataGrid from "@/components/custom/common/biodata-grid";

export default function BiodatasPage() {
  // Sample data - replace with your API call
  const biodatas = [
    {
      id: "1",
      biodataNumber: "ODF-3976",
      age: 21,
      height: "৫' ১০\"",
      district: "শ্যামলা",
      education: "উচ্চ মাধ্যমিক",
      profession: "ছাত্র",
      gender: "female" as const,
      isVerified: true,
    },
    {
      id: "2",
      biodataNumber: "ODF-23270",
      age: 23,
      height: "৫'",
      district: "ঢাকা",
      upazila: "মিরপুর",
      education: "স্নাতক",
      profession: "শিক্ষক",
      gender: "female" as const,
      isUrgent: true,
    },
    {
      id: "3",
      biodataNumber: "ODF-27294",
      age: 20,
      height: "৫'",
      district: "খুলনা",
      upazila: "ডুমুরিয়া",
      education: "উচ্চ মাধ্যমিক",
      profession: "ব্যবসা",
      gender: "female" as const,
      isVerified: true,
    },
    {
      id: "4",
      biodataNumber: "ODF-2877",
      age: 24,
      height: "৫' ১\"",
      district: "রাজশাহী",
      upazila: "পবা",
      education: "উচ্চ মাধ্যমিক",
      profession: "গৃহিণী",
      gender: "female" as const,
    },
    {
      id: "5",
      biodataNumber: "ODF-28915",
      age: 28,
      height: "৪' ৯\"",
      district: "বরিশাল",
      education: "স্নাতক",
      profession: "ব্যাংকার",
      gender: "female" as const,
      isVerified: true,
    },
    {
      id: "6",
      biodataNumber: "ODF-2705",
      age: 29,
      height: "৫' ১\"",
      district: "সিলেট",
      upazila: "বিয়ানীবাজার",
      education: "উচ্চ মাধ্যমিক",
      profession: "ডাক্তার",
      gender: "female" as const,
      isVerified: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/30 via-purple-50/20 to-white">
      {/* Header Section */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="mb-2 font-heading text-2xl font-bold text-gray-900 md:text-3xl">
            বায়োডাটা সমূহ
          </h1>
          <p className="text-sm text-gray-600 md:text-base">
            5622 টি বায়োডাটা পাওয়া গেছে!
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="  md:w-full mx-auto container w-full px-4 py-6">
        <div className="flex gap-6">
          {/* Filter on Left - Hidden on mobile (< md) */}
          <div className="hidden lg:block">
            <BiodataAdvancedFilter />
          </div>

          {/* Content on Right - Full width on mobile */}
          <div className="min-w-0 flex-1">
            <div className=" w-full  flex lg:hidden justify-end py-2">
              <BiodataAdvancedFilter />
            </div>
            <BiodataGrid biodatas={biodatas} />
          </div>
        </div>
      </div>

      {/* Mobile Filter Button - Shows on mobile only */}
      {/* This is already inside BiodataAdvancedFilter component */}
    </div>
  );
}
