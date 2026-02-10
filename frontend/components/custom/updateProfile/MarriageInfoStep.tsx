"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useProfileStore } from "@/zustan/useProfileStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { polygamyConsentOptions } from "@/staticData/all-data";

export function MarriageInfoStep() {
  const formData = useProfileStore((state) => state.formData);
  const updateNestedField = useProfileStore((state) => state.updateNestedField);
  const childCareConsent = [
    { id: 1, label: "জি, প্রস্তুত আছি।", value: "yes_prepared" },
    { id: 2, label: "না, প্রস্তুত নাই", value: "not_prepared" },
    {
      id: 3,
      label: "শর্তসাপেক্ষ প্রস্তুত আছি।",
      value: "conditional_prepared",
    },
  ];
  const childCustodyDecision = [
    { id: 1, label: "আমার সাথে", value: "with_me" },
    { id: 2, label: "তার বাবার কাছে", value: "with_father" },
    { id: 3, label: "আমার পরিবারের কারোর কাছে", value: "with_my_family" },
    { id: 4, label: "প্রযোজ্য না", value: "not_applicable" },
  ];
  if (formData.gender === "female") {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isGuardiansAgreed"
            checked={
              formData.marriageInformationWomen?.isGuardiansAgreed || false
            }
            onCheckedChange={(checked) =>
              updateNestedField(
                "marriageInformationWomen",
                "isGuardiansAgreed",
                checked,
              )
            }
          />
          <Label htmlFor="isGuardiansAgreed" className="cursor-pointer">
            অভিভাবক বিয়েতে রাজি
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="jobAfterMarriage">বিয়ের পর চাকরি করতে ইচ্ছুক?</Label>
          <Input
            id="jobAfterMarriage"
            value={formData.marriageInformationWomen?.jobAfterMarriage || ""}
            onChange={(e) =>
              updateNestedField(
                "marriageInformationWomen",
                "jobAfterMarriage",
                e.target.value,
              )
            }
            placeholder="হ্যাঁ/না/শর্তসাপেক্ষে"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="studyAfterMarriage">
            বিয়ের পর পড়াশোনা চালিয়ে যেতে চান?
          </Label>
          <Input
            id="studyAfterMarriage"
            value={formData.marriageInformationWomen?.studyAfterMarriage || ""}
            onChange={(e) =>
              updateNestedField(
                "marriageInformationWomen",
                "studyAfterMarriage",
                e.target.value,
              )
            }
            placeholder="হ্যাঁ/না"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wifeVailAfterMarriage">
            আপনি কারো ২য়/৩য়/৪র্থ স্ত্রী (মাসনা, সুলাছা, রূবা'আ) হতে রাজি আছেন
            কি না?
          </Label>
          <Select
            value={
              formData.marriageInformationWomen?.polygamyConsentOptions || ""
            }
            onValueChange={(value) =>
              updateNestedField(
                "marriageInformationWomen",
                "polygamyConsentOptions",
                value,
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {polygamyConsentOptions.map((option) => (
                <SelectItem key={option.id} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="wifeVailAfterMarriage">
            আপনার স্বামীর অন্য স্ত্রীর মা-হারা সন্তান থাকলে তাদেরকে লালন-পালন
            করতে প্রস্তুত আছেন কি না?
          </Label>
          <Select
            value={formData.marriageInformationWomen?.caringforChildren || ""}
            onValueChange={(value) =>
              updateNestedField(
                "marriageInformationWomen",
                "caringforChildren",
                value,
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {childCareConsent.map((option) => (
                <SelectItem key={option.id} value={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="wifeVailAfterMarriage">
            আপনার অন্য ঘরের সন্তান থাকলে কোথায় রাখতে চান, তার ব্যাপারে কী
            সিদ্ধান্ত আপনার? (বিবাহিতা ও সন্তানবিশিষ্টা হলে)। অবিবাহিতা হলে
            “প্রযোজ্য না” লিখুন।
          </Label>
          <Select
            value={formData.marriageInformationWomen?.childCustody || ""}
            onValueChange={(value) =>
              updateNestedField(
                "marriageInformationWomen",
                "childCustody",
                value,
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {childCustodyDecision.map((option) => (
                <SelectItem key={option.id} value={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="thoughtsOnMarriage">বিয়ে সম্পর্কে আপনার ধারণা</Label>
          <Textarea
            id="thoughtsOnMarriage"
            value={formData.marriageInformationWomen?.thoughtsOnMarriage || ""}
            onChange={(e) =>
              updateNestedField(
                "marriageInformationWomen",
                "thoughtsOnMarriage",
                e.target.value,
              )
            }
            placeholder="বিয়ে সম্পর্কে আপনার চিন্তাভাবনা"
            rows={4}
          />
        </div>
      </div>
    );
  }

  // Male
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isGuardiansAgreed"
          checked={formData.marriageInformationMan?.isGuardiansAgreed || false}
          onCheckedChange={(checked) =>
            updateNestedField(
              "marriageInformationMan",
              "isGuardiansAgreed",
              checked,
            )
          }
        />
        <Label htmlFor="isGuardiansAgreed" className="cursor-pointer">
          অভিভাবক বিয়েতে রাজি
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wifeVailAfterMarriage">
          বিয়ের পর স্ত্রীকে পর্দায় রাখতে পারবেন?
        </Label>
        <Select
          value={formData.marriageInformationMan?.wifeVailAfterMarriage || ""}
          onValueChange={(value) =>
            updateNestedField(
              "marriageInformationMan",
              "wifeVailAfterMarriage",
              value,
            )
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="নির্বাচন করুন" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="হ্যাঁ">হ্যাঁ</SelectItem>
            <SelectItem value="না">না</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="allowWifeStudyAfterMarriage">
          স্ত্রীকে পড়াশোনা করতে দিতে চান?
        </Label>
        <Select
          value={
            formData.marriageInformationMan?.allowWifeStudyAfterMarriage || ""
          }
          onValueChange={(value) =>
            updateNestedField(
              "marriageInformationMan",
              "allowWifeStudyAfterMarriage",
              value,
            )
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="নির্বাচন করুন" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="হ্যাঁ">হ্যাঁ</SelectItem>
            <SelectItem value="না">না</SelectItem>
            <SelectItem value="শর্তসাপেক্ষে">শর্তসাপেক্ষে</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wifeJobAfterMarriage">
          স্ত্রীকে চাকরি করতে দিতে চান?
        </Label>
        <Select
          value={formData.marriageInformationMan?.wifeJobAfterMarriage || ""}
          onValueChange={(value) =>
            updateNestedField(
              "marriageInformationMan",
              "wifeJobAfterMarriage",
              value,
            )
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="নির্বাচন করুন" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="হ্যাঁ">হ্যাঁ</SelectItem>
            <SelectItem value="না">না</SelectItem>
            <SelectItem value="শর্তসাপেক্ষে">শর্তসাপেক্ষে</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="livingPlaceAfterMarriage">
          বিয়ের পর কোথায় থাকবেন?
        </Label>
        <Input
          id="livingPlaceAfterMarriage"
          value={
            formData.marriageInformationMan?.livingPlaceAfterMarriage || ""
          }
          onChange={(e) =>
            updateNestedField(
              "marriageInformationMan",
              "livingPlaceAfterMarriage",
              e.target.value,
            )
          }
          placeholder="নিজস্ব বাসা/পরিবারের সাথে"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expectedAnyGiftFromMarriage">
          পাত্রীপক্ষের কাছে কোনো উপহার আশা করেন?
        </Label>
        <Select
          value={
            formData.marriageInformationMan?.expectedAnyGiftFromMarriage || ""
          }
          onValueChange={(value) =>
            updateNestedField(
              "marriageInformationMan",
              "expectedAnyGiftFromMarriage",
              value,
            )
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="নির্বাচন করুন" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="হ্যাঁ">হ্যাঁ</SelectItem>
            <SelectItem value="না">না</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="thoughtsOnMarriage">বিয়ে সম্পর্কে আপনার ধারণা</Label>
        <Textarea
          id="thoughtsOnMarriage"
          value={formData.marriageInformationMan?.thoughtsOnMarriage || ""}
          onChange={(e) =>
            updateNestedField(
              "marriageInformationMan",
              "thoughtsOnMarriage",
              e.target.value,
            )
          }
          placeholder="বিয়ে সম্পর্কে আপনার চিন্তাভাবনা"
          rows={4}
        />
      </div>
    </div>
  );
}
