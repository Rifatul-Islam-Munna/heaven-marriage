"use client";
import Image from "next/image";
import { Quote } from "lucide-react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { WebData } from "@/@types/user";

export default function HMSIntroductionSectionV2() {
  const { data: webData, isLoading } = useQueryWrapper<WebData>(
    ["web-data"],
    "/web-data",
    { gcTime: 85000, staleTime: 85000 },
    25000,
  );
  return (
    <section className="w-full border-y bg-background py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Title with Underline */}
          <div className="mb-10 text-center">
            <h2 className="mb-3 font-heading text-3xl font-bold text-foreground md:text-4xl">
              HMS এর পরিচিতি
            </h2>
            <div className="mx-auto h-1 w-32 rounded-full bg-gradient-to-r from-transparent via-pink-500 to-transparent" />
          </div>

          {/* Image First, Content Below */}
          <div className="space-y-8">
            {/* Image Section */}
            <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl shadow-2xl">
              <div className="relative aspect-[16/9]">
                <Image
                  src={webData?.about?.images?.right || ""}
                  alt="HMS Introduction"
                  width={1000}
                  height={1000}
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Quote Overlay */}
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="flex items-start gap-3 rounded-xl bg-white/95 p-5 backdrop-blur-sm">
                    <Quote className="h-8 w-8 flex-shrink-0 text-pink-500" />
                    <div>
                      <p className="font-heading text-lg font-semibold text-foreground">
                        ইসলামী শরিয়াহ-সম্মত দায়িত্বশীল প্ল্যাটফর্ম
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Heaven Marriage Solutions
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="mx-auto max-w-4xl">
              <div className="rounded-2xl border-l-4 border-l-pink-500 bg-gradient-to-br from-pink-50/50 to-background p-6  md:p-8">
                <p className="mb-4 text-base leading-relaxed text-muted-foreground md:text-lg">
                  <span className="font-semibold text-foreground">HMS</span>{" "}
                  কোনো সাধারণ ঘটকালি প্রতিষ্ঠান নয়। এটি ইসলামী শরিয়াহ-সম্মত
                  দায়িত্বশীল প্ল্যাটফর্ম। যেখানে বিবাহ, তালাক ও দম্পত্য জীবনের
                  পরামর্শ সমাধান প্রদান করা হয়।
                </p>

                <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                  আমরা কেবল বিবাহ সম্পন্ন করাই না, বরং একটি সুখী, বরকতময় ও
                  টেকসই দাম্পত্য জীবন গঠনে সহায়তা করি। আমাদের লক্ষ্য ইসলামী
                  অনুশাসন মেনে বিবাহকে সহজ করা, যেমনটা থেকে বাচ্চানো এবং সুন্নাহ
                  অনুযায়ী পরিবার গঠন করা।
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
