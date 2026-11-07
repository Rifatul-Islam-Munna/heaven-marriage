"use client";

import { Youtube } from "lucide-react";
import BiodataCreationCta from "./BiodataCreationCta";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CreateBiodataSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50 py-10 md:py-12">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-pink-200/30 blur-3xl md:h-60 md:w-60" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-purple-200/30 blur-3xl md:h-60 md:w-60" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        {/* Heading */}
        <h2 className="mb-5 text-center text-2xl font-bold leading-tight text-foreground md:mb-6 md:text-3xl">
          <span className="text-pink-600">niqaha-তে</span> সম্পূর্ণ বিনামূল্যে{" "}
          বায়োডাটা তৈরি করা যায়
        </h2>

        {/* Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          {/* Creating another person's biodata requires a separate account. */}
          <BiodataCreationCta />

          {/* Watch Tutorial Button */}
          <Button
            asChild
            variant="outline"
            size="lg"
            className="group min-h-11 w-full rounded-full border border-pink-200 bg-white px-6 text-sm font-semibold text-pink-700 shadow-sm transition-colors hover:bg-pink-50 sm:w-auto"
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
