// components/registration-section-list.tsx
import { Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const requirements = [
  "নির্দিষ্ট রেজিস্ট্রেশন ফি পরিশোধ করে আবেদন করতে হবে। পুরুষ সদস্যদের জন্য রেজিষ্ট্রেশন ফী মাত্র ১০০০ টাকা (অফার মূল্য ৫০০ টাকা, এটি আগামী ঈদুল আজহা পর্যন্ত বহাল থাকবে), মহিলা সদস্যদের জন্য ঈদুল আজহা পর্যন্ত সম্পূর্ণ ফ্রী রেজিষ্ট্রেশন। তাছাড়াও দুঃস্থ অসহায়, আর্থিকভাবে অস্বচ্ছল দ্বীনদার পুরুষদের জন্য রেজিষ্ট্রেশন সম্পূর্ণ ফ্রী থাকবে ইনশাআল্লাহ।",
  "বিবাহের জন্য নির্ধারিত শর্তাবলী পূরণ করে ফরম জমা দিতে হবে।",
  "প্রত্যেক আবেদন যাচাই-বাছাই করে অনুমোদিত হলে বিবাহ প্রক্রিয়া শুরু হবে।",
];

export default function RegistrationSection() {
  return (
    <section className="w-full border-y bg-background py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto mb-8 max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 text-pink-600">
            <Heart className="h-5 w-5 fill-pink-600" />
            <span className="text-sm font-medium">
              HMS-এর মাধ্যমে বিবাহ করার আবেদন হতে হলে:
            </span>
          </div>

          <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
            বিবাহ প্রক্রিয়া ও শর্তাবলী
          </h2>
        </div>

        {/* Requirements List */}
        <div className="mx-auto max-w-4xl space-y-4">
          {requirements.map((requirement, index) => (
            <div
              key={index}
              className="group flex gap-4 border-l-2 border-pink-500/30 bg-card/50 p-5 transition-all hover:border-pink-500 hover:bg-card"
            >
              {/* Number Circle */}
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/10 text-sm font-bold text-pink-600 transition-colors group-hover:bg-pink-500 group-hover:text-white">
                  {index + 1}
                </div>
              </div>

              {/* Text */}
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground md:text-base">
                {requirement}
              </p>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="mt-10 text-center">
          <Button
            size="lg"
            className="group h-12 bg-pink-600 px-8 font-heading text-base font-semibold  shadow-pink-600/30 transition-all hover:scale-105 hover:bg-pink-700"
            asChild
          >
            <Link href="/contact" className="inline-flex items-center gap-2">
              রেজিস্ট্রেশন
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
