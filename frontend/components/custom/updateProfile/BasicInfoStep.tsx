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
import { useProfileStore } from "@/zustan/useProfileStore";

export function BasicInfoStep() {
  const formData = useProfileStore((state) => state.formData);
  const updateField = useProfileStore((state) => state.updateField);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">নাম *</Label>
          <Input
            id="name"
            value={formData.name || ""}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="আপনার পূর্ণ নাম"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">লিঙ্গ *</Label>
          <Select
            value={formData.gender || ""}
            onValueChange={(value) => updateField("gender", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">পুরুষ</SelectItem>
              <SelectItem value="female">মহিলা</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maritalStatus">বৈবাহিক অবস্থা *</Label>
          <Select
            value={formData.maritalStatus || ""}
            onValueChange={(value) => updateField("maritalStatus", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unmarried">অবিবাহিত</SelectItem>
              <SelectItem value="divorced">তালাকপ্রাপ্ত</SelectItem>
              <SelectItem value="widowed">বিধবা/বিপত্নীক</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="age">বয়স *</Label>
          <Input
            id="age"
            type="number"
            value={formData.age || ""}
            onChange={(e) => updateField("age", parseInt(e.target.value))}
            placeholder="বছর"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bloodGroup">রক্তের গ্রুপ</Label>
          <Select
            value={formData.bloodGroup || ""}
            onValueChange={(value) => updateField("bloodGroup", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A+">A+</SelectItem>
              <SelectItem value="A-">A-</SelectItem>
              <SelectItem value="B+">B+</SelectItem>
              <SelectItem value="B-">B-</SelectItem>
              <SelectItem value="O+">O+</SelectItem>
              <SelectItem value="O-">O-</SelectItem>
              <SelectItem value="AB+">AB+</SelectItem>
              <SelectItem value="AB-">AB-</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight">ওজন (কেজি)</Label>
          <Input
            id="weight"
            type="number"
            value={formData.weight || ""}
            onChange={(e) => updateField("weight", parseInt(e.target.value))}
            placeholder="কেজি"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nationality">জাতীয়তা</Label>
          <Input
            id="nationality"
            value={formData.nationality || ""}
            onChange={(e) => updateField("nationality", e.target.value)}
            placeholder="বাংলাদেশী"
          />
        </div>
      </div>
    </div>
  );
}
