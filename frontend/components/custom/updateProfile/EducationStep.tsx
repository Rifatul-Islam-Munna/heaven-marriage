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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useProfileStore } from "@/zustan/useProfileStore";
import {
  educationMediumOptions,
  educationOptions,
} from "@/staticData/all-data";
import { useMemo } from "react";

export function EducationStep() {
  const formData = useProfileStore((state) => state.formData);
  const updateNestedField = useProfileStore((state) => state.updateNestedField);

  // Filter education options based on gender
  const userGender = formData.gender || formData.gender;
  const filteredEducationOptions = useMemo(() => {
    if (!userGender) return educationOptions;
    return educationOptions.filter(
      (option) => option.gender === userGender || option.gender === "both",
    );
  }, [userGender]);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {/* NEW DROPDOWN - EDUCATION BACKGROUND */}
        <div className="space-y-2">
          <Label htmlFor="educationBackground">শিক্ষাগত পটভূমি *</Label>
          <Select
            value={formData.educationInfo?.educationBackground || ""}
            onValueChange={(value) =>
              updateNestedField("educationInfo", "educationBackground", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {filteredEducationOptions.map((option) => (
                <SelectItem key={option.bangla} value={option.bangla}>
                  {option.bangla}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* EXISTING CODE - UNCHANGED */}
        <div className="space-y-2">
          <Label htmlFor="educationMethod">শিক্ষা মাধ্যম *</Label>
          <Select
            value={formData.educationInfo?.educationMethod || ""}
            onValueChange={(value) =>
              updateNestedField("educationInfo", "educationMethod", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {educationMediumOptions.map((option) => (
                <SelectItem key={option?.value} value={option?.value}>
                  {option?.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="highestEducation">সর্বোচ্চ শিক্ষাগত যোগ্যতা *</Label>
          <Input
            id="highestEducation"
            value={formData.educationInfo?.highestEducation || ""}
            onChange={(e) =>
              updateNestedField(
                "educationInfo",
                "highestEducation",
                e.target.value,
              )
            }
            placeholder="যেমন: স্নাতক"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="highestEducationBoard">বোর্ড</Label>
          <Input
            id="highestEducationBoard"
            value={formData.educationInfo?.highestEducationBoard || ""}
            onChange={(e) =>
              updateNestedField(
                "educationInfo",
                "highestEducationBoard",
                e.target.value,
              )
            }
            placeholder="ঢাকা বোর্ড"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="highestEducationGroup">বিষয়/বিভাগ</Label>
          <Input
            id="highestEducationGroup"
            value={formData.educationInfo?.highestEducationGroup || ""}
            onChange={(e) =>
              updateNestedField(
                "educationInfo",
                "highestEducationGroup",
                e.target.value,
              )
            }
            placeholder="বিজ্ঞান/কলা/বাণিজ্য"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="highestEducationPassingYear">পাসের সন</Label>
          <Input
            id="highestEducationPassingYear"
            value={formData.educationInfo?.highestEducationPassingYear || ""}
            onChange={(e) =>
              updateNestedField(
                "educationInfo",
                "highestEducationPassingYear",
                e.target.value,
              )
            }
            placeholder="২০২০"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="currentlyStudying"
            checked={
              formData.educationInfo?.currentlyDoingHightEducation || false
            }
            onCheckedChange={(checked) =>
              updateNestedField(
                "educationInfo",
                "currentlyDoingHightEducation",
                checked,
              )
            }
          />
          <Label htmlFor="currentlyStudying" className="cursor-pointer">
            বর্তমানে অধ্যয়নরত
          </Label>
        </div>
      </div>

      <Separator />
    </div>
  );
}
