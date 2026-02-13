"use client";

import { Plus, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CreateBiodataSection() {
  const router = useRouter();
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50 py-16 md:py-24">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-pink-200/30 blur-3xl md:h-60 md:w-60" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-purple-200/30 blur-3xl md:h-60 md:w-60" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        {/* Heading */}
        <h2 className="mb-8 text-center text-2xl font-bold leading-tight text-foreground md:mb-12 md:text-3xl lg:text-4xl">
          <span className="text-pink-600">niqaha-তে</span> সম্পূর্ণ বিনামূল্যে{" "}
          বায়োডাটা তৈরি করা যায়
        </h2>

        {/* Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          {/* Create Biodata Button */}
          <Button
            asChild
            size="lg"
            className="group h-12 w-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 text-base font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl sm:h-14 sm:w-auto sm:text-lg"
          >
            <Link href="/signup">
              <Plus className="mr-2 h-5 w-5 transition-transform group-hover:rotate-90" />
              বায়োডাটা তৈরি করুন
            </Link>
          </Button>

          {/* Watch Tutorial Button */}
          <Button
            asChild
            variant="outline"
            size="lg"
            className="group h-12 w-full border-2 border-pink-600 bg-white px-8 text-base font-semibold text-pink-600 shadow-md transition-all hover:bg-pink-50 hover:scale-105 hover:shadow-lg sm:h-14 sm:w-auto sm:text-lg"
          >
            <Link
              href="https://www.facebook.com/share/v/1FfQ7w7gZM/?mibextid=wwXIfr"
              target="_blank"
            >
              <Youtube className="mr-2 h-5 w-5 text-red-600 transition-transform group-hover:scale-110" />
              যেভাবে বায়োডাটা তৈরি করবেন
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
