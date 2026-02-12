"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfileStore } from "@/zustan/useProfileStore";
import { countries, marriedStatus } from "@/staticData/all-data";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export function BasicInfoStep() {
  const formData = useProfileStore((state) => state.formData);
  const updateField = useProfileStore((state) => state.updateField);
  const filterOutstatus = marriedStatus.filter((item) => item.id !== 1);
  const shouldShowEmail = useProfileStore((state) => state.shouldShowEmail); // ✅
  const shouldShowPhoneNumber = useProfileStore(
    (state) => state.shouldShowPhoneNumber,
  );
  const filteredMaritalStatus = useMemo(() => {
    if (formData.gender === "all") {
      return marriedStatus;
    }
    return marriedStatus.filter(
      (status) => status.gender === "all" || status.gender === formData.gender,
    );
  }, [formData.gender]);
  console.log("shouldShowEmail", shouldShowEmail);
  const [countryOpen, setCountryOpen] = useState(false);
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">নাম *</Label>
          <Input
            id="name"
            value={formData.name || ""}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="আপনার পূর্ণ নাম"
          />
        </div>
        {shouldShowEmail && (
          <div className="space-y-2">
            <Label htmlFor="name">ইমেইল </Label>
            <Input
              id="name"
              value={formData.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="আপনার পূর্ণ ইমেইল"
            />
          </div>
        )}
        {shouldShowPhoneNumber && (
          <div className="space-y-2">
            <Label htmlFor="name">মোবাইল নম্বর </Label>
            <Input
              id="name"
              value={formData.phoneNumber || ""}
              onChange={(e) => updateField("phoneNumber", e.target.value)}
              placeholder="আপনার পূর্ণ মোবাইল নম্বর"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="gender">লিঙ্গ *</Label>
          <Select
            value={formData.gender || ""}
            onValueChange={(value) => updateField("gender", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">পুরুষ</SelectItem>
              <SelectItem value="female">মহিলা</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maritalStatus">বৈবাহিক অবস্থা *</Label>
          <Select
            value={formData.maritalStatus || ""}
            onValueChange={(value) => updateField("maritalStatus", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {filteredMaritalStatus.map((status) => (
                <SelectItem key={status.id} value={status.en}>
                  {status.bn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="age">বয়স *</Label>
          <Input
            id="age"
            type="number"
            value={formData.age || ""}
            onChange={(e) => updateField("age", parseInt(e.target.value))}
            placeholder="বছর"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bloodGroup">রক্তের গ্রুপ</Label>
          <Select
            value={formData.bloodGroup || ""}
            onValueChange={(value) => updateField("bloodGroup", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A+">A+</SelectItem>
              <SelectItem value="A-">A-</SelectItem>
              <SelectItem value="B+">B+</SelectItem>
              <SelectItem value="B-">B-</SelectItem>
              <SelectItem value="O+">O+</SelectItem>
              <SelectItem value="O-">O-</SelectItem>
              <SelectItem value="AB+">AB+</SelectItem>
              <SelectItem value="AB-">AB-</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight">ওজন (কেজি)</Label>
          <Input
            id="weight"
            type="number"
            value={formData.weight || ""}
            onChange={(e) => updateField("weight", parseInt(e.target.value))}
            placeholder="কেজি"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nationality">জাতীয়তা/দেশ</Label>
          {/* <Input
            id="nationality"
            value={formData.nationality || ""}
            onChange={(e) => updateField("nationality", e.target.value)}
            placeholder="বাংলাদেশী"
          /> */}
          <Popover open={countryOpen} onOpenChange={setCountryOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={countryOpen}
                className="h-11 w-full justify-between rounded-xl border-2 border-gray-200 bg-gray-50/50 text-sm font-medium transition-all hover:border-pink-300 hover:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 sm:h-12 sm:text-base"
              >
                <span className="truncate">
                  {countries.find((c) => c.en === formData.nationality)?.bn ||
                    "দেশ নির্বাচন করুন"}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[200px] p-0 sm:w-[260px]"
              align="start"
            >
              <Command>
                <CommandInput placeholder="দেশ খুঁজুন..." className="h-10" />
                <CommandEmpty>কোনো দেশ পাওয়া যায়নি।</CommandEmpty>
                <CommandGroup className="max-h-48 overflow-y-auto">
                  {countries.map((country) => (
                    <CommandItem
                      key={country.id}
                      value={country.bn}
                      onSelect={(value) => {
                        updateField(
                          "nationality",
                          countries.find((c) => c.bn === value)!.en,
                        );

                        setCountryOpen(false);
                      }}
                      className="py-2.5 sm:py-3"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 text-pink-600",
                          formData.nationality === country.en
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
      </div>
    </div>
  );
}
