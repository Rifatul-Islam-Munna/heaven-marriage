// components/about/special-announcement-section.tsx
import { Sparkles, Heart, Scale, Phone } from "lucide-react";
import Link from "next/link";

const announcements = [
  {
    emoji: "🕊️",
    text: "আমরা প্রতিটি প্রোফাইল যাচাই করি, তবে চূড়ান্ত সত্য একমাত্র আল্লাহ জানেন।",
  },
  {
    emoji: "⚖️",
    text: "শরীয়াহ ভঙ্গ করলে সদস্যপদ বাতিল হবে।",
  },
  {
    emoji: "💍",
    text: "প্রস্তাব পৌঁছে দেওয়াই আমাদের দায়িত্ব — সিদ্ধান্ত আপনার।",
  },
  {
    emoji: "🤲",
    text: "আমাদের দল সবসময় আপনাদের পাশে থাকবে দীনী পরামর্শ ও ভালোবাসা নিয়ে।",
  },
];

export default function SpecialAnnouncementSection() {
  return (
    <section className="w-full bg-gradient-to-br from-pink-50 via-rose-50/50 to-background py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-pink-100 px-5 py-2">
              <Sparkles className="h-5 w-5 text-pink-600" />
              <span className="text-sm font-semibold text-pink-700">
                বিশেষ ঘোষণা
              </span>
            </div>

            <h2 className="mb-4 font-heading text-3xl font-bold text-foreground md:text-4xl">
              🌟 একটি বিশেষ হৃদয়স্পর্শী ঘোষণা
            </h2>

            <div className="mx-auto h-1 w-32 rounded-full bg-gradient-to-r from-transparent via-pink-500 to-transparent" />
          </div>

          {/* Main Card */}
          <div className="mb-6 rounded-2xl border-2 border-pink-200 bg-white p-6 md:p-8">
            {/* Introduction */}
            <div className="mb-6 text-center">
              <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                <span className="font-semibold text-pink-600">HMS</span> — এটি
                একটি ইমানি বিশ্বাসের বন্ধন। সততা ও শরীয়াহর আলোকে পরিচালিত
                প্রতিটি সম্পর্ক এখানে পবিত্র।
              </p>
            </div>

            {/* Announcements Grid */}
            <div className="mb-6 grid gap-4 md:grid-cols-2">
              {announcements.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-xl border border-pink-200/50 bg-pink-50/30 p-4"
                >
                  <span className="flex-shrink-0 text-2xl">{item.emoji}</span>
                  <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Call to Action Box */}
            <div className="rounded-xl border-2 border-pink-300 bg-gradient-to-br from-pink-100 to-rose-100/50 p-6">
              <div className="mb-3 flex items-center justify-center gap-2">
                <Heart className="h-6 w-6 fill-pink-600 text-pink-600" />
              </div>
              <p className="mb-4 text-center text-base font-medium leading-relaxed text-foreground md:text-lg">
                ❤️ আপনার যদি আকীদা ও ইমানের পথে জীবন শুরু করার ইচ্ছা থাকে — আজই
                ফর্ম পূরণ করুন।
              </p>
              <div className="text-center">
                <Link
                  href={"/contact"}
                  className="rounded-full border-2 border-pink-600 bg-pink-600 px-8 py-3 font-heading text-base font-semibold text-white transition-colors hover:bg-pink-700 hover:border-pink-700"
                >
                  ফর্ম পূরণ করুন
                </Link>
              </div>
            </div>
          </div>

          {/* Footer Message */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-pink-100 px-6 py-3">
              <span className="text-2xl">🌸</span>
              <p className="text-base font-medium text-pink-700">
                HMS — আপনার জান্নাতের পথে হালাল ভালোবাসার সঙ্গী।
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
