"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useProfileStore } from "@/zustan/useProfileStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { economicStatusOptions } from "@/staticData/all-data";

export function FamilyInfoStep() {
  const formData = useProfileStore((state) => state.formData);
  const updateNestedField = useProfileStore((state) => state.updateNestedField);

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-gray-700 mb-4">পিতামাতার তথ্য</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isFatherAlive"
              checked={formData.familyInfo?.isFatherAlive || false}
              onCheckedChange={(checked) =>
                updateNestedField("familyInfo", "isFatherAlive", checked)
              }
            />
            <Label htmlFor="isFatherAlive" className="cursor-pointer">
              পিতা জীবিত
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fathersProfession">পিতার পেশা</Label>
            <Input
              id="fathersProfession"
              value={formData.familyInfo?.fathersProfession || ""}
              onChange={(e) =>
                updateNestedField(
                  "familyInfo",
                  "fathersProfession",
                  e.target.value,
                )
              }
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isMotherAlive"
              checked={formData.familyInfo?.isMotherAlive || false}
              onCheckedChange={(checked) =>
                updateNestedField("familyInfo", "isMotherAlive", checked)
              }
            />
            <Label htmlFor="isMotherAlive" className="cursor-pointer">
              মাতা জীবিত
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mothersProfession">মাতার পেশা</Label>
            <Input
              id="mothersProfession"
              value={formData.familyInfo?.mothersProfession || ""}
              onChange={(e) =>
                updateNestedField(
                  "familyInfo",
                  "mothersProfession",
                  e.target.value,
                )
              }
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold text-gray-700 mb-4">ভাইবোনের তথ্য</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brotherCount">ভাই কতজন</Label>
            <Input
              id="brotherCount"
              type="text"
              value={formData.familyInfo?.brotherCount || ""}
              onChange={(e) =>
                updateNestedField("familyInfo", "brotherCount", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sisterCount">বোন কতজন</Label>
            <Input
              id="sisterCount"
              type="text"
              value={formData.familyInfo?.sisterCount || ""}
              onChange={(e) =>
                updateNestedField("familyInfo", "sisterCount", e.target.value)
              }
            />
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brotherInformation">ভাইদের তথ্য</Label>
            <Textarea
              id="brotherInformation"
              value={formData.familyInfo?.brotherInformation || ""}
              onChange={(e) =>
                updateNestedField(
                  "familyInfo",
                  "brotherInformation",
                  e.target.value,
                )
              }
              placeholder="ভাইদের পেশা, বৈবাহিক অবস্থা ইত্যাদি"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sisterInformation">বোনদের তথ্য</Label>
            <Textarea
              id="sisterInformation"
              value={formData.familyInfo?.sisterInformation || ""}
              onChange={(e) =>
                updateNestedField(
                  "familyInfo",
                  "sisterInformation",
                  e.target.value,
                )
              }
              placeholder="বোনদের পেশা, বৈবাহিক অবস্থা ইত্যাদি"
              rows={3}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold text-gray-700 mb-4">পারিবারিক অবস্থা</h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="space-y-2">
              <Label htmlFor="fiqhFollow">পারিবারিক আর্থিক অবস্থা</Label>
              <Select
                value={formData.familyInfo?.familyFinancial || ""}
                onValueChange={(value) =>
                  updateNestedField("familyInfo", "familyFinancial", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {economicStatusOptions.map((item) => (
                    <SelectItem key={item?.value} value={item?.value}>
                      {item?.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="familyAssetDetails">পারিবারিক সম্পদের বিবরণ</Label>
            <Textarea
              id="familyAssetDetails"
              value={formData.familyInfo?.familyAssetDetails || ""}
              onChange={(e) =>
                updateNestedField(
                  "familyInfo",
                  "familyAssetDetails",
                  e.target.value,
                )
              }
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="familyReligiousCondition">
              পারিবারিক দ্বীনি পরিবেশ
            </Label>
            <Textarea
              id="familyReligiousCondition"
              value={formData.familyInfo?.familyReligiousCondition || ""}
              onChange={(e) =>
                updateNestedField(
                  "familyInfo",
                  "familyReligiousCondition",
                  e.target.value,
                )
              }
              placeholder="পরিবারের দ্বীনি পরিবেশ কেমন তা লিখুন"
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
