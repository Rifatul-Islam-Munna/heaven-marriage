"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProfileStore } from "@/zustan/useProfileStore";

export function OccupationalStep() {
  const formData = useProfileStore((state) => state.formData);
  const updateNestedField = useProfileStore((state) => state.updateNestedField);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="profession">পেশা *</Label>
        <Input
          id="profession"
          value={formData.occupational?.profession || ""}
          onChange={(e) =>
            updateNestedField("occupational", "profession", e.target.value)
          }
          placeholder="যেমন: শিক্ষক, ব্যবসায়ী, ছাত্র"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="workingDetails">পেশার বিস্তারিত বিবরণ</Label>
        <Textarea
          id="workingDetails"
          value={formData.occupational?.workingDetails || ""}
          onChange={(e) =>
            updateNestedField("occupational", "workingDetails", e.target.value)
          }
          placeholder="কোথায় কাজ করেন, পদবি, কাজের ধরন ইত্যাদি"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="salary">মাসিক আয়</Label>
        <Input
          id="salary"
          value={formData.occupational?.salary || ""}
          onChange={(e) =>
            updateNestedField("occupational", "salary", e.target.value)
          }
          placeholder="যেমন: ৩০,০০০ টাকা"
        />
      </div>
    </div>
  );
}
