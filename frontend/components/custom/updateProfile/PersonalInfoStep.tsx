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
import { Checkbox } from "@/components/ui/checkbox";
import { useProfileStore } from "@/zustan/useProfileStore";
import {
  fiqhOptions,
  religiousEducationOptions,
  skinColorOptions,
} from "@/staticData/all-data";

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

export function PersonalInfoStep() {
  const formData = useProfileStore((state) => state.formData);
  const updateNestedField = useProfileStore((state) => state.updateNestedField);
  const [heightOpen, setHeightOpen] = useState(false);

  const bodyStructureOptions = [
    { id: 1, label: "হালকা পাতলা গড়ন এর", value: "slim_thin" },
    { id: 2, label: "মাঝারি স্বাস্থ্যধারী", value: "average_medium" },
    { id: 3, label: "ভারীদেহী", value: "heavy_built" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="height">উচ্চতা (ফুট)</Label>
          <Popover open={heightOpen} onOpenChange={setHeightOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={heightOpen}
                className="w-full justify-between"
              >
                {formData.personalInformation?.height
                  ? heightOptions.find(
                      (option) =>
                        option.value ===
                        formData.personalInformation?.height?.toString(),
                    )?.label
                  : "উচ্চতা নির্বাচন করুন"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="উচ্চতা খুঁজুন... (যেমন: 5 6)" />
                <CommandEmpty>কোনো উচ্চতা পাওয়া যায়নি।</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {heightOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.searchText}
                      onSelect={() => {
                        updateNestedField(
                          "personalInformation",
                          "height",
                          option.value,
                        );
                        setHeightOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          formData.personalInformation?.height?.toString() ===
                            option.value
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="skinTone">গাত্রবর্ণ</Label>
          <Select
            value={formData.personalInformation?.skinTone || ""}
            onValueChange={(value) =>
              updateNestedField("personalInformation", "skinTone", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {skinColorOptions.map((item) => (
                <SelectItem key={item?.value} value={item?.label}>
                  {item?.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="physicalStructure">শারীরিক কাঠামো?</Label>
          <Select
            value={formData.personalInformation?.physicalStructure || ""}
            onValueChange={(value) =>
              updateNestedField(
                "personalInformation",
                "physicalStructure",
                value,
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {bodyStructureOptions.map((item) => (
                <SelectItem key={item?.value} value={item?.label}>
                  {item?.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="islamicStudy">দ্বীনের শিক্ষা</Label>
          <Select
            value={formData.personalInformation?.islamicStudy || ""}
            onValueChange={(value) =>
              updateNestedField("personalInformation", "islamicStudy", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {religiousEducationOptions.map((item) => (
                <SelectItem key={item?.value} value={item?.label}>
                  {item?.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="prayerFiverTimeFrom">
            প্রতিদিন পাঁচ ওয়াক্ত নামাজ পড়েন?
          </Label>
          <Select
            value={formData.personalInformation?.prayerFiverTimeFrom || ""}
            onValueChange={(value) =>
              updateNestedField(
                "personalInformation",
                "prayerFiverTimeFrom",
                value,
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="হ্যাঁ">হ্যাঁ</SelectItem>
              <SelectItem value="না">না</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reciteQuran">কুরআন তিলওয়াত করতে পারেন?</Label>
          <Select
            value={formData.personalInformation?.reciteQuran || ""}
            onValueChange={(value) =>
              updateNestedField("personalInformation", "reciteQuran", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="হ্যাঁ">হ্যাঁ</SelectItem>
              <SelectItem value="না">না</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fiqhFollow">কোন ফিকহ অনুসরণ করেন?</Label>
          <Select
            value={formData.personalInformation?.fiqhFollow || ""}
            onValueChange={(value) =>
              updateNestedField("personalInformation", "fiqhFollow", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {fiqhOptions.map((item) => (
                <SelectItem key={item?.value} value={item?.label}>
                  {item?.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="outsideClothes">
            ঘরের বাহিরে কি ধরণের পোশাক পরেন?
          </Label>
          <Input
            id="outsideClothes"
            value={formData.personalInformation?.outsideClothes || ""}
            onChange={(e) =>
              updateNestedField(
                "personalInformation",
                "outsideClothes",
                e.target.value,
              )
            }
            placeholder="বোরকা/পাঞ্জাবি"
          />
        </div>

        {formData.gender === "female" && (
          <div className="space-y-2">
            <Label htmlFor="womenNiqbYear">
              কবে থেকে নিকাব সহ পর্দা করছেন?
            </Label>
            <Input
              id="womenNiqbYear"
              value={formData.personalInformation?.womenNiqbYear || ""}
              onChange={(e) =>
                updateNestedField(
                  "personalInformation",
                  "womenNiqbYear",
                  e.target.value,
                )
              }
            />
          </div>
        )}

        {formData.gender === "male" && (
          <>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="manClothAboveAnkels"
                checked={
                  formData.personalInformation?.manClothAboveAnkels || false
                }
                onCheckedChange={(checked) =>
                  updateNestedField(
                    "personalInformation",
                    "manClothAboveAnkels",
                    checked,
                  )
                }
              />
              <Label htmlFor="manClothAboveAnkels" className="cursor-pointer">
                টাখনুর উপরে কাপড় পরেন
              </Label>
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="mentalOrPhysicalIssue">
            কোন শারীরিক/মানসিক সমস্যা আছে?
          </Label>
          <Input
            id="mentalOrPhysicalIssue"
            value={formData.personalInformation?.mentalOrPhysicalIssue || ""}
            onChange={(e) =>
              updateNestedField(
                "personalInformation",
                "mentalOrPhysicalIssue",
                e.target.value,
              )
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="extraInfoHobby">শখ, পছন্দ-অপছন্দ</Label>
        <Textarea
          id="extraInfoHobby"
          value={formData.personalInformation?.extraInfoHobby || ""}
          onChange={(e) =>
            updateNestedField(
              "personalInformation",
              "extraInfoHobby",
              e.target.value,
            )
          }
          rows={3}
        />
      </div>
    </div>
  );
}
