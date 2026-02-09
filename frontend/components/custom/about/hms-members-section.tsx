// components/about/hms-members-section.tsx
import { Diamond, Sun, Flower2, ExternalLink } from "lucide-react";
import Link from "next/link";

const maleMembers = [
  { emoji: "🏰", text: "আলেম, মুফতি, দায়ী" },
  { emoji: "💼", text: "উদ্যোক্তা, প্রশাসনিক কর্মকর্তা" },
  { emoji: "🩺", text: "ডাক্তার, ইঞ্জিনিয়ার, ব্যাংকার" },
  { emoji: "📚", text: "শিক্ষক, লেখক, আইটি এক্সপার্ট" },
  { emoji: "🎤", text: "ইসলামি ইনফ্লুয়েন্সার, দীনী ভাই" },
];

const femaleMembers = [
  { emoji: "🌺", text: "হাফেজা, আলিমা, শিক্ষিকা" },
  { emoji: "🎓", text: "প্রফেশনাল, ডাক্তার, শিক্ষক" },
  { emoji: "🏡", text: "স্নেহময়ী গৃহিণী ও উদ্যোক্তা" },
  { emoji: "💗", text: "বিধবা, ডিভোর্সি, অসহায় বোন" },
];

export default function HMSMembersSection() {
  return (
    <section className="w-full bg-gradient-to-b from-purple-50/30 via-pink-50/40 to-background py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2">
              <Diamond className="h-6 w-6 text-purple-600" />
              <span className="text-sm font-semibold text-purple-700">
                আমাদের সম্প্রদায়
              </span>
            </div>

            <h2 className="mb-4 font-heading text-3xl font-bold text-foreground md:text-4xl">
              💎 Niqaha-এর নক্ষত্রসম আমাদের সদস্যরা
            </h2>

            <div className="mx-auto mb-6 h-1 w-32 rounded-full bg-gradient-to-r from-transparent via-pink-500 to-transparent" />

            <p className="mx-auto max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
              আলহামদুলিল্লাহ! Niqaha হলো একদল স্বপ্নবান হৃদয়ের কাফেলা, যারা
              হালাল প্রেমকে ইবাদত হিসেবে দেখেন।
            </p>
          </div>

          {/* Two Column Grid */}
          <div className="mb-10 grid gap-8 lg:grid-cols-2">
            {/* Male Members */}
            <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-background p-6 md:p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                  <Sun className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground md:text-2xl">
                  ☀️ পুরুষ সদস্যদের পরিচয়
                </h3>
              </div>

              <p className="mb-4 text-sm font-semibold italic text-pink-600">
                প্রতিশ্রুতির রাজপুত্র
              </p>

              <div className="mb-5 space-y-3">
                {maleMembers.map((member, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg border border-blue-200/50 bg-white/50 p-3"
                  >
                    <span className="text-2xl">{member.emoji}</span>
                    <span className="text-sm text-muted-foreground md:text-base">
                      {member.text}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-sm italic leading-relaxed text-muted-foreground">
                তাদের অন্তর জ্বলছে হালাল ভালোবাসার জন্য, ইনসাফ ও জান্নাতি
                সংসারের স্বপ্নে।
              </p>
            </div>

            {/* Female Members */}
            <div className="rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50/50 to-background p-6 md:p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-500/10">
                  <Flower2 className="h-6 w-6 text-pink-600" />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground md:text-2xl">
                  🌸 নারী সদস্যদের পরিচয়
                </h3>
              </div>

              <p className="mb-4 text-sm font-semibold italic text-pink-600">
                জান্নাতের মুকুটধারিণী
              </p>

              <div className="mb-5 space-y-3">
                {femaleMembers.map((member, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg border border-pink-200/50 bg-white/50 p-3"
                  >
                    <span className="text-2xl">{member.emoji}</span>
                    <span className="text-sm text-muted-foreground md:text-base">
                      {member.text}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-sm italic leading-relaxed text-muted-foreground">
                তাদের স্বপ্ন — জান্নাতের পথে একজন সহযোদ্ধা জীবনসঙ্গী, মাসনা ও
                সুশৃঙ্খল সংসার গড়া।
              </p>
            </div>
          </div>

          {/* Quote */}
          <div className="mb-8 rounded-xl border-l-4 border-l-purple-500 bg-purple-50/50 p-6 md:p-8">
            <p className="text-center text-base font-medium italic leading-relaxed text-foreground md:text-lg">
              "বিয়ে মানে শুধু দুটি হৃদয়ের বন্ধন নয়; এটি আখিরাতের সেতুবন্ধ,
              একটি জান্নাতি বাগান"
            </p>
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="mb-4 text-base text-muted-foreground">
              🌿 Niqaha-এর এই দীপ্ত কাফেলায় আপনার স্থানও রয়েছে।
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border-2 border-pink-500 bg-pink-500 px-6 py-3 font-heading text-base font-semibold text-white transition-all hover:bg-pink-600 hover:border-pink-600"
            >
              <span>রেজিস্ট্রেশন করুন</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
