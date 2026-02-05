"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronsUpDown,
  Search,
  X,
  User,
  Heart,
  MapPin,
  Home,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { marriedStatus } from "@/staticData/all-data";
import { countries } from "@/staticData/all-data";

// Data
const genderOptions = [
  { value: "all", label: "সকল", icon: User },
  { value: "female", label: "মেয়ে", icon: User },
  { value: "male", label: "ছেলে", icon: User },
];

export default function BiodataFilter() {
  const router = useRouter();

  const [gender, setGender] = useState("all");
  const [maritalStatus, setMaritalStatus] = useState("all");
  const [districtName, setDistrictName] = useState("");
  const [upazilaName, setUpazilaName] = useState("");
  const [countryName, setCountryName] = useState("");
  const [query, setQuery] = useState("");

  const [genderOpen, setGenderOpen] = useState(false);
  const [maritalOpen, setMaritalOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [upazilaOpen, setUpazilaOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (gender !== "all") params.set("gender", gender);
    if (maritalStatus !== "all") params.set("maritalStatus", maritalStatus);
    if (districtName) params.set("districtId", districtName);
    if (upazilaName) params.set("upazilaId", upazilaName);
    if (countryName) params.set("country", countryName);
    if (query.trim()) params.set("query", query.trim());

    const searchString = params.toString();
    router.push(`/biodata${searchString ? `?${searchString}` : ""}`);
  };

  const handleReset = () => {
    setGender("all");
    setMaritalStatus("all");
    setDistrictName("");
    setUpazilaName("");
    setCountryName("");
    setQuery("");
  };

  const selectedDistrictData = districts.find((d) => d.name === districtName);
  const availableUpazilas = selectedDistrictData
    ? upazilas.filter(
        (upazila) => upazila.district_id === selectedDistrictData.id,
      )
    : [];

  const hasFilters =
    gender !== "all" ||
    maritalStatus !== "all" ||
    districtName ||
    upazilaName ||
    countryName ||
    query.trim();

  const selectedDistrict = districts.find((d) => d.name === districtName);
  const selectedUpazila = upazilas.find((u) => u.name === upazilaName);
  const selectedCountry = countries.find((c) => c.en === countryName);

  return (
    <section className="w-full bg-gradient-to-br from-pink-50/50 via-purple-50/30 to-white py-8 md:py-12 lg:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6 text-center md:mb-8">
            <h2 className="mb-2 font-heading text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
              আপনার জীবনসঙ্গী খুঁজুন
            </h2>
            <p className="text-sm text-muted-foreground md:text-base">
              নিচের ফিল্টার ব্যবহার করে আপনার পছন্দের বায়োডাটা খুঁজুন
            </p>
          </div>

          {/* Filter Card */}
          <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm sm:p-6 md:p-8">
            {/* Search Bar - Full Width at Top */}
            <div className="mb-6">
              <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-600">
                  <Search className="h-4 w-4" />
                </div>
                <span>বায়োডাটা আইডি বা নাম দিয়ে খুঁজুন</span>
              </label>
              <Input
                type="text"
                placeholder="যেমন: ১২৩৪ অথবা নাম লিখুন..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                className="h-12 rounded-xl border-2 border-gray-200 bg-gray-50/50 text-base transition-all placeholder:text-gray-400 hover:border-pink-300 focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
              />
            </div>

            {/* Filter Grid */}
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-5">
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
                      className="h-11 w-full justify-between rounded-xl border-2 border-gray-200 bg-gray-50/50 text-sm font-medium transition-all hover:border-pink-300 hover:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 sm:h-12 sm:text-base"
                    >
                      <span className="flex items-center gap-2 truncate">
                        {genderOptions.find((o) => o.value === gender)?.label ||
                          "নির্বাচন করুন"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[200px] p-0 sm:w-[240px]"
                    align="start"
                  >
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
                            className="py-2.5 sm:py-3"
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
                      className="h-11 w-full justify-between rounded-xl border-2 border-gray-200 bg-gray-50/50 text-sm font-medium transition-all hover:border-pink-300 hover:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 sm:h-12 sm:text-base"
                    >
                      <span className="flex items-center gap-2 truncate">
                        {marriedStatus.find((o) => o.en === maritalStatus)
                          ?.bn || "নির্বাচন করুন"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[200px] p-0 sm:w-[240px]"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="খুঁজুন..." className="h-10" />
                      <CommandEmpty>কিছু পাওয়া যায়নি।</CommandEmpty>
                      <CommandGroup>
                        {marriedStatus.map((option) => (
                          <CommandItem
                            key={option.en}
                            value={option.en}
                            onSelect={(value) => {
                              setMaritalStatus(value);
                              setMaritalOpen(false);
                            }}
                            className="py-2.5 sm:py-3"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 text-pink-600",
                                maritalStatus === option.en
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {option.bn}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Country Filter */}
              <div className="group">
                <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-600 transition-colors group-hover:bg-pink-200">
                    <Globe className="h-4 w-4" />
                  </div>
                  <span>দেশ</span>
                </label>
                <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={countryOpen}
                      className="h-11 w-full justify-between rounded-xl border-2 border-gray-200 bg-gray-50/50 text-sm font-medium transition-all hover:border-pink-300 hover:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 sm:h-12 sm:text-base"
                    >
                      <span className="truncate">
                        {selectedCountry?.bn || "দেশ নির্বাচন করুন"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[200px] p-0 sm:w-[260px]"
                    align="start"
                  >
                    <Command>
                      <CommandInput
                        placeholder="দেশ খুঁজুন..."
                        className="h-10"
                      />
                      <CommandEmpty>কোনো দেশ পাওয়া যায়নি।</CommandEmpty>
                      <CommandGroup className="max-h-48 overflow-y-auto">
                        {countries.map((country) => (
                          <CommandItem
                            key={country.id}
                            value={country.bn}
                            onSelect={() => {
                              setCountryName(
                                countryName === country.en ? "" : country.en,
                              );
                              setCountryOpen(false);
                            }}
                            className="py-2.5 sm:py-3"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 text-pink-600",
                                countryName === country.en
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {country.bn}
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
                  <span>জেলা</span>
                </label>
                <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={districtOpen}
                      className="h-11 w-full justify-between rounded-xl border-2 border-gray-200 bg-gray-50/50 text-sm font-medium transition-all hover:border-pink-300 hover:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 sm:h-12 sm:text-base"
                    >
                      <span className="truncate">
                        {selectedDistrict?.bn_name || "জেলা নির্বাচন করুন"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[200px] p-0 sm:w-[260px]"
                    align="start"
                  >
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
                              setDistrictName(
                                districtName === d.name ? "" : d.name,
                              );
                              setUpazilaName("");
                              setDistrictOpen(false);
                            }}
                            className="py-2.5 sm:py-3"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 text-pink-600",
                                districtName === d.name
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
                  !districtName && "pointer-events-none opacity-50",
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
                      disabled={!districtName}
                      className="h-11 w-full justify-between rounded-xl border-2 border-gray-200 bg-gray-50/50 text-sm font-medium transition-all hover:border-pink-300 hover:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 disabled:cursor-not-allowed sm:h-12 sm:text-base"
                    >
                      <span className="truncate">
                        {selectedUpazila?.bn_name || "এলাকা নির্বাচন করুন"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[200px] p-0 sm:w-[260px]"
                    align="start"
                  >
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
                              setUpazilaName(
                                upazilaName === upazila.name
                                  ? ""
                                  : upazila.name,
                              );
                              setUpazilaOpen(false);
                            }}
                            className="py-2.5 sm:py-3"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 text-pink-600",
                                upazilaName === upazila.name
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
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center md:mt-8">
              <Button
                onClick={handleSearch}
                size="lg"
                className="h-12 w-full rounded-full bg-gradient-to-r from-pink-600 to-pink-500 px-6 font-heading text-base font-semibold shadow-lg shadow-pink-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-pink-500/40 sm:h-13 sm:w-auto sm:px-8"
              >
                <Search className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                বায়োডাটা খুঁজুন
              </Button>

              {hasFilters && (
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="lg"
                  className="h-12 w-full rounded-full border-2 border-gray-300 bg-white font-heading text-base font-semibold transition-all hover:border-pink-300 hover:bg-pink-50 sm:h-13 sm:w-auto"
                >
                  <X className="mr-2 h-4 w-4" />
                  রিসেট করুন
                </Button>
              )}
            </div>

            {/* Active Filters Display */}
            {hasFilters && (
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 md:mt-6">
                <span className="text-xs font-medium text-muted-foreground sm:text-sm">
                  সক্রিয় ফিল্টার:
                </span>
                {gender !== "all" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-pink-700 sm:px-3 sm:text-sm">
                    {genderOptions.find((o) => o.value === gender)?.label}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-pink-900"
                      onClick={() => setGender("all")}
                    />
                  </span>
                )}
                {maritalStatus.trim() !== "all" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-pink-700 sm:px-3 sm:text-sm">
                    {marriedStatus.find((o) => o.en === maritalStatus)?.bn}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-pink-900"
                      onClick={() => setMaritalStatus("all")}
                    />
                  </span>
                )}
                {countryName && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-pink-700 sm:px-3 sm:text-sm">
                    {selectedCountry?.bn}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-pink-900"
                      onClick={() => setCountryName("")}
                    />
                  </span>
                )}
                {districtName && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-pink-700 sm:px-3 sm:text-sm">
                    {selectedDistrict?.bn_name}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-pink-900"
                      onClick={() => {
                        setDistrictName("");
                        setUpazilaName("");
                      }}
                    />
                  </span>
                )}
                {upazilaName && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-pink-700 sm:px-3 sm:text-sm">
                    {selectedUpazila?.bn_name}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-pink-900"
                      onClick={() => setUpazilaName("")}
                    />
                  </span>
                )}
                {query.trim() && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-pink-700 sm:px-3 sm:text-sm">
                    "{query}"
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-pink-900"
                      onClick={() => setQuery("")}
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
