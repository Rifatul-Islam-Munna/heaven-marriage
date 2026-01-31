// components/hms-benefits-section.tsx
import { CheckCircle2, Shield, Sparkles, Award, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const benefits = [
  {
    icon: Shield,
    title: "দ্রুত সেবা",
    description: "২৪ ঘণ্টার মধ্যে ফিডব্যাক পাওয়ার নিশ্চয়তা",
  },
  {
    icon: CheckCircle2,
    title: "সমান সুযোগ",
    description: "পুরুষ নারীকে এবং নারীও পুরুষকে প্রস্তাব পাঠাতে পারবেন",
  },
  {
    icon: Sparkles,
    title: "অনলাইন সুবিধা",
    description:
      "অফিসে না আসতে পারলেও অনলাইনে রেজিস্ট্রেশন ও ভেরিফিকেশন সুবিধা",
  },
  {
    icon: Award,
    title: "সাশ্রয়ী মূল্য",
    description:
      "প্রত্যেক প্রস্তাবের জন্য আলাদা ফি লাগবে না, বরং মাসিক প্যাকেজের মাধ্যমে সুবিধা গ্রহণ করা যাবে",
  },
  {
    icon: CheckCircle2,
    title: "বিনামূল্যে শুরু",
    description:
      "শুধুমাত্র রেজিস্ট্রেশন ফি দিয়েই প্রাথমিকভাবে বিনামূল্যে প্রস্তাব পাঠানোর সুযোগ",
  },
  {
    icon: Sparkles,
    title: "ক্যাটাগরি ভিত্তিক",
    description:
      "নারী-পুরুষ উভয়ের জন্য ক্যাটাগরিভিত্তিক পাত্র-পাত্রীর তথ্য বিশ্লেষণের সুবিধা",
  },
  {
    icon: Shield,
    title: "গোপনীয়তা",
    description: "বিশেষভাবে গোপনীয়তা রক্ষার নিশ্চয়তা",
  },
  {
    icon: Award,
    title: "শরিয়াহ সম্মত",
    description:
      "HMS-এর মাধ্যমে স্বল্প খরচে শরিয়তসম্মত সুন্নাহ মোতাবেক বিবাহের সুযোগ",
  },
  {
    icon: Sparkles,
    title: "সহজ ব্যবস্থাপনা",
    description:
      "HMS-এর ওয়েবসাইটে পুরুষ ও নারীদের সিভি আলাদা আলাদা ক্যাটাগরাইজ অনুযায়ী হওয়ার কারণে খোঁজাখুঁজির ঝামেলা থেকে মুক্ত।",
  },
  {
    icon: CheckCircle2,
    title: "সব এক জায়গায়",
    description:
      "ব্যবহারকারীকে হোয়াটসঅ্যাপ বা টেলিগ্রামে আলাদা করে যোগাযোগ করতে হবে না — সবকিছু ওয়েবসাইটেই সম্পন্ন করা যাবে",
  },
  {
    icon: Award,
    title: "তাৎক্ষণিক প্রতিক্রিয়া",
    description:
      "পছন্দের কাউকে সরাসরি প্রস্তাব পাঠানো যাবে ওয়েবসাইট থেকেই, এবং যাকে প্রস্তাব পাঠানো হয়েছে, তিনি সেটি ওয়েবসাইটেই একসেপ্ট বা রিজেক্ট করতে পারবেন",
  },
  {
    icon: Sparkles,
    title: "সম্পূর্ণ নিয়ন্ত্রণ",
    description:
      "ইচ্ছে মতো নিজের প্রোফাইল ইউজ ও নিয়ন্ত্রণ করার সুবিধা আছে, নিজের প্রোফাইল নিজেই এডিট করতে পারবেন — কোনো বাড়তি ঝামেলা নেই",
  },
  {
    icon: CheckCircle2,
    title: "ইউজার-ফ্রেন্ডলি",
    description:
      "অতি সহজ ও ইউজার-ফ্রেন্ডলি ইন্টারফেস, যা প্রযুক্তি-অভিজ্ঞ নন এমন ব্যবহারকারীদের জন্যও উপযোগী। শুধু কষ্ট করে ফর্মটা ভালো করে পূরণ করতে হবে।",
  },
  {
    icon: Shield,
    title: "নিরাপদ ও নির্ভরযোগ্য",
    description:
      "প্রতিটি প্রোফাইল শারঈ যাচাইয়ের মাধ্যমে নিরাপদ ও বিশ্বাসযোগ্য করা হয়।",
  },
];

export default function HMSBenefitsSection() {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-background via-pink-50/20 to-background py-16 md:py-24">
      {/* Decorative Elements - All Pink */}
      <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-pink-200/20 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-pink-300/20 blur-3xl" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto mb-12 max-w-4xl text-center">
          {/* Badge with Icon */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-pink-100 px-4 py-2 text-sm font-medium text-pink-700">
            <Heart className="h-4 w-4 fill-pink-600 text-pink-600" />
            <span>আমাদের মাধ্যমে বিবাহ করলে আপনি যা যা সুবিধা পাবেন</span>
          </div>

          <h2 className="font-heading text-4xl font-bold leading-tight text-foreground sm:text-5xl md:text-6xl">
            কেনো <span className="text-pink-600">HMS</span>
            -এর মাধ্যমে বিবাহ করবেন?
          </h2>

          <p className="mt-4 text-lg text-muted-foreground">
            আধুনিক প্রযুক্তি ও ইসলামিক মূল্যবোধের সমন্বয়ে নিরাপদ বিবাহ সেবা
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <Card
                key={index}
                className="group border border-border/5 bg-card/80 shadow-none backdrop-blur-sm transition-all hover:border-pink-500/50  hover:shadow-pink-500/10"
              >
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {/* Icon + Title */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 shadow-lg shadow-pink-500/30">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-heading text-lg font-semibold text-foreground">
                          {benefit.title}
                        </h3>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section - All Pink */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-6 py-3 text-sm font-medium text-pink-700">
            <CheckCircle2 className="h-5 w-5 text-pink-600" />
            <span>সম্পূর্ণ শরিয়াহ সম্মত ও নিরাপদ প্ল্যাটফর্ম</span>
          </div>
        </div>
      </div>
    </section>
  );
}
