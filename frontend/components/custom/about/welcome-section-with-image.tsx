"use client";
import Image from "next/image";
import { CheckCircle2, Heart } from "lucide-react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { WebData } from "@/@types/user";

const features = [
  "Niqaha কোনো সাধারণ ঘটকালি প্রতিষ্ঠান নয়",
  "ইসলামী শরিয়াহ-সম্মত দায়িত্বশীল প্ল্যাটফর্ম",
  "বিবাহ, তালাক ও দাম্পত্য জীবনের পরামর্শ সেবা",
  "সুখী, বরকতময় ও টেকসই দাম্পত্য জীবন গঠনে সহায়তা",
  "নবীজির সুন্নাহ অনুযায়ী পরিবার গঠন",
];

export default function WelcomeSectionWithImage() {
  const { data: webData, isLoading } = useQueryWrapper<WebData>(
    ["web-data"],
    "/web-data",
    { gcTime: 85000, staleTime: 85000 },
    25000,
  );
  return (
    <section className="w-full py-8 md:py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 text-pink-600">
            <Heart className="h-5 w-5 fill-pink-600" />
            <span className="text-sm font-medium">স্বাগতম</span>
          </div>
          <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
            মুহতারাম/মুহতারামা!
          </h2>
        </div>

        {/* Content Grid */}
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left: Image */}
          <div className="relative order-2 lg:order-1">
            <div className="relative overflow-hidden rounded-2xl shadow-2xl">
              <div className="relative aspect-[4/3]">
                <Image
                  src={webData?.about?.images?.left || "/footer_image.png"}
                  alt="Islamic Marriage"
                  width={1000}
                  height={1000}
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                {/* Overlay Badge */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="rounded-xl bg-white/95 p-4 backdrop-blur-sm">
                    <p className="text-sm font-semibold text-foreground">
                      ইসলামী মূল্যবোধের আলোকে
                    </p>
                    <p className="text-xs text-muted-foreground">
                      বিশ্বস্ত বিবাহ সেবা প্ল্যাটফর্ম
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Content */}
          <div className="order-1 flex flex-col justify-center lg:order-2">
            <div className="space-y-6">
              {/* Greeting */}
              <div className="rounded-lg border-l-4 border-l-pink-500 bg-pink-50/50 p-5">
                <p className="text-base leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    আসসালামু আলাইকুম।
                  </span>{" "}
                  আপনারা ইতিপূর্বে অবগত আছেন যে Niqaha কোনো সাধারণ ঘটকালি
                  প্রতিষ্ঠান নয়। এটি ইসলামী শরিয়াহ-সম্মত দায়িত্বশীল
                  প্ল্যাটফর্ম।
                </p>
              </div>

              {/* Main Description */}
              <p className="text-base leading-relaxed text-muted-foreground">
                যেখানে বিবাহ, তালাক ও দম্পত্য জীবনের পরামর্শ সমাধান প্রদান করা
                হয়। আমরা কেবল বিবাহ সম্পন্ন করাই না, বরং একটি সুখী, বরকতময় ও
                টেকসই দাম্পত্য জীবন গঠনে সহায়তা করি।
              </p>

              {/* Features List */}
              <div className="space-y-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-500/10">
                        <CheckCircle2 className="h-4 w-4 text-pink-600" />
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {feature}
                    </p>
                  </div>
                ))}
              </div>

              {/* Goal Statement */}
              <div className="rounded-lg bg-gradient-to-br from-pink-50 to-purple-50/30 p-5">
                <p className="text-sm font-medium leading-relaxed text-foreground">
                  আমাদের লক্ষ্য: ইসলামী অনুশাসন মেনে বিবাহকে সহজ করা, যেমনটা
                  নবীজির সুন্নাহ অনুযায়ী পরিবার গঠন করা।
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
