"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProfileStore } from "@/zustan/useProfileStore";

export function AddressStep() {
  const formData = useProfileStore((state) => state.formData);
  const updateNestedField = useProfileStore((state) => state.updateNestedField);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="district">জেলা *</Label>
          <Input
            id="district"
            value={formData.address?.district || ""}
            onChange={(e) =>
              updateNestedField("address", "district", e.target.value)
            }
            placeholder="জেলার নাম"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="upazila">উপজেলা *</Label>
          <Input
            id="upazila"
            value={formData.address?.upazila || ""}
            onChange={(e) =>
              updateNestedField("address", "upazila", e.target.value)
            }
            placeholder="উপজেলার নাম"
          />
        </div>
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
