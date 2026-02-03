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

export function EducationStep() {
  const formData = useProfileStore((state) => state.formData);
  const updateNestedField = useProfileStore((state) => state.updateNestedField);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
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
              <SelectItem value="general">সাধারণ</SelectItem>
              <SelectItem value="madrasa">মাদ্রাসা</SelectItem>
              <SelectItem value="english">ইংলিশ মিডিয়াম</SelectItem>
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

      <div>
        <h4 className="font-semibold text-gray-700 mb-4">
          এস.এস.সি / দাখিল তথ্য
        </h4>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sSCPassingYear">পাসের সন</Label>
            <Input
              id="sSCPassingYear"
              value={formData.educationInfo?.sSCPassingYear || ""}
              onChange={(e) =>
                updateNestedField(
                  "educationInfo",
                  "sSCPassingYear",
                  e.target.value,
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sSCPassingGroup">বিভাগ</Label>
            <Input
              id="sSCPassingGroup"
              value={formData.educationInfo?.sSCPassingGroup || ""}
              onChange={(e) =>
                updateNestedField(
                  "educationInfo",
                  "sSCPassingGroup",
                  e.target.value,
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sSCResult">ফলাফল</Label>
            <Input
              id="sSCResult"
              value={formData.educationInfo?.sSCResult || ""}
              onChange={(e) =>
                updateNestedField("educationInfo", "sSCResult", e.target.value)
              }
              placeholder="জিপিএ"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold text-gray-700 mb-4">
          এইচ.এস.সি / আলিম তথ্য
        </h4>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="hSCPassingYear">পাসের সন</Label>
            <Input
              id="hSCPassingYear"
              value={formData.educationInfo?.hSCPassingYear || ""}
              onChange={(e) =>
                updateNestedField(
                  "educationInfo",
                  "hSCPassingYear",
                  e.target.value,
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hSCPassingGroup">বিভাগ</Label>
            <Input
              id="hSCPassingGroup"
              value={formData.educationInfo?.hSCPassingGroup || ""}
              onChange={(e) =>
                updateNestedField(
                  "educationInfo",
                  "hSCPassingGroup",
                  e.target.value,
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hSCResult">ফলাফল</Label>
            <Input
              id="hSCResult"
              value={formData.educationInfo?.hSCResult || ""}
              onChange={(e) =>
                updateNestedField("educationInfo", "hSCResult", e.target.value)
              }
              placeholder="জিপিএ"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
