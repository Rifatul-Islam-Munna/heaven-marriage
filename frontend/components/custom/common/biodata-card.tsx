// components/biodata-card.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  MapPin,
  Ruler,
  Cake,
  GraduationCap,
  Briefcase,
  ArrowRight,
  User2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BiodataCardProps {
  id: string;
  biodataNumber: string;
  age: number;
  height: string;
  district: string;
  upazila?: string;
  education: string;
  profession: string;
  gender: "male" | "female";
  isVerified?: boolean;
  isUrgent?: boolean;
  className?: string;
}

export default function BiodataCard({
  id,
  biodataNumber,
  age,
  height,
  district,
  upazila,
  education,
  profession,
  gender,
  isVerified = false,
  isUrgent = false,
  className,
}: BiodataCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-4 transition-all duration-200 hover:border-pink-400",
        className,
      )}
    >
      {/* Content */}
      <div className="relative">
        {/* Header Section */}
        <div className="mb-3 flex items-start justify-between">
          {/* Avatar & ID */}
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                gender === "female"
                  ? "bg-pink-100 text-pink-600"
                  : "bg-purple-100 text-purple-600",
              )}
            >
              <User2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-heading text-base font-bold text-gray-900">
                  {biodataNumber}
                </h3>
                {isVerified && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                )}
              </div>
              {isUrgent && (
                <Badge
                  variant="destructive"
                  className="mt-0.5 h-4 text-[10px] px-1.5"
                >
                  জরুরি
                </Badge>
              )}
            </div>
          </div>

          {/* Favorite Button */}
          <button
            onClick={toggleFavorite}
            className="rounded-full p-1.5 transition-colors hover:bg-pink-50"
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-all",
                isFavorite
                  ? "fill-pink-500 text-pink-500"
                  : "text-gray-400 hover:text-pink-500",
              )}
            />
          </button>
        </div>

        {/* Info Grid */}
        <div className="space-y-2">
          {/* Age & Height */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-2.5 py-2">
              <Cake className="h-3.5 w-3.5 text-pink-600" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-500">বয়স</p>
                <p className="truncate text-sm font-semibold text-gray-900">
                  {age} বছর
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-2.5 py-2">
              <Ruler className="h-3.5 w-3.5 text-purple-600" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-500">উচ্চতা</p>
                <p className="truncate text-sm font-semibold text-gray-900">
                  {height}
                </p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-2.5 py-2">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-pink-600" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-gray-500">ঠিকানা</p>
              <p className="truncate text-sm font-semibold text-gray-900">
                {upazila ? `${upazila}, ${district}` : district}
              </p>
            </div>
          </div>

          {/* Education */}
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-2.5 py-2">
            <GraduationCap className="h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-gray-500">শিক্ষাগত যোগ্যতা</p>
              <p className="truncate text-sm font-semibold text-gray-900">
                {education}
              </p>
            </div>
          </div>

          {/* Profession */}
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-2.5 py-2">
            <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-gray-500">পেশা</p>
              <p className="truncate text-sm font-semibold text-gray-900">
                {profession}
              </p>
            </div>
          </div>
        </div>

        {/* View Button */}
        <Link href={`/biodatas/${id}`} className="mt-3 block">
          <Button
            className="w-full rounded-lg bg-pink-600 font-heading text-sm font-semibold transition-colors hover:bg-pink-700"
            size="sm"
          >
            বায়োডাটা দেখুন
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
