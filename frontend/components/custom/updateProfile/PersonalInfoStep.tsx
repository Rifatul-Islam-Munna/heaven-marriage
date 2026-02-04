"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useProfileStore } from "@/zustan/useProfileStore";
import {
  fiqhOptions,
  religiousEducationOptions,
  skinColorOptions,
} from "@/staticData/all-data";

export function PersonalInfoStep() {
  const formData = useProfileStore((state) => state.formData);
  const updateNestedField = useProfileStore((state) => state.updateNestedField);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="height">উচ্চতা (ফুট)</Label>
          <Input
            id="height"
            type="number"
            step="0.1"
            value={formData.personalInformation?.height || ""}
            onChange={(e) =>
              updateNestedField(
                "personalInformation",
                "height",
                parseFloat(e.target.value),
              )
            }
            placeholder="৫.৫"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="skinTone">গাত্রবর্ণ</Label>
          <Select
            value={formData.personalInformation?.skinTone || ""}
            onValueChange={(value) =>
              updateNestedField("personalInformation", "skinTone", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {skinColorOptions.map((item) => (
                <SelectItem key={item?.value} value={item?.value}>
                  {item?.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="space-y-2">
            <Label htmlFor="মাদ্রাসা/স্বশিক্ষিত">দ্বীনের শিক্ষা</Label>
            <Select
              value={formData.personalInformation?.islamicStudy || ""}
              onValueChange={(value) =>
                updateNestedField("personalInformation", "islamicStudy", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent>
                {religiousEducationOptions.map((item) => (
                  <SelectItem key={item?.value} value={item?.value}>
                    {item?.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="prayerFiverTimeFrom">
            প্রতিদিন পাঁচ ওয়াক্ত নামাজ পড়েন?
          </Label>
          <Input
            id="prayerFiverTimeFrom"
            value={formData.personalInformation?.prayerFiverTimeFrom || ""}
            onChange={(e) =>
              updateNestedField(
                "personalInformation",
                "prayerFiverTimeFrom",
                e.target.value,
              )
            }
            placeholder="যেমন: ২০১৮ সাল থেকে"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reciteQuran">কুরআন তিলওয়াত করতে পারেন?</Label>
          <Input
            id="reciteQuran"
            value={formData.personalInformation?.reciteQuran || ""}
            onChange={(e) =>
              updateNestedField(
                "personalInformation",
                "reciteQuran",
                e.target.value,
              )
            }
            placeholder="হ্যাঁ/না/শুদ্ধভাবে"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fiqhFollow">কোন ফিকহ অনুসরণ করেন?</Label>
          <Select
            value={formData.personalInformation?.fiqhFollow || ""}
            onValueChange={(value) =>
              updateNestedField("personalInformation", "fiqhFollow", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {fiqhOptions.map((item) => (
                <SelectItem key={item?.value} value={item?.value}>
                  {item?.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="outsideClothes">
            ঘরের বাহিরে কি ধরণের পোশাক পরেন?
          </Label>
          <Input
            id="outsideClothes"
            value={formData.personalInformation?.outsideClothes || ""}
            onChange={(e) =>
              updateNestedField(
                "personalInformation",
                "outsideClothes",
                e.target.value,
              )
            }
            placeholder="বোরকা/পাঞ্জাবি"
          />
        </div>

        {formData.gender === "female" && (
          <div className="space-y-2">
            <Label htmlFor="womenNiqbYear">
              কবে থেকে নিকাব সহ পর্দা করছেন?
            </Label>
            <Input
              id="womenNiqbYear"
              value={formData.personalInformation?.womenNiqbYear || ""}
              onChange={(e) =>
                updateNestedField(
                  "personalInformation",
                  "womenNiqbYear",
                  e.target.value,
                )
              }
            />
          </div>
        )}

        {formData.gender === "male" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="manBeard">সুন্নতি দাড়ি আছে? কবে থেকে?</Label>
              <Input
                id="manBeard"
                value={formData.personalInformation?.manBeard || ""}
                onChange={(e) =>
                  updateNestedField(
                    "personalInformation",
                    "manBeard",
                    e.target.value,
                  )
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="manClothAboveAnkels"
                checked={
                  formData.personalInformation?.manClothAboveAnkels || false
                }
                onCheckedChange={(checked) =>
                  updateNestedField(
                    "personalInformation",
                    "manClothAboveAnkels",
                    checked,
                  )
                }
              />
              <Label htmlFor="manClothAboveAnkels" className="cursor-pointer">
                টাখনুর উপরে কাপড় পরেন
              </Label>
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="maharaNonMahram">মাহরাম/নন-মাহরাম মেনে চলেন?</Label>
          <Input
            id="maharaNonMahram"
            value={formData.personalInformation?.maharaNonMahram || ""}
            onChange={(e) =>
              updateNestedField(
                "personalInformation",
                "maharaNonMahram",
                e.target.value,
              )
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="MissPrayerTime">
            সপ্তাহে কত ওয়াক্ত নামায কাযা হয়?
          </Label>
          <Input
            id="MissPrayerTime"
            value={formData.personalInformation?.MissPrayerTime || ""}
            onChange={(e) =>
              updateNestedField(
                "personalInformation",
                "MissPrayerTime",
                e.target.value,
              )
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="digitalMedia">নাটক/সিনেমা/গান দেখেন বা শুনেন?</Label>
          <Input
            id="digitalMedia"
            value={formData.personalInformation?.digitalMedia || ""}
            onChange={(e) =>
              updateNestedField(
                "personalInformation",
                "digitalMedia",
                e.target.value,
              )
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mentalOrPhysicalIssue">
            কোন শারীরিক/মানসিক সমস্যা আছে?
          </Label>
          <Input
            id="mentalOrPhysicalIssue"
            value={formData.personalInformation?.mentalOrPhysicalIssue || ""}
            onChange={(e) =>
              updateNestedField(
                "personalInformation",
                "mentalOrPhysicalIssue",
                e.target.value,
              )
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="specialWorkOfDeen">
          দ্বীনের কোন বিশেষ মেহনতে যুক্ত আছেন?
        </Label>
        <Textarea
          id="specialWorkOfDeen"
          value={formData.personalInformation?.specialWorkOfDeen || ""}
          onChange={(e) =>
            updateNestedField(
              "personalInformation",
              "specialWorkOfDeen",
              e.target.value,
            )
          }
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="islamicBookName">আপনার পড়া ইসলামি বইয়ের নাম</Label>
        <Textarea
          id="islamicBookName"
          value={formData.personalInformation?.islamicBookName || ""}
          onChange={(e) =>
            updateNestedField(
              "personalInformation",
              "islamicBookName",
              e.target.value,
            )
          }
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="islamicScholarsName">পছন্দের আলেমের নাম</Label>
        <Textarea
          id="islamicScholarsName"
          value={formData.personalInformation?.islamicScholarsName || ""}
          onChange={(e) =>
            updateNestedField(
              "personalInformation",
              "islamicScholarsName",
              e.target.value,
            )
          }
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="majarBeliveStatus">মাজার সম্পর্কে আপনার ধারণা</Label>
        <Input
          id="majarBeliveStatus"
          value={formData.personalInformation?.majarBeliveStatus || ""}
          onChange={(e) =>
            updateNestedField(
              "personalInformation",
              "majarBeliveStatus",
              e.target.value,
            )
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="extraInfoHobby">শখ, পছন্দ-অপছন্দ</Label>
        <Textarea
          id="extraInfoHobby"
          value={formData.personalInformation?.extraInfoHobby || ""}
          onChange={(e) =>
            updateNestedField(
              "personalInformation",
              "extraInfoHobby",
              e.target.value,
            )
          }
          rows={3}
        />
      </div>
    </div>
  );
}
