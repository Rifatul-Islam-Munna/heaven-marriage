// components/biodata-advanced-filter.tsx
"use client";

import { useEffect, useState } from "react";
import {
  useQueryStates,
  parseAsString,
  parseAsInteger,
  parseAsArrayOf,
} from "nuqs";
import {
  SlidersHorizontal,
  X,
  ChevronRight,
  User,
  Heart,
  MapPin,
  GraduationCap,
  UserCircle,
  Briefcase,
  Wallet,
  Filter,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { cn } from "@/lib/utils";
import { districts } from "@/staticData/districts";
import { upazilas } from "@/staticData/upazilas";
import { useDebounce } from "use-debounce";
// Filter Data
const genderOptions = [
  { value: "all", label: "সকল" },
  { value: "male", label: "ছেলে" },
  { value: "female", label: "মেয়ে" },
];

const maritalStatusOptions = [
  { value: "unmarried", label: "অবিবাহিত" },
  { value: "divorced", label: "ডিভোর্সড" },
  { value: "widowed", label: "বিধবা/বিপত্নীক" },
];

const educationMediumOptions = [
  { value: "bangla", label: "বাংলা মাধ্যম" },
  { value: "english", label: "ইংলিশ মাধ্যম" },
  { value: "madrasa", label: "মাদ্রাসা" },
  { value: "english-version", label: "ইংলিশ ভার্সন" },
];

const religiousEducationOptions = [
  { value: "hafez", label: "হাফেজ/হাফেজা" },
  { value: "alim", label: "আলিম/আলিমা" },
  { value: "mufti", label: "মুফতি" },
  { value: "qari", label: "কারী" },
  { value: "dawah", label: "দাঈ" },
];

const skinColorOptions = [
  { value: "fair", label: "ফর্সা" },
  { value: "brown", label: "শ্যামলা" },
  { value: "dark", label: "কালো" },
  { value: "bright", label: "উজ্জ্বল" },
];

const fiqhOptions = [
  { value: "hanafi", label: "হানাফি" },
  { value: "shafi", label: "শাফেঈ" },
  { value: "maliki", label: "মালিকি" },
  { value: "hanbali", label: "হাম্বলি" },
];

const professionOptions = [
  { value: "doctor", label: "ডাক্তার" },
  { value: "engineer", label: "ইঞ্জিনিয়ার" },
  { value: "teacher", label: "শিক্ষক" },
  { value: "businessman", label: "ব্যবসায়ী" },
  { value: "govt-job", label: "সরকারি চাকরি" },
  { value: "private-job", label: "বেসরকারি চাকরি" },
  { value: "student", label: "ছাত্র/ছাত্রী" },
  { value: "housewife", label: "গৃহিণী" },
];

const economicStatusOptions = [
  { value: "upper", label: "উচ্চবিত্ত" },
  { value: "upper-middle", label: "উচ্চ মধ্যবিত্ত" },
  { value: "middle", label: "মধ্যবিত্ত" },
  { value: "lower-middle", label: "নিম্ন মধ্যবিত্ত" },
];

const categoryOptions = [
  { value: "general", label: "সাধারণ" },
  { value: "special", label: "বিশেষ" },
  { value: "urgent", label: "জরুরি" },
  { value: "verified", label: "ভেরিফাইড" },
];

// Separate FilterContent Component
interface FilterContentProps {
  filters: any;
  setFilters: any;
  handleCheckboxChange: (
    field: string,
    value: string,
    checked: boolean,
  ) => void;
  handleReset: () => void;
  hasActiveFilters: boolean;
  openSections: Record<string, boolean>;
  toggleSection: (section: string) => void;
  districtOpen: boolean;
  setDistrictOpen: (open: boolean) => void;
  upazilaOpen: boolean;
  setUpazilaOpen: (open: boolean) => void;
  availableUpazilas: any[];
  selectedDistrict: any;
  selectedUpazila: any;
}

function FilterContent({
  filters,
  setFilters,
  handleCheckboxChange,
  handleReset,
  hasActiveFilters,
  openSections,
  toggleSection,
  districtOpen,
  setDistrictOpen,
  upazilaOpen,
  setUpazilaOpen,
  availableUpazilas,
  selectedDistrict,
  selectedUpazila,
}: FilterContentProps) {
  const [age, setAge] = useState({
    min: 18,
    max: 40,
  });
  const [height, setHeight] = useState({
    min: 4,
    max: 7,
  });
  const [newAge] = useDebounce(age, 600);
  const [newHeight] = useDebounce(height, 600);

  useEffect(() => {
    setFilters({ ...filters, ageMin: newAge.min, ageMax: newAge.max });
  }, [newAge]);
  useEffect(() => {
    setFilters({
      ...filters,
      heightMin: newHeight.min,
      heightMax: newHeight.max,
    });
  }, [newHeight]);

  return (
    <div className="h-full overflow-y-auto pb-4">
      <div className="space-y-3">
        {/* Reset Button */}
        {hasActiveFilters && (
          <div className="sticky top-0 z-10 bg-background pb-2">
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="w-full border-pink-200 text-pink-600 hover:bg-pink-50"
            >
              <X className="mr-2 h-3.5 w-3.5" />
              রিসেট করুন
            </Button>
          </div>
        )}

        {/* প্রাথমিক - Primary */}
        <Collapsible
          open={openSections.primary}
          onOpenChange={() => toggleSection("primary")}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-pink-50 px-3 py-2 hover:bg-pink-100">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-pink-600" />
              <span className="text-sm font-semibold text-foreground">
                প্রাথমিক
              </span>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                openSections.primary && "rotate-90",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 px-1 pt-3">
            {/* Gender */}
            <div>
              <Label className="mb-1.5 block text-xs font-medium">
                আমি খুঁজছি
              </Label>
              <Select
                value={filters.gender}
                onValueChange={(value) => setFilters({ gender: value })}
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {genderOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Marital Status - 2 Columns */}
            <div>
              <Label className="mb-2 block text-xs font-medium">
                বৈবাহিক অবস্থা
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {maritalStatusOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-1.5"
                  >
                    <Checkbox
                      id={`marital-${option.value}`}
                      checked={filters.maritalStatus.includes(option.value)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(
                          "maritalStatus",
                          option.value,
                          checked as boolean,
                        )
                      }
                      className="h-4 w-4"
                    />
                    <Label
                      htmlFor={`marital-${option.value}`}
                      className="cursor-pointer text-xs font-normal leading-tight"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Age Range */}
            <div>
              <Label className="mb-2 block text-xs font-medium">
                বয়স: {filters.ageMin} - {filters.ageMax} বছর
              </Label>
              <Slider
                min={18}
                max={70}
                step={1}
                value={[age.min, age.max]}
                onValueChange={([min, max]) => setAge({ min: min, max: max })}
                className="w-full"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ঠিকানা - Address */}
        <Collapsible
          open={openSections.address}
          onOpenChange={() => toggleSection("address")}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-pink-50 px-3 py-2 hover:bg-pink-100">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-pink-600" />
              <span className="text-sm font-semibold text-foreground">
                ঠিকানা
              </span>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                openSections.address && "rotate-90",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 px-1 pt-3">
            {/* District Combobox */}
            <div>
              <Label className="mb-1.5 block text-xs font-medium">জেলা</Label>
              <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={districtOpen}
                    className="h-9 w-full justify-between text-sm"
                  >
                    <span className="truncate">
                      {selectedDistrict?.bn_name || "জেলা নির্বাচন করুন"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="জেলা খুঁজুন..."
                      className="h-9"
                    />
                    <CommandEmpty>কোনো জেলা পাওয়া যায়নি।</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto">
                      {districts.map((d) => (
                        <CommandItem
                          key={d.id}
                          value={d.bn_name}
                          onSelect={() => {
                            setFilters({
                              districtId:
                                filters.districtId === d.id ? null : d.id,
                              upazilaId: null, // Reset upazila when district changes
                            });
                            setDistrictOpen(false);
                          }}
                          className="text-sm"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 text-pink-600",
                              filters.districtId === d.id
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

            {/* Upazila Combobox */}
            <div
              className={cn(
                !filters.districtId && "opacity-50 pointer-events-none",
              )}
            >
              <Label className="mb-1.5 block text-xs font-medium">উপজেলা</Label>
              <Popover open={upazilaOpen} onOpenChange={setUpazilaOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={upazilaOpen}
                    disabled={!filters.districtId}
                    className="h-9 w-full justify-between text-sm disabled:cursor-not-allowed"
                  >
                    <span className="truncate">
                      {selectedUpazila?.bn_name || "উপজেলা নির্বাচন করুন"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="উপজেলা খুঁজুন..."
                      className="h-9"
                    />
                    <CommandEmpty>কোনো উপজেলা পাওয়া যায়নি।</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto">
                      {availableUpazilas.map((upazila) => (
                        <CommandItem
                          key={upazila.id}
                          value={upazila.bn_name}
                          onSelect={() => {
                            setFilters({
                              upazilaId:
                                filters.upazilaId === upazila.id
                                  ? null
                                  : upazila.id,
                            });
                            setUpazilaOpen(false);
                          }}
                          className="text-sm"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 text-pink-600",
                              filters.upazilaId === upazila.id
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
          </CollapsibleContent>
        </Collapsible>

        {/* শিক্ষা - Education */}
        <Collapsible
          open={openSections.education}
          onOpenChange={() => toggleSection("education")}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-pink-50 px-3 py-2 hover:bg-pink-100">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-pink-600" />
              <span className="text-sm font-semibold text-foreground">
                শিক্ষা
              </span>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                openSections.education && "rotate-90",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 px-1 pt-3">
            {/* Education Medium - 2 Columns */}
            <div>
              <Label className="mb-2 block text-xs font-medium">
                পড়াশোনার মাধ্যম
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {educationMediumOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-1.5"
                  >
                    <Checkbox
                      id={`edu-medium-${option.value}`}
                      checked={filters.educationMedium.includes(option.value)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(
                          "educationMedium",
                          option.value,
                          checked as boolean,
                        )
                      }
                      className="h-4 w-4"
                    />
                    <Label
                      htmlFor={`edu-medium-${option.value}`}
                      className="cursor-pointer text-xs font-normal leading-tight"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Religious Education - 2 Columns */}
            <div>
              <Label className="mb-2 block text-xs font-medium">
                দ্বীনি শিক্ষাগত যোগ্যতা
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {religiousEducationOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-1.5"
                  >
                    <Checkbox
                      id={`religious-${option.value}`}
                      checked={filters.religiousEducation.includes(
                        option.value,
                      )}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(
                          "religiousEducation",
                          option.value,
                          checked as boolean,
                        )
                      }
                      className="h-4 w-4"
                    />
                    <Label
                      htmlFor={`religious-${option.value}`}
                      className="cursor-pointer text-xs font-normal leading-tight"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ব্যক্তিগত - Personal */}
        <Collapsible
          open={openSections.personal}
          onOpenChange={() => toggleSection("personal")}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-pink-50 px-3 py-2 hover:bg-pink-100">
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-pink-600" />
              <span className="text-sm font-semibold text-foreground">
                ব্যক্তিগত
              </span>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                openSections.personal && "rotate-90",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 px-1 pt-3">
            {/* Height Range */}
            <div>
              <Label className="mb-2 block text-xs font-medium">
                উচ্চতা: {filters.heightMin}' - {filters.heightMax}' ফুট
              </Label>
              <Slider
                min={4}
                max={8}
                step={0.1}
                value={[height.min, height.max]}
                onValueChange={([min, max]) =>
                  setHeight({ min: min, max: max })
                }
                className="w-full"
              />
            </div>

            {/* Skin Color - 2 Columns */}
            <div>
              <Label className="mb-2 block text-xs font-medium">
                গাত্রবর্ণ
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {skinColorOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-1.5"
                  >
                    <Checkbox
                      id={`skin-${option.value}`}
                      checked={filters.skinColor.includes(option.value)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(
                          "skinColor",
                          option.value,
                          checked as boolean,
                        )
                      }
                      className="h-4 w-4"
                    />
                    <Label
                      htmlFor={`skin-${option.value}`}
                      className="cursor-pointer text-xs font-normal leading-tight"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Fiqh - 2 Columns */}
            <div>
              <Label className="mb-2 block text-xs font-medium">
                ফিকহ অনুসরণ
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {fiqhOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-1.5"
                  >
                    <Checkbox
                      id={`fiqh-${option.value}`}
                      checked={filters.fiqh.includes(option.value)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(
                          "fiqh",
                          option.value,
                          checked as boolean,
                        )
                      }
                      className="h-4 w-4"
                    />
                    <Label
                      htmlFor={`fiqh-${option.value}`}
                      className="cursor-pointer text-xs font-normal leading-tight"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* পেশা - Profession */}
        <Collapsible
          open={openSections.profession}
          onOpenChange={() => toggleSection("profession")}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-pink-50 px-3 py-2 hover:bg-pink-100">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-pink-600" />
              <span className="text-sm font-semibold text-foreground">
                পেশা
              </span>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                openSections.profession && "rotate-90",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 px-1 pt-3">
            <div className="grid grid-cols-2 gap-2">
              {professionOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-1.5"
                >
                  <Checkbox
                    id={`profession-${option.value}`}
                    checked={filters.profession.includes(option.value)}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(
                        "profession",
                        option.value,
                        checked as boolean,
                      )
                    }
                    className="h-4 w-4"
                  />
                  <Label
                    htmlFor={`profession-${option.value}`}
                    className="cursor-pointer text-xs font-normal leading-tight"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* অন্যান্য - Others */}
        <Collapsible
          open={openSections.others}
          onOpenChange={() => toggleSection("others")}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-pink-50 px-3 py-2 hover:bg-pink-100">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-pink-600" />
              <span className="text-sm font-semibold text-foreground">
                অন্যান্য
              </span>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                openSections.others && "rotate-90",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 px-1 pt-3">
            {/* Economic Status - 2 Columns */}
            <div>
              <Label className="mb-2 block text-xs font-medium">
                অর্থনৈতিক অবস্থা
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {economicStatusOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-1.5"
                  >
                    <Checkbox
                      id={`economic-${option.value}`}
                      checked={filters.economicStatus.includes(option.value)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(
                          "economicStatus",
                          option.value,
                          checked as boolean,
                        )
                      }
                      className="h-4 w-4"
                    />
                    <Label
                      htmlFor={`economic-${option.value}`}
                      className="cursor-pointer text-xs font-normal leading-tight"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Category - 2 Columns */}
            <div>
              <Label className="mb-2 block text-xs font-medium">
                ক্যাটাগরি
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {categoryOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-1.5"
                  >
                    <Checkbox
                      id={`category-${option.value}`}
                      checked={filters.category.includes(option.value)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(
                          "category",
                          option.value,
                          checked as boolean,
                        )
                      }
                      className="h-4 w-4"
                    />
                    <Label
                      htmlFor={`category-${option.value}`}
                      className="cursor-pointer text-xs font-normal leading-tight"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

export default function BiodataAdvancedFilter() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [upazilaOpen, setUpazilaOpen] = useState(false);

  // URL State Management with nuqs
  const [filters, setFilters] = useQueryStates({
    gender: parseAsString.withDefault("all"),
    maritalStatus: parseAsArrayOf(parseAsString).withDefault([]),
    ageMin: parseAsInteger.withDefault(18),
    ageMax: parseAsInteger.withDefault(40),
    districtId: parseAsString, // Changed from permanentDistrict/currentDistrict
    upazilaId: parseAsString, // Added upazila
    educationMedium: parseAsArrayOf(parseAsString).withDefault([]),
    religiousEducation: parseAsArrayOf(parseAsString).withDefault([]),
    heightMin: parseAsInteger.withDefault(4),
    heightMax: parseAsInteger.withDefault(7),
    skinColor: parseAsArrayOf(parseAsString).withDefault([]),
    fiqh: parseAsArrayOf(parseAsString).withDefault([]),
    profession: parseAsArrayOf(parseAsString).withDefault([]),
    economicStatus: parseAsArrayOf(parseAsString).withDefault([]),
    category: parseAsArrayOf(parseAsString).withDefault([]),
  });

  // Collapsible sections state - ALL CLOSED BY DEFAULT
  const [openSections, setOpenSections] = useState({
    primary: true,
    address: true,
    education: true,
    personal: false,
    profession: false,
    others: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCheckboxChange = (
    field: keyof typeof filters,
    value: string,
    checked: boolean,
  ) => {
    const currentValues = filters[field] as string[];
    if (checked) {
      setFilters({ [field]: [...currentValues, value] });
    } else {
      setFilters({ [field]: currentValues.filter((v) => v !== value) });
    }
  };

  const handleReset = () => {
    setFilters({
      gender: "all",
      maritalStatus: [],
      ageMin: 18,
      ageMax: 40,
      districtId: null,
      upazilaId: null,
      educationMedium: [],
      religiousEducation: [],
      heightMin: 4,
      heightMax: 7,
      skinColor: [],
      fiqh: [],
      profession: [],
      economicStatus: [],
      category: [],
    });
  };

  // Get available upazilas based on selected district
  const availableUpazilas = filters.districtId
    ? upazilas.filter((upazila) => upazila.district_id === filters.districtId)
    : [];

  // Get selected district and upazila objects
  const selectedDistrict = districts.find((d) => d.id === filters.districtId);
  const selectedUpazila = upazilas.find((u) => u.id === filters.upazilaId);

  const hasActiveFilters =
    filters.gender !== "all" ||
    filters.maritalStatus.length > 0 ||
    filters.ageMin !== 18 ||
    filters.ageMax !== 40 ||
    filters.districtId ||
    filters.upazilaId ||
    filters.educationMedium.length > 0 ||
    filters.religiousEducation.length > 0 ||
    filters.heightMin !== 4 ||
    filters.heightMax !== 7 ||
    filters.skinColor.length > 0 ||
    filters.fiqh.length > 0 ||
    filters.profession.length > 0 ||
    filters.economicStatus.length > 0 ||
    filters.category.length > 0;

  return (
    <>
      {/* Mobile Filter Button */}
      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button className=" h-14 w-14 rounded-full bg-pink-600 shadow-lg hover:bg-pink-700">
              <Filter className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-full p-0 sm:max-w-md overflow-y-auto"
          >
            <SheetHeader className="border-b p-3">
              <SheetTitle className="flex items-center gap-2 text-base">
                <SlidersHorizontal className="h-4 w-4 text-pink-600" />
                ফিল্টার
              </SheetTitle>
            </SheetHeader>
            <div className="p-3">
              <FilterContent
                filters={filters}
                setFilters={setFilters}
                handleCheckboxChange={handleCheckboxChange}
                handleReset={handleReset}
                hasActiveFilters={hasActiveFilters}
                openSections={openSections}
                toggleSection={toggleSection}
                districtOpen={districtOpen}
                setDistrictOpen={setDistrictOpen}
                upazilaOpen={upazilaOpen}
                setUpazilaOpen={setUpazilaOpen}
                availableUpazilas={availableUpazilas}
                selectedDistrict={selectedDistrict}
                selectedUpazila={selectedUpazila}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-4 w-72 rounded-xl border border-pink-100 bg-white p-4">
          <div className="mb-3 flex items-center justify-between border-b pb-3">
            <h3 className="flex items-center gap-2 text-base font-bold">
              <SlidersHorizontal className="h-4 w-4 text-pink-600" />
              ফিল্টার
            </h3>
            {hasActiveFilters && (
              <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-semibold text-pink-600">
                সক্রিয়
              </span>
            )}
          </div>
          <FilterContent
            filters={filters}
            setFilters={setFilters}
            handleCheckboxChange={handleCheckboxChange}
            handleReset={handleReset}
            hasActiveFilters={hasActiveFilters}
            openSections={openSections}
            toggleSection={toggleSection}
            districtOpen={districtOpen}
            setDistrictOpen={setDistrictOpen}
            upazilaOpen={upazilaOpen}
            setUpazilaOpen={setUpazilaOpen}
            availableUpazilas={availableUpazilas}
            selectedDistrict={selectedDistrict}
            selectedUpazila={selectedUpazila}
          />
        </div>
      </div>
    </>
  );
}
