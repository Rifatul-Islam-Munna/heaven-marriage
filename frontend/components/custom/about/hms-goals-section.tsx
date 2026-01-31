// components/about/hms-goals-section.tsx
import { Heart, Users, Flower2, Globe, BookOpen, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const goals = [
  {
    icon: Users,
    emoji: "🤝",
    title: "সময়মতো হালাল সম্পর্ক গড়তে সহায়তা করি",
    description:
      "যেন যুবক-যুবতীরা হারামের আগুনে পুড়ে না যায়, বরং জান্নাতের পথে হাঁটতে পারে।",
  },
  {
    icon: Sparkles,
    emoji: "🕌",
    title: "সুন্নাহসম্মত বিবাহের সংস্কৃতি গড়ে তুলি",
    description:
      "সহজ, স্বচ্ছ ও শরীয়াহভিত্তিক পদ্ধতিতে বিয়েকে ফিরিয়ে আনি মূলধারায়।",
  },
  {
    icon: Heart,
    emoji: "💔",
    title: "অবহেলিত ও একাকী নারীদের পাশে দাঁড়াই",
    description:
      "বিধবা, ডিভোর্সি, এতিমা, অসুন্দরী কিংবা বয়সী—সব নারীর জন্য সম্মানজনক বিবাহের ব্যবস্থা করি।",
  },
  {
    icon: Flower2,
    emoji: "🌸",
    title: "একাধিক বিবাহে শরয়ী সাহস ও ভারসাম্য তৈরি করি",
    description:
      "যে ভাইরা ন্যায় ও ইনসাফের সাথে মাসনা করতে চায়—তাদেরকে প্রফেশনাল শরয়ী গাইডলাইন দিই।",
  },
  {
    icon: Globe,
    emoji: "🌎",
    title: "হারাম প্রেম ও অবৈধ সম্পর্ক থেকে বাঁচাতে সচেষ্ট থাকি",
    description:
      "যুব সমাজকে প্রেমের নামে ফিতনা থেকে রক্ষা করে হালাল পথে সুন্দর জীবন গড়তে দাওয়াত দিই।",
  },
  {
    icon: BookOpen,
    emoji: "📚",
    title: "ইসলামি দৃষ্টিকোণ থেকে দাম্পত্য রাহনুয়ায়ী করি",
    description:
      "আকীদা, মন-মানসিকতা ও পারিবারিক মূল্যবোধে সুন্নাহর আলো ছড়িয়ে দিই।",
  },
];

export default function HMSGoalsSection() {
  return (
    <section className="w-full border-y bg-gradient-to-b from-background via-pink-50/20 to-background py-16 md:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-heading text-3xl font-bold text-foreground md:text-4xl">
              HMS এর লক্ষ্য ও উদ্দেশ্য
            </h2>

            <div className="mb-6">
              <p className="mb-2 text-lg font-semibold text-pink-600 md:text-xl">
                🔹 HMS – Heaven Marriage Solutions
              </p>
              <p className="text-base italic text-muted-foreground md:text-lg">
                হালাল ভালোবাসার পথে এক বিশ্বস্ত রাহবার
              </p>
            </div>

            {/* Quote */}
            <div className="mx-auto max-w-3xl rounded-xl bg-gradient-to-br from-pink-50 to-purple-50/30 p-5 md:p-6">
              <p className="text-base font-medium leading-relaxed text-foreground md:text-lg">
                🌿 "বিয়ে শুধু সম্পর্ক নয়, এটা সুন্নাহ। ভালোবাসা শুধু আবেগ নয়,
                এটা ইবাদত।"
              </p>
            </div>
          </div>

          {/* Section Title */}
          <div className="mb-8 text-center">
            <h3 className="text-2xl font-bold text-foreground md:text-3xl">
              🎯 আমাদের লক্ষ্য ও দর্শন
            </h3>
          </div>

          {/* Goals Grid */}
          <div className="mb-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal, index) => (
              <Card
                key={index}
                className="group border border-border/5 bg-card  shadow-none transition-all hover:border-pink-500/50 "
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-pink-600 text-2xl shadow-lg shadow-pink-500/30">
                      {goal.emoji}
                    </div>
                  </div>

                  <h4 className="mb-3 font-heading text-base font-semibold leading-snug text-foreground md:text-lg">
                    {goal.title}
                  </h4>

                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {goal.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-6 py-3 text-sm font-medium text-pink-700 md:text-base">
              <span>🌷</span>
              <span>
                আমাদের সাথে থাকুন, সুন্নাহর আলোয় একটি বরকতময় দাম্পত্য জীবনের
                জন্য।
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
