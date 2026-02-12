"use client";
import Image from "next/image";
import {
  CheckCircle2,
  Heart,
  Users,
  Shield,
  Lock,
  UserCheck,
  Clock,
  MessageCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { WebData } from "@/@types/user";

const activities = [
  {
    icon: Users,
    title: "বিবাহ, তালাক ও দাম্পত্য জীবনের শরয়ী পরামর্শ প্রদান",
  },
  {
    icon: Shield,
    title: "উলামায়ে কেরামের মাধ্যমে নির্ভরযোগ্য ও নিরাপদ নিকাহ ব্যবস্থাপনা",
  },
  {
    icon: Heart,
    title: "পাত্র-পাত্রীর বৈধ পরিচয় ও সার্টিফিকেশন যাচাই",
  },
  {
    icon: UserCheck,
    title:
      "নিজস্ব কাজী সাহেব এবং উকিল দ্বারা কাবিন নামা / কোর্ট ম্যারেজের বৈধভাবে সরকারি রেজিষ্ট্রেশন করানো",
  },
  {
    icon: Lock,
    title: "বিবাহের দাওয়াতী মেহনত ও জনসচেতনতা তৈরি",
  },
  {
    icon: CheckCircle2,
    title:
      "দ্রুত বিবাহ ও একাধিক বিবাহকে সহজ করা ও সমাজের নেতিবাচক দৃষ্টিভঙ্গি দূরীকরণ",
  },
  {
    icon: Shield,
    title: "বিধবা, তালাকপ্রাপ্ত ও এতিম নারীদের বিবাহের সুব্যবস্থা করা",
  },
  {
    icon: Users,
    title: "প্রবাসী ও স্থানীয় পাত্রদের জন্য উপযুক্ত সমাধান প্রদান",
  },
  {
    icon: MessageCircle,
    title: "শরয়ী অভিভাবকত্ব ও ওয়াকিলের মাধ্যমে নারীদের নিরাপত্তা নিশ্চিতকরণ",
  },
  {
    icon: Clock,
    title: "এতিম, অসহায়, অভিভাবকহীন নারীদের বিশেষ সুযোগ সুবিধা প্রদান।",
  },
  {
    icon: Users,
    title:
      "গোনাহ থেকে বাঁচতে চাওয়া এরকম আল্লাহ ওয়ালা মুত্তাকী যুবকদের জন্য বিশেষ সুযোগ সুবিধার মাধ্যমে তাদের বিবাহের ব্যাবস্থা করা। (প্রয়োজনে তাদের অভিভাবকত্বের ব্যাবস্থা করা এবং উত্তম রিজিকের ব্যাবস্থা করে দেওয়া)",
  },
  {
    icon: MessageCircle,
    title:
      "যে সকল পিতা মাতা/অভিভাবক বিভিন্ন আর্থিক,সামাজিক সমস্যার কারণে তাদের অধীনস্ত ছেলে-মেয়েদের বিবাহের ব্যাবস্থা করে দিতে পারতেছেন না, তাদেরকে TMS থেকে বিশেষ সুযোগ সুবিধা প্রদানের মাধ্যমে বিবাহের ব্যাবস্থা করে দেওয়া।",
  },
];

export default function AboutSection() {
  const { data: webData, isLoading } = useQueryWrapper<WebData>(
    ["web-data"],
    "/web-data",
    { gcTime: 85000, staleTime: 85000 },
    25000,
  );
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-background via-pink-50/30 to-background pt-20 pb-10 md:pt-32 md:pb-12">
      {/* Decorative Elements */}
      <div className="absolute left-0 top-20 h-72 w-72 rounded-full bg-pink-100/50 blur-3xl" />
      <div className="absolute bottom-20 right-0 h-72 w-72 rounded-full bg-purple-100/50 blur-3xl" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-12 max-w-4xl px-4 text-center sm:mb-16 sm:px-6">
          {/* Decorative Header */}
          <div className="mb-4 flex items-center justify-center gap-2 sm:mb-6 sm:gap-3">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-pink-500 sm:w-12" />
            <Heart className="h-6 w-6 fill-pink-500 text-pink-500 sm:h-8 sm:w-8" />
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-pink-500 sm:w-12" />
          </div>

          {/* Main Heading */}
          <h2 className="font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
            মুহতারাম ও মুহতারামা!
          </h2>

          {/* Description - Split for better mobile readability */}
          <div className="mt-6 space-y-3 sm:mt-8 sm:space-y-4">
            <p className="mx-auto max-w-3xl text-[15px] leading-[1.9] text-muted-foreground sm:text-base sm:leading-[1.8] md:text-lg md:leading-relaxed lg:text-xl">
              Niqaha কোনো সাধারণ ঘটকালি প্রতিষ্ঠান নয়। এটি ইসলামী শরিয়াহ-সম্মত
              দাওয়াতী প্ল্যাটফর্ম, যেখানে বিবাহ, তালাক ও দাম্পত্য জীবনের শরয়ী
              সমাধান প্রদান করা হয়।
            </p>
            <p className="mx-auto max-w-3xl text-[15px] leading-[1.9] text-muted-foreground sm:text-base sm:leading-[1.8] md:text-lg md:leading-relaxed lg:text-xl">
              আমরা কেবল বিবাহ সম্পন্ন করাই না, বরং একটি সুখী, বরকতময় ও টেকসই
              দাম্পত্য জীবন গঠনে সহায়তা করি।
            </p>
            <p className="mx-auto max-w-3xl text-[15px] leading-[1.9] text-muted-foreground sm:text-base sm:leading-[1.8] md:text-lg md:leading-relaxed lg:text-xl">
              আমাদের লক্ষ্য ইসলামী অনুশাসন মেনে বিবাহকে সহজ করা, হারাম থেকে
              বাঁচানো এবং সুন্নাহ অনুযায়ী পরিবার গঠন করা।
            </p>
          </div>
        </div>

        {/* Image Grid */}
        <div className="mx-auto mb-20 grid max-w-6xl gap-6 md:grid-cols-2">
          <Card className="group overflow-hidden border-none p-0 shadow-lg transition-all hover:shadow-xl">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={webData?.home?.images?.left ?? ""}
                alt="Wedding ceremony"
                width={1000}
                height={1000}
                className="object-conatin transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <Badge className="bg-pink-500/90 backdrop-blur-sm">
                  বিবাহের মুহূর্ত
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="group overflow-hidden border-none p-0 shadow-lg transition-all hover:shadow-xl">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={webData?.home?.images?.right ?? ""}
                alt="Islamic marriage"
                width={1000}
                height={1000}
                className="object-contain transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <Badge className="bg-pink-500/90 backdrop-blur-sm">
                  সুন্নাহ অনুসারে
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Activities Section */}
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h3 className="font-heading text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
              আমাদের কার্যক্রম
            </h3>
            <p className="mt-4 text-lg text-muted-foreground">
              যেভাবে আমরা আপনাদের সেবা প্রদান করি
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <Card
                  key={index}
                  className="group border border-border/2 bg-card/50 backdrop-blur-sm transition-all hover:border-pink-500/50  shadow-none "
                >
                  <CardContent className="flex gap-4 p-6">
                    <div className="flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-pink-500/10 transition-colors group-hover:bg-pink-500/20">
                        <Icon className="h-6 w-6 text-pink-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed text-foreground/90">
                        {activity.title}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-6 py-3 text-sm font-medium text-pink-700">
            <CheckCircle2 className="h-5 w-5" />
            <span>১০০% শরিয়াহ সম্মত ও নিরাপদ সেবা</span>
          </div>
        </div>
      </div>
    </section>
  );
}
