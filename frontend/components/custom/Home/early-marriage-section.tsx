// components/early-marriage-section.tsx
import { Quote, BookOpen } from "lucide-react";

const islamicGuidance = [
  {
    arabic: "وَابْتَغُوا مَا طَلَبَ لَكُمْ مِنَ النِّسَاءِ مِنْ وَلَدٍ حَيْثُ",
    bengali:
      "তোমরা নারীদের মধ্যে যার সাথে বিবাহ করতে চাও, তাদের মধ্যে দুই, তিন বা চার পর্যন্ত বিবাহ করো।",
    reference: "সূরা নিসা: ৩",
  },
  {
    bengali: "তোমাদের উত্তম স্ত্রীরাই জান্নাতে তোমাদের সঙ্গী হবে।",
    reference: "তিরমিযী: ১১৮৩",
  },
  {
    bengali:
      "আমার উম্মতের মধ্যে যে বেশি সন্তান জন্ম দেবে, আমি কিয়ামতের দিন তার মাধ্যমে গর্ব করব ।",
    reference: "আবু দাউদ: ২০৫০",
  },
];

export default function EarlyMarriageSection() {
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
            কেনো অধিক বিবাহ ইসলামে প্রয়োজনীয়?
          </h2>
        </div>

        {/* Grid with Fill-up Animation */}
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-3">
          {islamicGuidance.map((item, index) => (
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

                {/* Arabic Text (if exists) */}
                {item.arabic && (
                  <p
                    className="font-arabic text-xl font-semibold leading-relaxed text-foreground md:text-2xl"
                    dir="rtl"
                  >
                    {item.arabic}
                  </p>
                )}

                {/* Bengali Translation */}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.bengali}
                </p>

                {/* Reference */}
                <p className="text-xs font-medium text-pink-600">
                  ({item.reference})
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
