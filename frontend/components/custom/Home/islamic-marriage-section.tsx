// components/islamic-marriage-section.tsx
import { Quote, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const hadithList = [
  {
    arabic: "النكاح سنتي",
    bengali: "বিবাহ আমার সুন্নাহ",
    reference: "ইবনে মাজাহ: ১৮৪৬",
  },
  {
    arabic: "وَأَنْكِحُوا الْأَيَامَىٰ مِنْكُمْ",
    bengali: "তোমাদের মধ্যে যারা অবিবাহিত, তাদের বিবাহ সম্পন্ন করো।",
    reference: "সূরা নূর: ৩২",
  },
  {
    arabic: "إذا تزوج العبد فقد استكمل نصف الدين",
    bengali: "যখন বান্দা বিবাহ করে, তখন সে তার দ্বীনের অর্ধেক পূর্ণ করে।",
    reference: "বায়হাকি, শু‘আবুল ঈমান: ৫৪৭৬",
  },
  {
    arabic: "خيرُ النِّكاحِ أيْسَرُهُ",
    bengali: "সর্বোত্তম বিবাহ হলো যা সবচেয়ে সহজে সম্পন্ন হয়",
    reference: "ইবনে হিব্বান: ৪০৩২",
  },
];

export default function IslamicMarriageSection() {
  return (
    <section className="w-full border-y bg-background py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Badge */}
        <div className="mx-auto mb-10 max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 text-pink-600">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm font-medium">ইসলামী শিক্ষা</span>
          </div>

          <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl md:text-5xl leading-tight">
            ইসলামে বিবাহের শুরুত্ব ও ফজিলত
          </h2>

          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            বিবাহ একটি ইবাদত এবং এটি আল্লাহর বিধান। কুরআন ও হাদিসে বিবাহের
            গুরুত্ব ও ফজিলত সম্পর্কে বহু দলিল রয়েছে:
          </p>
        </div>

        {/* Hadith Grid with Fill-up Animation */}
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          {hadithList.map((hadith, index) => (
            <div
              key={index}
              className="group relative overflow-hidden border-l-2 border-pink-500/30 bg-card/50 p-5 transition-all hover:border-pink-500"
            >
              {/* Fill-up Background Animation */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-pink-50/50 to-purple-50/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="space-y-3">
                {/* Number + Quote Icon */}
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500/10 text-xs font-bold text-pink-600 transition-colors group-hover:bg-pink-500 group-hover:text-white">
                    {index + 1}
                  </div>
                  <Quote className="h-5 w-5 text-pink-500/30 transition-all group-hover:text-pink-500" />
                </div>

                {/* Arabic Text */}
                <p
                  className="font-arabic text-xl font-semibold leading-relaxed text-foreground md:text-2xl"
                  dir="rtl"
                >
                  {hadith.arabic}
                </p>

                {/* Bengali Translation */}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {hadith.bengali}
                </p>

                {/* Reference */}
                <p className="text-xs font-medium text-pink-600">
                  ({hadith.reference})
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
