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
import { Textarea } from "@/components/ui/textarea";
import { professionOptions } from "@/staticData/all-data";
import { useProfileStore } from "@/zustan/useProfileStore";

export function OccupationalStep() {
  const formData = useProfileStore((state) => state.formData);
  const updateNestedField = useProfileStore((state) => state.updateNestedField);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="profession">পেশা *</Label>

        <Select
          value={formData.occupational?.profession || ""}
          onValueChange={(value) =>
            updateNestedField("occupational", "profession", value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="নির্বাচন করুন" />
          </SelectTrigger>
          <SelectContent>
            {professionOptions.map((option) => (
              <SelectItem key={option?.value} value={option?.value}>
                {option?.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
