"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { professionOptions } from "@/staticData/all-data";

interface BiodataCardProps {
  id: string;
  biodataNumber: string;
  age: number;
  height: string | number;
  district: string;
  upazila?: string;
  education: string;
  profession: string;
  skinTone?: string;
  gender: "male" | "female";
  isVerified?: boolean;
  className?: string;
  isForShortList?: boolean;
}

// Helper function to convert height to Bangla format
const formatHeightToBangla = (height: string | number): string => {
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

  const heightStr = String(height);
  const [feet, inches] = heightStr.split(".");

  const banglaFeet = feet
    .split("")
    .map((d) => banglaDigits[parseInt(d)])
    .join("");
  const banglaInches = inches
    ? inches
        .split("")
        .map((d) => banglaDigits[parseInt(d)])
        .join("")
    : "০";

  return `${banglaFeet}' ${banglaInches}"`;
};

export default function BiodataCard({
  id,
  biodataNumber,
  age,
  height,
  district,
  upazila,
  education,
  profession,
  skinTone,
  gender,
  isVerified = false,
  className,
  isForShortList,
}: BiodataCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const client = useQueryClient();

  const { mutate, isPending } = useCommonMutationApi({
    method: "POST",
    url: "/user/add-to-shortlist",
    mutationKey: ["add-to-shortlist"],
    successMessage: "Added to shortlist",
    onSuccess() {
      setIsFavorite(true);
      client.refetchQueries({ queryKey: ["get-shortlist"], exact: false });
    },
  });

  const toggleFavorite = () => {
    mutate({ shortlistedUserId: id });
  };

  const displayUserId =
    gender === "male" ? `NG-${biodataNumber}` : `NB-${biodataNumber}`;

  return (
    <div
      className={cn(
        "relative rounded-2xl border w-full border-gray-200  bg-white p-4 transition-all hover:shadow-lg",
        className,
      )}
    >
      {/* Main Layout: 3-Column Grid */}
      <div className="flex items-end gap-3">
        <div className=" flex gap-3  lg:gap-4 items-center  flex-1">
          {/* LEFT: Avatar */}
          <div className="flex-shrink-0">
            <Image
              src={gender === "male" ? "/male.png" : "/female.png"}
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
              alt="avatar"
            />
          </div>

          {/* MIDDLE: User ID + Info (flex-1) */}
          <div className="min-w-0">
            {/* User ID */}
            <h3 className="text-lg font-bold text-gray-900 mb-1.5">
              {displayUserId}
            </h3>

            {/* Details */}
            <div className="space-y-0.5 text-sm text-gray-700">
              <p>
                <span className="text-gray-500">বয়স - </span>
                <span className="font-medium">
                  {age?.toLocaleString("bn-BD")}
                </span>
              </p>
              <p>
                <span className="text-gray-500">উচ্চতা - </span>
                <span className="font-medium">
                  {formatHeightToBangla(height)}
                </span>
              </p>
              {gender === "female" ? (
                <p>
                  <span className="text-gray-500">গাত্রবর্ণ - </span>
                  <span className="font-medium">{skinTone || "N/A"}</span>
                </p>
              ) : (
                <p>
                  <span className="text-gray-500">পেশা - </span>
                  <span className="font-medium">
                    {professionOptions.find((p) => p.value === profession)
                      ?.label || "N/A"}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
        {/* RIGHT: Button (Bottom-aligned) */}
        <div className="flex-shrink-0 flex items-end">
          <Link href={`/biodata/${id}`}>
            <Button
              className="rounded-full bg-gradient-to-r from-pink-500 to-pink-600 px-4 py-2 text-sm font-medium hover:from-pink-600 hover:to-pink-700"
              size="sm"
            >
              বায়োডাটা
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
