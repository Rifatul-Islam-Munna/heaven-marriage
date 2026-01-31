// components/about/expat-message-section-split.tsx
import { Globe, CheckCircle2 } from "lucide-react";

export default function ExpatMessageSectionSplit() {
  return (
    <section className="w-full border-y py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <Globe className="mx-auto mb-4 h-12 w-12 text-green-600" />
            <h2 className="mb-3 font-heading text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
              🌍 দেশ ও প্রবাসের আবেদনকারীদের জন্য বিশেষ বার্তা
            </h2>
            <div className="mx-auto h-1 w-32 rounded-full bg-gradient-to-r from-transparent via-green-500 to-transparent" />
          </div>

          {/* Content Grid */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Greeting */}
              <div className="rounded-xl bg-green-50/50 p-6">
                <p className="mb-4 text-base leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    প্রিয় মুহতারাম/মুহতারিমা,
                  </span>
                  <br />
                  আলহামদুলিল্লাহ! আমাদের HMS প্ল্যাটফর্মে দেশের পাশাপাশি প্রবাস
                  থেকেও অসংখ্য ভাই-বোন রেজিস্ট্রেশন করছেন।
                </p>

                {/* Features */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
                    <span>
                      সম্পূর্ণ অনলাইন-ভিত্তিক এবং ডিজিটাল-ফ্রেন্ডলি সিস্টেম
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
                    <span>শুধু সাইনআপ এবং রেজিস্ট্রেশন করলেই সদস্যপদ</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
                    <span>অফিসে আসার কোনো বাধ্যবাধকতা নেই</span>
                  </div>
                </div>
              </div>

              {/* Office Visit */}
              <div className="rounded-lg border-l-4 border-l-blue-500 bg-blue-50/50 p-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  🤝{" "}
                  <span className="font-semibold text-foreground">
                    অফিসে আসা সম্পূর্ণ ঐচ্ছিক।
                  </span>{" "}
                  মূল লক্ষ্য: দেশ বা প্রবাস—সবাই যেন হালাল বিয়ের সহজ ও নিরাপদ
                  সমাধান পায়।
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Expat Benefits */}
              <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50/50 p-6">
                <h3 className="mb-4 font-heading text-lg font-bold text-foreground md:text-xl">
                  🌟 প্রবাসীদের জন্য বিশেষ সুবিধা:
                </h3>

                <div className="space-y-3">
                  <div className="text-sm leading-relaxed text-muted-foreground">
                    💻 অনলাইনে সাইনআপ ও রেজিস্ট্রেশন করে ঘরে বসেই ভেরিফাই
                  </div>
                  <div className="text-sm leading-relaxed text-muted-foreground">
                    🎥 প্রয়োজন হলে ভিডিও কনফারেন্স বা WhatsApp-এ সরাসরি কথা
                    বলার সুযোগ
                  </div>
                  <div className="text-sm leading-relaxed text-muted-foreground">
                    🛡️ সম্পূর্ণ নিরাপদ, শরীয়াহসম্মত এবং স্বচ্ছ সিস্টেম
                  </div>
                </div>
              </div>

              {/* Special Request */}
              <div className="rounded-lg border border-pink-200 bg-pink-50/50 p-5">
                <h4 className="mb-2 font-heading text-base font-semibold text-foreground">
                  💬 বিশেষ অনুরোধ:
                </h4>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  দয়া করে সঠিক তথ্য দিয়ে প্রোফাইল সাবমিট করুন এবং ধৈর্য রাখুন।
                  ইনশাআল্লাহ, দ্রুত প্রোফাইল ভেরিফাইড করে সুবিধাগুলো একটিভ করে
                  দেওয়া হবে।
                </p>
              </div>
            </div>
          </div>

          {/* Footer Quote */}
          <div className="mt-8 text-center">
            <p className="text-base font-medium italic text-green-700">
              🌿 "হালাল প্রেমের শুরু হোক সহজ ও স্বচ্ছ এক যাত্রায়..."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
