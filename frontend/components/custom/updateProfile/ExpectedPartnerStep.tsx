"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProfileStore } from "@/zustan/useProfileStore";

export function ExpectedPartnerStep() {
  const formData = useProfileStore((state) => state.formData);
  const updateNestedField = useProfileStore((state) => state.updateNestedField);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="partnerAge">বয়স</Label>
          <Input
            id="partnerAge"
            value={formData.expectedLifePartner?.age || ""}
            onChange={(e) =>
              updateNestedField("expectedLifePartner", "age", e.target.value)
            }
            placeholder="যেমন: ২৫-৩০"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="complexion">গাত্রবর্ণ</Label>
          <Input
            id="complexion"
            value={formData.expectedLifePartner?.complexion || ""}
            onChange={(e) =>
              updateNestedField(
                "expectedLifePartner",
                "complexion",
                e.target.value,
              )
            }
            placeholder="ফর্সা/শ্যামলা/যেকোনো"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="partnerHeight">উচ্চতা</Label>
          <Input
            id="partnerHeight"
            value={formData.expectedLifePartner?.height || ""}
            onChange={(e) =>
              updateNestedField("expectedLifePartner", "height", e.target.value)
            }
            placeholder="যেমন: ৫ ফুট ৫ ইঞ্চি"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="partnerEducation">শিক্ষাগত যোগ্যতা</Label>
          <Input
            id="partnerEducation"
            value={formData.expectedLifePartner?.education || ""}
            onChange={(e) =>
              updateNestedField(
                "expectedLifePartner",
                "education",
                e.target.value,
              )
            }
            placeholder="ন্যূনতম যোগ্যতা"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="partnerDistrict">জেলা</Label>
          <Input
            id="partnerDistrict"
            value={formData.expectedLifePartner?.district || ""}
            onChange={(e) =>
              updateNestedField(
                "expectedLifePartner",
                "district",
                e.target.value,
              )
            }
            placeholder="পছন্দের জেলা"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="partnerUpazila">উপজেলা</Label>
          <Input
            id="partnerUpazila"
            value={formData.expectedLifePartner?.upazila || ""}
            onChange={(e) =>
              updateNestedField(
                "expectedLifePartner",
                "upazila",
                e.target.value,
              )
            }
            placeholder="পছন্দের উপজেলা"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="partnerMaritalStatus">বৈবাহিক অবস্থা</Label>
          <Input
            id="partnerMaritalStatus"
            value={formData.expectedLifePartner?.maritalStatus || ""}
            onChange={(e) =>
              updateNestedField(
                "expectedLifePartner",
                "maritalStatus",
                e.target.value,
              )
            }
            placeholder="অবিবাহিত/বিধবা/তালাকপ্রাপ্ত"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="partnerProfession">পেশা</Label>
          <Input
            id="partnerProfession"
            value={formData.expectedLifePartner?.profession || ""}
            onChange={(e) =>
              updateNestedField(
                "expectedLifePartner",
                "profession",
                e.target.value,
              )
            }
            placeholder="পছন্দের পেশা"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="financialCondition">অর্থনৈতিক অবস্থা</Label>
          <Input
            id="financialCondition"
            value={formData.expectedLifePartner?.financialCondition || ""}
            onChange={(e) =>
              updateNestedField(
                "expectedLifePartner",
                "financialCondition",
                e.target.value,
              )
            }
            placeholder="নিম্ন/মধ্যবিত্ত/উচ্চবিত্ত"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expectedQuality">
          জীবনসঙ্গীর যে গুণাবলী প্রত্যাশা করেন
        </Label>
        <Textarea
          id="expectedQuality"
          value={formData.expectedLifePartner?.expectedQuality || ""}
          onChange={(e) =>
            updateNestedField(
              "expectedLifePartner",
              "expectedQuality",
              e.target.value,
            )
          }
          placeholder="আপনার প্রত্যাশিত জীবনসঙ্গীর গুণাবলী বিস্তারিত লিখুন"
          rows={5}
        />
      </div>
    </div>
  );
}
