"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquareQuoteIcon as MessageSquareQuestion,
  Search,
} from "lucide-react";
import Link from "next/link";

interface Faq {
  _id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export default function FaqPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all FAQs
  const { data: faqs, isLoading } = useQueryWrapper<Faq[]>(["faqs"], "/faq");

  // Filter FAQs based on search - searches in both title and description
  const filteredFaqs = faqs?.filter((faq) => {
    const query = searchQuery.toLowerCase();
    return (
      faq.title.toLowerCase().includes(query) ||
      faq.description.toLowerCase().includes(query)
    );
  });

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="container max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-16 w-64 mx-auto" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8 sm:py-12 px-4">
      <div className="container max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 sm:space-y-4 border-b pb-6 sm:pb-8">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 sm:p-4 bg-pink-600 rounded-full">
              <MessageSquareQuestion className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-gray-900">
            সাধারণ জিজ্ঞাসা
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 font-heading max-w-2xl mx-auto">
            আপনার প্রশ্নের উত্তর খুঁজে নিন
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="টাইটেল বা বিবরণ থেকে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 sm:h-14 text-base border-gray-300 focus:border-pink-500 focus:ring-pink-500 rounded-lg"
          />
        </div>

        {/* FAQ Accordion */}
        {!filteredFaqs || filteredFaqs.length === 0 ? (
          <div className="border border-gray-200 rounded-lg">
            <div className="py-16 sm:py-20 text-center">
              <MessageSquareQuestion className="h-14 w-14 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-base sm:text-lg text-gray-800 ">
                {searchQuery
                  ? "কোন প্রশ্ন পাওয়া যায়নি"
                  : "এখনো কোন FAQ যোগ করা হয়নি"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Accordion type="single" collapsible className="space-y-3">
              {filteredFaqs.map((faq, index) => (
                <AccordionItem
                  key={faq._id}
                  value={faq._id}
                  className="border border-gray-200 rounded-lg px-4 sm:px-6 bg-white hover:border-pink-300 transition-colors"
                >
                  <AccordionTrigger className="hover:no-underline py-4 sm:py-5">
                    <div className="flex items-start gap-3 sm:gap-4 text-left pr-4">
                      <div className=" w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-pink-500 flex items-center justify-center text-white font-semibold text-base">
                        {index + 1}
                      </div>
                      <span className=" font-semibold text-sm sm:text-base lg:text-lg text-gray-900 leading-relaxed">
                        {faq.title}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 sm:pb-6 pl-10 sm:pl-12 pr-4">
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-sm sm:text-base text-gray-700 leading-relaxed  whitespace-pre-wrap">
                        {faq.description}
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Results Count */}
            {searchQuery && (
              <div className="text-center pt-2">
                <p className="text-sm text-gray-500 ">
                  {filteredFaqs.length} টি ফলাফল পাওয়া গেছে
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer Note */}
        <div className="text-center border-t pt-8">
          <p className="text-sm text-gray-600 ">
            আরও প্রশ্ন থাকলে{" "}
            <Link
              href="/contact"
              className="text-pink-600 hover:text-pink-700 font-semibold hover:underline transition-colors"
            >
              যোগাযোগ করুন
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
