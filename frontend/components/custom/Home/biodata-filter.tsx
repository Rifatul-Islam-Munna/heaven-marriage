// components/biodata-filter.tsx
"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

// Data
const genderOptions = [
  { value: "female", label: "মেয়ে" },
  { value: "male", label: "ছেলে" },
];

const maritalStatusOptions = [
  { value: "unmarried", label: "অবিবাহিত" },
  { value: "divorced", label: "ডিভোর্সড" },
  { value: "widowed", label: "বিধবা/বিপত্নীক" },
];

const districts = [
  { value: "dhaka", label: "ঢাকা" },
  { value: "chittagong", label: "চট্টগ্রাম" },
  { value: "rajshahi", label: "রাজশাহী" },
  { value: "khulna", label: "খুলনা" },
  { value: "barishal", label: "বরিশাল" },
  { value: "sylhet", label: "সিলেট" },
  { value: "rangpur", label: "রংপুর" },
  { value: "mymensingh", label: "ময়মনসিংহ" },
];

const subDistricts: Record<string, { value: string; label: string }[]> = {
  dhaka: [
    { value: "dhaka-metro", label: "ঢাকা মেট্রো" },
    { value: "gazipur", label: "গাজীপুর" },
    { value: "narayanganj", label: "নারায়ণগঞ্জ" },
    { value: "tangail", label: "টাঙ্গাইল" },
    { value: "kishoreganj", label: "কিশোরগঞ্জ" },
    { value: "manikganj", label: "মানিকগঞ্জ" },
    { value: "munshiganj", label: "মুন্সিগঞ্জ" },
    { value: "narsingdi", label: "নরসিংদী" },
    { value: "gopalganj", label: "গোপালগঞ্জ" },
    { value: "faridpur", label: "ফরিদপুর" },
  ],
  chittagong: [
    { value: "chittagong-metro", label: "চট্টগ্রাম মেট্রো" },
    { value: "coxs-bazar", label: "কক্সবাজার" },
    { value: "comilla", label: "কুমিল্লা" },
    { value: "feni", label: "ফেনী" },
    { value: "noakhali", label: "নোয়াখালী" },
    { value: "rangamati", label: "রাঙামাটি" },
    { value: "bandarban", label: "বান্দরবান" },
  ],
  // Add more sub-districts for other divisions
};

export default function BiodataFilter() {
  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [district, setDistrict] = useState("");
  const [subDistrict, setSubDistrict] = useState("");

  const [genderOpen, setGenderOpen] = useState(false);
  const [maritalOpen, setMaritalOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [subDistrictOpen, setSubDistrictOpen] = useState(false);

  const handleSearch = () => {
    console.log({
      gender,
      maritalStatus,
      district,
      subDistrict,
    });
    // Handle search logic here
  };

  const availableSubDistricts = district ? subDistricts[district] || [] : [];

  return (
    <section className="w-full bg-gradient-to-br from-pink-50/50 to-purple-50/30 py-8 md:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Filter Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Gender Filter */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                আমি খুঁজছি
              </label>
              <Popover open={genderOpen} onOpenChange={setGenderOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={genderOpen}
                    className="w-full justify-between border-pink-200 bg-white hover:bg-pink-50 hover:border-pink-300"
                  >
                    {gender
                      ? genderOptions.find((option) => option.value === gender)
                          ?.label
                      : "সকল"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="খুঁজুন..." />
                    <CommandEmpty>কিছু পাওয়া যায়নি।</CommandEmpty>
                    <CommandGroup>
                      {genderOptions.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={(currentValue) => {
                            setGender(
                              currentValue === gender ? "" : currentValue,
                            );
                            setGenderOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              gender === option.value
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

            {/* Marital Status Filter */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                বৈবাহিক অবস্থা
              </label>
              <Popover open={maritalOpen} onOpenChange={setMaritalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={maritalOpen}
                    className="w-full justify-between border-pink-200 bg-white hover:bg-pink-50 hover:border-pink-300"
                  >
                    {maritalStatus
                      ? maritalStatusOptions.find(
                          (option) => option.value === maritalStatus,
                        )?.label
                      : "সকল"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="খুঁজুন..." />
                    <CommandEmpty>কিছু পাওয়া যায়নি।</CommandEmpty>
                    <CommandGroup>
                      {maritalStatusOptions.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={(currentValue) => {
                            setMaritalStatus(
                              currentValue === maritalStatus
                                ? ""
                                : currentValue,
                            );
                            setMaritalOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              maritalStatus === option.value
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

            {/* District Filter */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                বর্তমান ঠিকানা
              </label>
              <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={districtOpen}
                    className="w-full justify-between border-pink-200 bg-white hover:bg-pink-50 hover:border-pink-300"
                  >
                    {district
                      ? districts.find((d) => d.value === district)?.label
                      : "ঠিকানা নির্বাচন করুন"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="জেলা খুঁজুন..." />
                    <CommandEmpty>কোনো জেলা পাওয়া যায়নি।</CommandEmpty>
                    <CommandGroup>
                      {districts.map((d) => (
                        <CommandItem
                          key={d.value}
                          value={d.value}
                          onSelect={(currentValue) => {
                            setDistrict(
                              currentValue === district ? "" : currentValue,
                            );
                            setSubDistrict(""); // Reset sub-district when district changes
                            setDistrictOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              district === d.value
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {d.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Sub-District Filter (only visible if district is selected) */}
            <div className={cn(!district && "opacity-50")}>
              <label className="mb-2 block text-sm font-medium text-foreground">
                এলাকা
              </label>
              <Popover open={subDistrictOpen} onOpenChange={setSubDistrictOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={subDistrictOpen}
                    disabled={!district}
                    className="w-full justify-between border-pink-200 bg-white hover:bg-pink-50 hover:border-pink-300 disabled:cursor-not-allowed"
                  >
                    {subDistrict
                      ? availableSubDistricts.find(
                          (sd) => sd.value === subDistrict,
                        )?.label
                      : "এলাকা নির্বাচন করুন"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="এলাকা খুঁজুন..." />
                    <CommandEmpty>কোনো এলাকা পাওয়া যায়নি।</CommandEmpty>
                    <CommandGroup>
                      {availableSubDistricts.map((sd) => (
                        <CommandItem
                          key={sd.value}
                          value={sd.value}
                          onSelect={(currentValue) => {
                            setSubDistrict(
                              currentValue === subDistrict ? "" : currentValue,
                            );
                            setSubDistrictOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              subDistrict === sd.value
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {sd.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Search Button */}
          <div className="mt-6 text-center">
            <Button
              onClick={handleSearch}
              className="h-12 bg-pink-600 px-8 font-heading text-base font-semibold hover:bg-pink-700"
            >
              <Search className="mr-2 h-5 w-5" />
              বায়োডাটা খুঁজুন
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
