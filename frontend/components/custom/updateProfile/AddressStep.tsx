"use client";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { districts } from "@/staticData/districts";
import { upazilas } from "@/staticData/upazilas";
import { useProfileStore } from "@/zustan/useProfileStore";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

export function AddressStep() {
  const formData = useProfileStore((state) => state.formData);
  const updateNestedField = useProfileStore((state) => state.updateNestedField);

  const [districtOpen, setDistrictOpen] = useState(false);
  const [upazilaOpen, setUpazilaOpen] = useState(false);

  // Find selected district based on stored name
  const selectedDistrict = districts.find(
    (d) => d.name === formData?.address?.district,
  );

  // Find selected upazila based on stored name
  const selectedUpazila = upazilas.find(
    (u) => u.name === formData?.address?.upazila,
  );

  // Filter upazilas based on selected district
  const availableUpazilas = selectedDistrict
    ? upazilas.filter((upazila) => upazila.district_id === selectedDistrict.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {/* District Selector */}
        <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={districtOpen}
              className="h-12 w-full justify-between rounded-xl border-2 border-gray-200 bg-gray-50/50 text-base font-medium transition-all hover:border-pink-300 hover:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
            >
              <span className="truncate">
                {selectedDistrict?.bn_name || "জেলা নির্বাচন করুন"}
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0" align="start">
            <Command>
              <CommandInput placeholder="জেলা খুঁজুন..." className="h-10" />
              <CommandEmpty>কোনো জেলা পাওয়া যায়নি।</CommandEmpty>
              <CommandGroup className="max-h-48 overflow-y-auto">
                {districts.map((d) => (
                  <CommandItem
                    key={d.id}
                    value={d.bn_name}
                    onSelect={() => {
                      updateNestedField("address", "district", d.name);
                      updateNestedField("address", "upazila", ""); // Reset upazila
                      setDistrictOpen(false);
                    }}
                    className="py-3"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-pink-600",
                        selectedDistrict?.id === d.id
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

        {/* Upazila Selector */}
        <Popover open={upazilaOpen} onOpenChange={setUpazilaOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={upazilaOpen}
              disabled={!selectedDistrict}
              className="h-12 w-full justify-between rounded-xl border-2 border-gray-200 bg-gray-50/50 text-base font-medium transition-all hover:border-pink-300 hover:bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-200 disabled:cursor-not-allowed"
            >
              <span className="truncate">
                {selectedUpazila?.bn_name || "উপজেলা নির্বাচন করুন"}
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0" align="start">
            <Command>
              <CommandInput placeholder="উপজেলা খুঁজুন..." className="h-10" />
              <CommandEmpty>কোনো উপজেলা পাওয়া যায়নি।</CommandEmpty>
              <CommandGroup className="max-h-48 overflow-y-auto">
                {availableUpazilas.map((upazila) => (
                  <CommandItem
                    key={upazila.id}
                    value={upazila.bn_name}
                    onSelect={() => {
                      updateNestedField("address", "upazila", upazila.name);
                      setUpazilaOpen(false);
                    }}
                    className="py-3"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-pink-600",
                        selectedUpazila?.id === upazila.id
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

      <div className="space-y-2">
        <Label htmlFor="presentAddress">বর্তমান ঠিকানা *</Label>
        <Textarea
          id="presentAddress"
          value={formData.address?.presentAddress || ""}
          onChange={(e) =>
            updateNestedField("address", "presentAddress", e.target.value)
          }
          placeholder="বর্তমান ঠিকানা লিখুন"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="permanentAddress">স্থায়ী ঠিকানা</Label>
        <Textarea
          id="permanentAddress"
          value={formData.address?.permanentAddress || ""}
          onChange={(e) =>
            updateNestedField("address", "permanentAddress", e.target.value)
          }
          placeholder="স্থায়ী ঠিকানা লিখুন"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="extraInfo">অন্যান্য তথ্য</Label>
        <Textarea
          id="extraInfo"
          value={formData.address?.extraInfo || ""}
          onChange={(e) =>
            updateNestedField("address", "extraInfo", e.target.value)
          }
          placeholder="অতিরিক্ত তথ্য"
          rows={2}
        />
      </div>
    </div>
  );
}
