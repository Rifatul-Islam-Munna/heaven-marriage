"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileStore } from "@/zustan/useProfileStore";
import { skinColorOptions } from "@/staticData/all-data";

const educationalOptions = [
  {
    id: 1,
    bn: "আলেমা + হাফেজা",
    en: "Alema + Hafeza",
  },
  {
    id: 2,
    bn: "আলেমা",
    en: "Alema",
  },
  {
    id: 3,
    bn: "হাফেজা",
    en: "Hafeza",
  },
  {
    id: 4,
    bn: "মাদ্রাসা পড়ুয়া",
    en: "Madrasa Student",
  },
  {
    id: 5,
    bn: "দ্বীনদার জেনারেল শিক্ষিত",
    en: "Religious General Educated",
  },
  {
    id: 6,
    bn: "জেনারেল শিক্ষিত",
    en: "General Educated",
  },
  {
    id: 7,
    bn: "হোম স্কুলিং",
    en: "Home Schooling",
  },
  {
    id: 8,
    bn: "যেকোনো",
    en: "Any",
  },
  {
    id: 9,
    bn: "শিক্ষাগত ব্যাকগ্রাউন্ডের ব্যাপারে কোনো সমস্যা নেই।",
    en: "No issue regarding educational background",
  },
];

const maritalStatusOptions = [
  // --- Women (From Image) ---
  {
    id: 1,
    gender: "female",
    bn: "বাকেরা (অবিবাহিতা)",
    en: "Bakira (Never Married)",
  },
  {
    id: 2,
    gender: "female",
    bn: "ছাইয়্যেবা (ডিভোর্সী, বিধবা) সন্তানসহ",
    en: "Sayyiba (Divorced/Widow) with children",
  },
  {
    id: 3,
    gender: "female",
    bn: "ছাইয়্যেবা (ডিভোর্সী, বিধবা) সন্তান ছাড়া",
    en: "Sayyiba (Divorced/Widow) without children",
  },
  {
    id: 4,
    gender: "female",
    bn: "বন্ধ্যা (অবিবাহিতা, ডিভোর্সী, বিধবা)",
    en: "Barren (Never Married/Divorced/Widow)",
  },

  // --- Men (Added Parallel) ---
  {
    id: 5,
    gender: "male",
    bn: "আইয়্যেম (অবিবাহিত)",
    en: "Ayam (Never Married)",
  },
  {
    id: 6,
    gender: "male",
    bn: "ডিভোর্সী/বিপত্নীক (সন্তানসহ)",
    en: "Divorced/Widower (with children)",
  },
  {
    id: 7,
    gender: "male",
    bn: "ডিভোর্সী/বিপত্নীক (সন্তান ছাড়া)",
    en: "Divorced/Widower (without children)",
  },
  {
    id: 8,
    gender: "male",
    bn: "অক্ষম/বন্ধ্যা (অবিবাহিত, ডিভোর্সী, বিপত্নীক)",
    en: "Infertility Issues (Never Married/Divorced/Widower)",
  },

  // --- Neutral ---
  {
    id: 9,
    gender: "any",
    bn: "যেকোনো",
    en: "Any",
  },
];

const familyBackgroundOptions = [
  {
    id: 1,
    bn: "উচ্চবিত্ত",
    en: "Upper Class",
  },
  {
    id: 2,
    bn: "উচ্চ-মধ্যবিত্ত",
    en: "Upper-Middle Class",
  },
  {
    id: 3,
    bn: "মধ্যবিত্ত",
    en: "Middle Class",
  },
  {
    id: 4,
    bn: "নিম্ন-মধ্যবিত্ত",
    en: "Lower-Middle Class",
  },
  {
    id: 5,
    bn: "গরিব/বিত্তহীন",
    en: "Poor/Underprivileged",
  },
  {
    id: 6,
    bn: "যেকোনো",
    en: "Any",
  },
];

// Height options from 4'4" to 7'0"
const generateHeightOptions = () => {
  const heights = [];
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

  const toBanglaNumber = (num: number) => {
    return num
      .toString()
      .split("")
      .map((digit) => banglaDigits[parseInt(digit)])
      .join("");
  };

  for (let feet = 4; feet <= 7; feet++) {
    const maxInches = feet === 7 ? 0 : 11;
    for (let inches = 0; inches <= maxInches; inches++) {
      if (feet === 4 && inches < 4) continue; // Start from 4'4"

      // Value format: 5.6 (means 5 feet 6 inches)
      const enValue = `${feet}.${inches}`;
      const bnLabel = `${toBanglaNumber(feet)} ফুট ${toBanglaNumber(inches)} ইঞ্চি`;

      heights.push({
        value: enValue,
        label: bnLabel,
        searchText: `${feet} ${inches} ${feet}.${inches} ${bnLabel}`, // For better search
      });
    }
  }

  return heights;
};

const heightOptions = generateHeightOptions();

interface ExpectedPartnerStepProps {
  partnerGender?: "male" | "female" | "any";
}

