"use client";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { CheckCircle } from "lucide-react";
import { useProfileStore } from "@/zustan/useProfileStore";

export function PledgeStep() {
  const formData = useProfileStore((state) => state.formData);
  const updateNestedField = useProfileStore((state) => state.updateNestedField);

  return (
    <div className="space-y-6">
      <Alert className="bg-pink-50 border-pink-200">
        <CheckCircle className="h-4 w-4 text-pink-600" />
        <AlertDescription className="text-gray-700">
          দয়া করে নিচের তথ্যগুলো সাবধানে পড়ুন এবং সম্মতি দিন
        </AlertDescription>
      </Alert>

      <div className="space-y-4 bg-white p-6 rounded-lg border">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="youGordianKnowsThis"
            checked={formData.pledge?.youGordianKnowsThis || false}
            onCheckedChange={(checked) =>
              updateNestedField("pledge", "youGordianKnowsThis", checked)
            }
            className="mt-1"
          />
          <Label
            htmlFor="youGordianKnowsThis"
            className="cursor-pointer leading-relaxed"
          >
            আমার অভিভাবক এই বায়োডাটা সম্পর্কে জানেন এবং বিয়ের ব্যাপারে তাঁরা
            রাজি আছেন
          </Label>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="allTheInformationTrue"
            checked={formData.pledge?.allTheInformationTrue || false}
            onCheckedChange={(checked) =>
              updateNestedField("pledge", "allTheInformationTrue", checked)
            }
            className="mt-1"
          />
          <Label
            htmlFor="allTheInformationTrue"
            className="cursor-pointer leading-relaxed"
          >
            আমি সম্পূর্ণ সত্য তথ্য প্রদান করছি এবং কোনো তথ্য গোপন করিনি
          </Label>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="anyMisInformationWeAreNotKnowing"
            checked={formData.pledge?.anyMisInformationWeAreNotKnowing || false}
            onCheckedChange={(checked) =>
              updateNestedField(
                "pledge",
                "anyMisInformationWeAreNotKnowing",
                checked,
              )
            }
            className="mt-1"
          />
          <Label
            htmlFor="anyMisInformationWeAreNotKnowing"
            className="cursor-pointer leading-relaxed"
          >
            যেকোনো ভুল তথ্য প্রদানের দায়ভার সম্পূর্ণ আমার এবং এর জন্য ওয়েবসাইট
            কর্তৃপক্ষ দায়ী থাকবে না
          </Label>
        </div>
      </div>

      <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-lg">
        <p className="text-center text-gray-700 italic">
          "যে ব্যক্তি বিয়ে করল, সে তার অর্ধেক দ্বীন পূর্ণ করল" - হাদিস
        </p>
      </div>
    </div>
  );
}
