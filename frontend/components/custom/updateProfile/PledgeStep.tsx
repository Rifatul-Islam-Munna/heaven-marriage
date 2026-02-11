"use client";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle } from "lucide-react";
import { useProfileStore } from "@/zustan/useProfileStore";

export function PledgeStep() {
  const formData = useProfileStore((state) => state.formData);
  const updateNestedField = useProfileStore((state) => state.updateNestedField);
  const updatedFieldn = useProfileStore((state) => state.updateField);

  const registrationOptions = [
    "Niqaha এর মাধ্যমে",
    "নিজে নিজে",
    "আলোচনা সাপেক্ষ",
  ];

  return (
    <div className="space-y-6">
      <Alert className="bg-pink-50 border-pink-200">
        <CheckCircle className="h-4 w-4 text-pink-600" />
        <AlertDescription className="text-gray-700">
          দয়া করে নিচের তথ্যগুলো সাবধানে পড়ুন এবং সম্মতি দিন
        </AlertDescription>
      </Alert>

      <div className="space-y-4 bg-white p-6 rounded-lg border">
        <div className="space-y-2">
          <Label htmlFor="howYouWannaGetMarried">
            আপনি কীভাবে বিবাহ সম্পন্ন করতে চান?
          </Label>
          <Select
            value={formData.howYouWannaGetMarried || ""}
            onValueChange={(value) =>
              updatedFieldn("howYouWannaGetMarried", value)
            }
          >
            <SelectTrigger id="howYouWannaGetMarried">
              <SelectValue placeholder="বিবাহের পদ্ধতি নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {registrationOptions.map((option, index) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
            আশা করি আপনি কোনো ভুল তথ্য দেন নি, তারপরও আপনি যদি ইচ্ছাকৃতভাবে কোনো
            ভ্রান্ত বা মিথ্যা তথ্য প্রদান করেন, কিংবা ভবিষ্যতে আপনার দেওয়া
            প্রতিশ্রুতি পালন না করেন, সে ক্ষেত্রে হ্যাভেন ম্যারেজ সলিউশন
            (Niqaha) আপনার সদস্যপদ বাতিলের অধিকার সংরক্ষণ করে। পাশাপাশি, যদি এমন
            পরিস্থিতিতে আপনার স্ত্রী সংসার চালিয়ে যেতে অনিচ্ছুক হন এবং
            Niqaha-এর সংশ্লিষ্ট কর্মকর্তাদের সঙ্গে পরামর্শক্রমে বিষয়টি যৌক্তিক
            বিবেচিত হয়, তাহলে আপনি স্ত্রীর অনুরোধ ও ন্যায্য প্রয়োজনে তালাক
            প্রদানের বিষয়ে সম্মত থাকবেন কি না?
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