export function ExpectedPartnerStep({
  partnerGender = "any",
}: ExpectedPartnerStepProps) {
  const formData = useProfileStore((state) => state.formData);
  const updateNestedField = useProfileStore((state) => state.updateNestedField);
  const [heightOpen, setHeightOpen] = useState(false);

  // Filter options based on partner gender
  const filteredSkinColorOptions = skinColorOptions.filter(
    (option) =>
      option.gender === "both" ||
      option.gender === partnerGender ||
      partnerGender === "any",
  );

  const filteredMaritalStatusOptions = maritalStatusOptions.filter(
    (option) =>
      option.gender === partnerGender ||
      option.gender === "any" ||
      partnerGender === "any",
  );

  const filteredEducationalOptions =
    partnerGender === "male"
      ? educationalOptions.map((opt) => ({
          ...opt,
          bn: opt.bn
            .replace("আলেমা", "আলেম")
            .replace("হাফেজা", "হাফেজ")
            .replace("পড়ুয়া", "পড়ুয়া"),
        }))
      : educationalOptions;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="partnerAge">বয়স</Label>
          <Input
            id="partnerAge"
            value={formData.expectedLifePartner?.age || ""}
            onChange={(e) =>
              updateNestedField("expectedLifePartner", "age", e.target.value)
            }
            placeholder="যেমন: ২৫-৩০"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="complexion">গাত্রবর্ণ</Label>
          <Select
            value={formData.expectedLifePartner?.complexion || ""}
            onValueChange={(value) =>
              updateNestedField("expectedLifePartner", "complexion", value)
            }
          >
            <SelectTrigger id="complexion">
              <SelectValue placeholder="গাত্রবর্ণ নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {filteredSkinColorOptions.map((option) => (
                <SelectItem key={option.value} value={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="partnerHeight">উচ্চতা</Label>
          <Input
            id="partnerHeight"
            placeholder="উচ্চতা লিখুন (যেমন: 5'6'')"
            value={formData.expectedLifePartner?.height || ""}
            onChange={(e) => {
              updateNestedField(
                "expectedLifePartner",
                "height",
                e.target.value,
              );
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="partnerEducation">শিক্ষাগত যোগ্যতা</Label>
          <Select
            value={formData.expectedLifePartner?.education || ""}
            onValueChange={(value) =>
              updateNestedField("expectedLifePartner", "education", value)
            }
          >
            <SelectTrigger id="partnerEducation">
              <SelectValue placeholder="শিক্ষাগত যোগ্যতা নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {filteredEducationalOptions.map((option) => (
                <SelectItem key={option.id} value={option.bn}>
                  {option.bn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="partnerDistrict">জেলা</Label>
          <Input
            id="partnerDistrict"
            value={formData.expectedLifePartner?.district || ""}
            onChange={(e) =>
              updateNestedField(
                "expectedLifePartner",
                "district",
                e.target.value,
              )
            }
            placeholder="পছন্দের জেলা"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="partnerUpazila">উপজেলা</Label>
          <Input
            id="partnerUpazila"
            value={formData.expectedLifePartner?.upazila || ""}
            onChange={(e) =>
              updateNestedField(
                "expectedLifePartner",
                "upazila",
                e.target.value,
              )
            }
            placeholder="পছন্দের উপজেলা"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="partnerMaritalStatus">বৈবাহিক অবস্থা</Label>
          <Select
            value={formData.expectedLifePartner?.maritalStatus || ""}
            onValueChange={(value) =>
              updateNestedField("expectedLifePartner", "maritalStatus", value)
            }
          >
            <SelectTrigger id="partnerMaritalStatus">
              <SelectValue placeholder="বৈবাহিক অবস্থা নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {filteredMaritalStatusOptions.map((option) => (
                <SelectItem key={option.id} value={option.bn}>
                  {option.bn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="partnerProfession">পেশা</Label>
          <Input
            id="partnerProfession"
            value={formData.expectedLifePartner?.profession || ""}
            onChange={(e) =>
              updateNestedField(
                "expectedLifePartner",
                "profession",
                e.target.value,
              )
            }
            placeholder="পছন্দের পেশা"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="financialCondition">অর্থনৈতিক অবস্থা</Label>
          <Select
            value={formData.expectedLifePartner?.financialCondition || ""}
            onValueChange={(value) =>
              updateNestedField(
                "expectedLifePartner",
                "financialCondition",
                value,
              )
            }
          >
            <SelectTrigger id="financialCondition">
              <SelectValue placeholder="অর্থনৈতিক অবস্থা নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {familyBackgroundOptions.map((option) => (
                <SelectItem key={option.id} value={option.bn}>
                  {option.bn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expectedQuality">
          জীবনসঙ্গীর যে গুণাবলী প্রত্যাশা করেন
        </Label>
        <Textarea
          id="expectedQuality"
          value={formData.expectedLifePartner?.expectedQuality || ""}
          onChange={(e) =>
            updateNestedField(
              "expectedLifePartner",
              "expectedQuality",
              e.target.value,
            )
          }
          placeholder="আপনার প্রত্যাশিত জীবনসঙ্গীর গুণাবলী বিস্তারিত লিখুন"
          rows={5}
        />
      </div>
    </div>
  );
}
