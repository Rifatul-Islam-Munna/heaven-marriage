// components/biodata-filter.tsx
"use client";

import { useState } from "react";
import {
  Check,
  ChevronsUpDown,
  Search,
  X,
  User,
  Heart,
  MapPin,
  Home,
} from "lucide-react";
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
import { districts } from "@/staticData/districts";
import { upazilas } from "@/staticData/upazilas";

// Data
const genderOptions = [
  { value: "all", label: "সকল", icon: User },
  { value: "female", label: "মেয়ে", icon: User },
  { value: "male", label: "ছেলে", icon: User },
];

const maritalStatusOptions = [
  { value: "all", label: "সকল", icon: Heart },
  { value: "unmarried", label: "অবিবাহিত", icon: Heart },
  { value: "divorced", label: "ডিভোর্সড", icon: Heart },
  { value: "widowed", label: "বিধবা/বিপত্নীক", icon: Heart },
];

export default function BiodataFilter() {
  const [gender, setGender] = useState("all");
  const [maritalStatus, setMaritalStatus] = useState("all");
  const [districtId, setDistrictId] = useState(""); // Store district ID
  const [upazilaId, setUpazilaId] = useState(""); // Store upazila ID

  const [genderOpen, setGenderOpen] = useState(false);
  const [maritalOpen, setMaritalOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [upazilaOpen, setUpazilaOpen] = useState(false);

  const handleSearch = () => {
    console.log({
      gender,
      maritalStatus,
      districtId,
      upazilaId,
      // Get actual names for debugging
      districtName: districts.find((d) => d.id === districtId)?.bn_name,
      upazilaName: upazilas.find((u) => u.id === upazilaId)?.bn_name,
    });
  };

  const handleReset = () => {
    setGender("all");
    setMaritalStatus("all");
    setDistrictId("");
    setUpazilaId("");
  };

  // Filter upazilas based on selected district's ID
  const availableUpazilas = districtId
    ? upazilas.filter((upazila) => upazila.district_id === districtId)
    : [];

  const hasFilters =
    gender !== "all" || maritalStatus !== "all" || districtId || upazilaId;

  // Get selected district object
  const selectedDistrict = districts.find((d) => d.id === districtId);

  // Get selected upazila object
  const selectedUpazila = upazilas.find((u) => u.id === upazilaId);

  return (
    <section className="w-full bg-gradient-to-br from-pink-50/50 via-purple-50/30 to-white py-10 md:py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h2 className="mb-2 font-heading text-2xl font-bold text-foreground md:text-3xl">
              আপনার জীবনসঙ্গী খুঁজুন
            </h2>
            <p className="text-sm text-muted-foreground md:text-base">
              নিচের ফিল্টার ব্যবহার করে আপনার পছন্দের বায়োডাটা খুঁজুন
            </p>
          </div>

          {/* Filter Card */}
          <div className="rounded-2xl border border-pink-100 bg-white p-6 md:p-8">
            {/* Filter Grid */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Gender Filter */}
              <div className="group">
                <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-600 transition-colors group-hover:bg-pink-200">
                    <User className="h-4 w-4" />
                  </div>
                  <span>আমি খুঁজছি</span>
                </label>
                <Popover open={genderOpen} onOpenChange={setGenderOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={genderOpen}
                      className="h-12 w-full justify-between rounded-xl border-2 border-gray-200 bg-gray-50/50 text-base font-medium transition-all hover:border-pink-300 hover:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
                    >
                      <span className="flex items-center gap-2">
                        {genderOptions.find((o) => o.value === gender)?.label ||
                          "নির্বাচন করুন"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="খুঁজুন..." className="h-10" />
                      <CommandEmpty>কিছু পাওয়া যায়নি।</CommandEmpty>
                      <CommandGroup>
                        {genderOptions.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={(value) => {
                              setGender(value);
                              setGenderOpen(false);
                            }}
                            className="py-3"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 text-pink-600",
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
              <div className="group">
                <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-600 transition-colors group-hover:bg-pink-200">
                    <Heart className="h-4 w-4" />
                  </div>
                  <span>বৈবাহিক অবস্থা</span>
                </label>
                <Popover open={maritalOpen} onOpenChange={setMaritalOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={maritalOpen}
                      className="h-12 w-full justify-between rounded-xl border-2 border-gray-200 bg-gray-50/50 text-base font-medium transition-all hover:border-pink-300 hover:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
                    >
                      <span className="flex items-center gap-2">
                        {maritalStatusOptions.find(
                          (o) => o.value === maritalStatus,
                        )?.label || "নির্বাচন করুন"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="খুঁজুন..." className="h-10" />
                      <CommandEmpty>কিছু পাওয়া যায়নি।</CommandEmpty>
                      <CommandGroup>
                        {maritalStatusOptions.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={(value) => {
                              setMaritalStatus(value);
                              setMaritalOpen(false);
                            }}
                            className="py-3"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 text-pink-600",
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
              <div className="group">
                <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-600 transition-colors group-hover:bg-pink-200">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span>বর্তমান ঠিকানা</span>
                </label>
                <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={districtOpen}
                      className="h-12 w-full justify-between rounded-xl border-2 border-gray-200 bg-gray-50/50 text-base font-medium transition-all hover:border-pink-300 hover:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
                    >
                      <span className="truncate">
                        {selectedDistrict?.bn_name || "ঠিকানা নির্বাচন করুন"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="জেলা খুঁজুন..."
                        className="h-10"
                      />
                      <CommandEmpty>কোনো জেলা পাওয়া যায়নি।</CommandEmpty>
                      <CommandGroup className="max-h-48 overflow-y-auto">
                        {districts.map((d) => (
                          <CommandItem
                            key={d.id}
                            value={d.bn_name}
                            onSelect={() => {
                              setDistrictId(districtId === d.id ? "" : d.id);
                              setUpazilaId(""); // Reset upazila when district changes
                              setDistrictOpen(false);
                            }}
                            className="py-3"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 text-pink-600",
                                districtId === d.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {d.bn_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Upazila Filter */}
              <div
                className={cn(
                  "group",
                  !districtId && "pointer-events-none opacity-50",
                )}
              >
                <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-600 transition-colors group-hover:bg-pink-200">
                    <Home className="h-4 w-4" />
                  </div>
                  <span>এলাকা</span>
                </label>
                <Popover open={upazilaOpen} onOpenChange={setUpazilaOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={upazilaOpen}
                      disabled={!districtId}
                      className="h-12 w-full justify-between rounded-xl border-2 border-gray-200 bg-gray-50/50 text-base font-medium transition-all hover:border-pink-300 hover:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 disabled:cursor-not-allowed"
                    >
                      <span className="truncate">
                        {selectedUpazila?.bn_name || "এলাকা নির্বাচন করুন"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="এলাকা খুঁজুন..."
                        className="h-10"
                      />
                      <CommandEmpty>কোনো এলাকা পাওয়া যায়নি।</CommandEmpty>
                      <CommandGroup className="max-h-48 overflow-y-auto">
                        {availableUpazilas.map((upazila) => (
                          <CommandItem
                            key={upazila.id}
                            value={upazila.bn_name}
                            onSelect={() => {
                              setUpazilaId(
                                upazilaId === upazila.id ? "" : upazila.id,
                              );
                              setUpazilaOpen(false);
                            }}
                            className="py-3"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 text-pink-600",
                                upazilaId === upazila.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {upazila.bn_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                onClick={handleSearch}
                size="lg"
                className="h-13 w-full rounded-full bg-gradient-to-r from-pink-600 to-pink-500 px-8 font-heading text-base font-semibold shadow-lg shadow-pink-500/30 transition-all hover:shadow-xl hover:shadow-pink-500/40 sm:w-auto"
              >
                <Search className="mr-2 h-5 w-5" />
                বায়োডাটা খুঁজুন
              </Button>

              {hasFilters && (
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="lg"
                  className="h-13 w-full rounded-full border-2 border-gray-300 bg-white font-heading text-base font-semibold transition-all hover:border-pink-300 hover:bg-pink-50 sm:w-auto"
                >
                  <X className="mr-2 h-4 w-4" />
                  রিসেট করুন
                </Button>
              )}
            </div>

            {/* Active Filters Display */}
            {hasFilters && (
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                <span className="text-sm font-medium text-muted-foreground">
                  সক্রিয় ফিল্টার:
                </span>
                {gender !== "all" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-1 text-sm font-medium text-pink-700">
                    {genderOptions.find((o) => o.value === gender)?.label}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-pink-900"
                      onClick={() => setGender("all")}
                    />
                  </span>
                )}
                {maritalStatus !== "all" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-1 text-sm font-medium text-pink-700">
                    {
                      maritalStatusOptions.find(
                        (o) => o.value === maritalStatus,
                      )?.label
                    }
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-pink-900"
                      onClick={() => setMaritalStatus("all")}
                    />
                  </span>
                )}
                {districtId && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-1 text-sm font-medium text-pink-700">
                    {selectedDistrict?.bn_name}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-pink-900"
                      onClick={() => {
                        setDistrictId("");
                        setUpazilaId("");
                      }}
                    />
                  </span>
                )}
                {upazilaId && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-1 text-sm font-medium text-pink-700">
                    {selectedUpazila?.bn_name}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-pink-900"
                      onClick={() => setUpazilaId("")}
                    />
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
