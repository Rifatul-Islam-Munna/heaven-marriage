"use client";
import type { Route } from "next";
import { searchEvent } from "@/lib/google-tag-manager";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronsUpDown,
  Search,
  X,
  User,
  Heart,
  MapPin,
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
import { countries } from "@/staticData/countries";
import {useQueryWrapper} from "@/api-hooks/react-query-wrapper";
import {defaultCityCorporations,defaultCityAreas,defaultMunicipalityUpazilas,type LocationResponse} from "@/lib/location-options";
import SearchLocationPicker from './SearchLocationPicker';

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
  const [cityName,setCityName]=useState("");
  const [areaName,setAreaName]=useState("");
  const {data:locations}=useQueryWrapper<LocationResponse>(["public-location-options"],"/profile-questions/locations",{staleTime:60000});
  const extra=locations?.entries||[];
  const [query, setQuery] = useState("");
  const [premiumOnly, setPremiumOnly] = useState(false);

  const [genderOpen, setGenderOpen] = useState(false);
  const [maritalOpen, setMaritalOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  // Filter marital status based on selected gender
  const filteredMaritalStatus = useMemo(() => {
    if (gender === "all") {
      return marriedStatus;
    }
    return marriedStatus.filter(
      (status) => status.gender === "all" || status.gender === gender,
    );
  }, [gender]);

  const handleSearch = () => {
    searchEvent();
    const params = new URLSearchParams();

    if (gender !== "all") params.set("gender", gender);
    if (maritalStatus !== "all") params.set("maritalStatus", maritalStatus);
    if (districtName) params.set("districtId", districtName);
    if (upazilaName) params.set("upazilaId", upazilaName);
    if (cityName) params.set("cityCorporation",cityName);
    if (areaName) params.set("area",areaName);
    if (countryName) params.set("country", countryName);
    if (query.trim()) params.set("query", query.trim());
    if (premiumOnly) params.set("category", "premium");

    const searchString = params.toString();
    router.push(`/biodata${searchString ? `?${searchString}` : ""}` as Route);
  };

  const handleReset = () => {
    setGender("all");
    setMaritalStatus("all");
    setDistrictName("");
    setUpazilaName("");
    setCityName("");
    setAreaName("");
    setCountryName("");
    setQuery("");
    setPremiumOnly(false);
  };

  // Handle gender change - reset marital status if it's not available for new gender
  const handleGenderChange = (newGender: string) => {
    setGender(newGender);

    // Check if current marital status is valid for new gender
    const isValidForNewGender = marriedStatus.find(
      (status) =>
        status.en === maritalStatus &&
        (status.gender === "all" ||
          status.gender === newGender ||
          newGender === "all"),
    );

    if (!isValidForNewGender) {
      setMaritalStatus("all");
    }

    setGenderOpen(false);
  };

  const selectedDistrictData = districts.find((d) => d.name === districtName);
  const availableUpazilas = [
    ...upazilas.filter(u=>selectedDistrictData&&u.district_id===selectedDistrictData.id),
    ...defaultMunicipalityUpazilas.filter(u=>u.district===districtName).map((u,i)=>({
      id:'municipality-'+i,name:u.name,bn_name:u.label,district_id:'municipality',
    })),
    ...extra.filter(u=>u.kind==="upazila"&&u.district===districtName).map((u,i)=>({
      id:"custom-"+i,name:u.name,bn_name:u.label,district_id:"custom",
    })),
  ];
  const cities=[...defaultCityCorporations,...extra.filter(e=>e.kind==="cityCorporation")]
    .filter(c=>c.district===districtName);
  const areas=[...defaultCityAreas,...extra.filter(e=>e.kind==="area")]
    .filter(e=>e.district===districtName && e.enabled!==false);

  const hasFilters =
    gender !== "all" ||
    maritalStatus !== "all" ||
    districtName ||
    upazilaName ||
    cityName || areaName ||
    countryName ||
    query.trim() ||
    premiumOnly;

  const selectedDistrict = districts.find((d) => d.name === districtName);
  const selectedUpazila = availableUpazilas.find((u) => u.name === upazilaName);
  const selectedCountry = countries.find((c) => c.en === countryName) ||
    extra.filter(x=>x.kind==='country').map((x,i)=>({id:i+1000,en:x.name,bn:x.label})).find(x=>x.en===countryName);

  return (
    <section className="w-full bg-gradient-to-br from-pink-50/50 via-purple-50/30 to-white py-8 md:py-10 lg:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-4 text-center md:mb-6">
            <h2 className="mb-2 font-heading text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
              আপনার জীবনসঙ্গী খুঁজুন
            </h2>
            <p className="text-sm text-muted-foreground md:text-base">
              নিচের ফিল্টার ব্যবহার করে আপনার পছন্দের বায়োডাটা খুঁজুন
            </p>
          </div>

          {/* Filter Card */}
          <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm sm:p-5 md:p-6">
            {/* Search Bar - Full Width at Top */}
            <div className="mb-4">
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
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
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
                            onSelect={(value) => handleGenderChange(value)}
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
                        {filteredMaritalStatus.map((option) => (
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
                  <span>বর্তমান বসবাসের দেশ</span>
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
                        {selectedCountry?.bn || countryName || "দেশ নির্বাচন করুন"}
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
                        {[...countries,...extra.filter(x=>x.kind==='country').map((x,i)=>({id:i+1000,en:x.name,bn:x.label}))].map((country) => (
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
                        {selectedDistrict?.bn_name || districtName || "জেলা নির্বাচন করুন"}
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
                        {[...districts,...extra.filter(e=>e.kind==='district').map((e,i)=>({id:'custom-'+i,name:e.name,bn_name:e.label}))].map((d) => (
                          <CommandItem
                            key={d.id}
                            value={d.bn_name}
                            onSelect={() => {
                              setDistrictName(
                                districtName === d.name ? "" : d.name,
                              );
                              setUpazilaName("");
                              setCityName("");setAreaName("");
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

              {/* One cascading selector: district > Upazila OR City Corporation > Area/Ward. */}
              <SearchLocationPicker
                districtName={districtName}
                upazilas={availableUpazilas}
                cities={cities}
                areas={areas}
                value={{upazilaName,cityName,areaName}}
                onChange={next=>{
                  setUpazilaName(next.upazilaName);
                  setCityName(next.cityName);
                  setAreaName(next.areaName);
                }}
              />
            </div>

            <label className="mt-4 inline-flex cursor-pointer items-center gap-2.5 rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-semibold text-pink-900">
              <input type="checkbox" checked={premiumOnly} onChange={(event) => setPremiumOnly(event.target.checked)}
                className="size-4 accent-pink-600" />
              শুধু প্রিমিয়াম সদস্য দেখুন
            </label>

            {/* Action Buttons */}
            <div className="mt-4 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center md:mt-5">
              <Button
                onClick={handleSearch}
                size="lg"
                className="min-h-11 w-full rounded-full bg-gradient-to-r from-pink-600 to-pink-500 px-5 text-sm font-semibold shadow-sm transition-colors hover:from-pink-700 hover:to-rose-600 sm:w-auto"
              >
                <Search className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                বায়োডাটা খুঁজুন
              </Button>

              {hasFilters && (
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="lg"
                  className="min-h-11 w-full rounded-full border border-gray-300 bg-white px-5 text-sm font-semibold transition-colors hover:border-pink-300 hover:bg-pink-50 sm:w-auto"
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
                {premiumOnly && (
                  <button type="button" onClick={() => setPremiumOnly(false)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-700">
                    প্রিমিয়াম সদস্য <X className="size-3" aria-hidden />
                  </button>
                )}
                {gender !== "all" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-pink-700 sm:px-3 sm:text-sm">
                    {genderOptions.find((o) => o.value === gender)?.label}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-pink-900"
                      onClick={() => handleGenderChange("all")}
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
                    {selectedDistrict?.bn_name || districtName}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-pink-900"
                      onClick={() => {
                        setDistrictName("");
                        setUpazilaName("");
                        setCityName("");
                        setAreaName("");
                      }}
                    />
                  </span>
                )}
                {(upazilaName||cityName) && (
                  <button type="button"
                    aria-label="নির্বাচিত উপজেলা বা সিটি কর্পোরেশন মুছুন"
                    onClick={() => {setUpazilaName("");setCityName("");setAreaName("");}}
                    className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-1.5 text-xs font-medium text-pink-700 hover:bg-pink-200">
                    {cityName?(cities.find(c=>c.name===cityName)?.label||cityName):(selectedUpazila?.bn_name||upazilaName)}
                    <X className="size-3" aria-hidden/>
                  </button>
                )}
                {areaName && (
                  <button type="button"
                    aria-label="নির্বাচিত এলাকা বা ওয়ার্ড মুছুন"
                    onClick={()=>setAreaName("")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-1.5 text-xs font-medium text-pink-700 hover:bg-pink-200">
                    {areas.find(e=>e.name===areaName)?.label||areaName}
                    <X className="size-3" aria-hidden/>
                  </button>
                )}
                {query.trim() && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-pink-700 sm:px-3 sm:text-sm">
                    &ldquo;{query}&rdquo;
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
