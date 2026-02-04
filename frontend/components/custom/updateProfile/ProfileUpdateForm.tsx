"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { BasicInfoStep } from "./BasicInfoStep";
import { AddressStep } from "./AddressStep";
import { EducationStep } from "./EducationStep";
import { PersonalInfoStep } from "./PersonalInfoStep";
import { FamilyInfoStep } from "./FamilyInfoStep";
import { OccupationalStep } from "./OccupationalStep";
import { MarriageInfoStep } from "./MarriageInfoStep";
import { ExpectedPartnerStep } from "./ExpectedPartnerStep";
import { PledgeStep } from "./PledgeStep";
import { useProfileStore } from "@/zustan/useProfileStore";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useEffect } from "react";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { useRouter } from "next/navigation";

const steps = [
  "মৌলিক তথ্য",
  "ঠিকানা",
  "শিক্ষাগত যোগ্যতা",
  "ব্যক্তিগত তথ্য",
  "পারিবারিক তথ্য",
  "পেশাগত তথ্য",
  "বিবাহ সম্পর্কিত তথ্য",
  "প্রত্যাশিত জীবনসঙ্গী",
  "অঙ্গীকার",
];

export default function ProfileUpdateForm() {
  const currentStep = useProfileStore((state) => state.currentStep);
  const setCurrentStep = useProfileStore((state) => state.setCurrentStep);
  const getFormData = useProfileStore((state) => state.getFormData);
  const initializeForm = useProfileStore((state) => state.initializeForm);
  console.log("current-data", getFormData());
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const { data, isLoading } = useQueryWrapper(
    ["get-my-profile"],
    "/user/get-my-profile",
  );
  const router = useRouter();
  const { mutate, isPending } = useCommonMutationApi({
    method: "PATCH",
    url: "/user/update-user",
    mutationKey: ["update-user"],
    successMessage: "User Updated",
    onSuccess: (data) => {
      return router.push("/profile");
    },
  });
  useEffect(() => {
    if (data) {
      initializeForm(data);
    }
  }, [data]);

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    const formData = getFormData();

    console.log("Submitting:", formData);

    mutate(formData);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <BasicInfoStep />;
      case 1:
        return <AddressStep />;
      case 2:
        return <EducationStep />;
      case 3:
        return <PersonalInfoStep />;
      case 4:
        return <FamilyInfoStep />;
      case 5:
        return <OccupationalStep />;
      case 6:
        return <MarriageInfoStep />;
      case 7:
        return <ExpectedPartnerStep />;
      case 8:
        return <PledgeStep />;
      default:
        return <BasicInfoStep />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 py-4 sm:py-6 lg:py-8">
      <div className="w-full container mx-auto px-3 sm:px-4 lg:px-6">
        {/* Progress Steps */}
        <div className="mb-6 sm:mb-8">
          {/* Mobile: Simple Progress Bar */}
          <div className="block sm:hidden mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                ধাপ {currentStep + 1} / {steps.length}
              </span>
              <span className="text-xs text-gray-500">
                {steps[currentStep]}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-pink-600 h-2 rounded-full  transition-all duration-300"
                style={{
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Desktop: Detailed Steps */}
          <div className="hidden sm:flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={index} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold transition-all duration-200 ${
                      index < currentStep
                        ? "bg-green-500 text-white"
                        : index === currentStep
                          ? "bg-pink-600 text-white ring-4 ring-pink-100"
                          : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="w-4 h-4 md:w-5 md:h-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <p className="text-[10px] md:text-xs mt-2 text-center max-w-[60px] md:max-w-[80px] line-clamp-2 text-gray-600">
                    {step}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-1 md:mx-2 transition-all duration-200 -mt-6 ${
                      index < currentStep ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <Card className="w-full  shadow-none py-0  border-0 sm:border border-gray-50">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-pink-100 px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-xl sm:text-2xl text-pink-800">
              {steps[currentStep]}
            </CardTitle>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              ধাপ {currentStep + 1} / {steps.length}
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-4 sm:py-6">
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mt-4 sm:mt-6">
          <Button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            variant="outline"
            className="w-full sm:w-auto flex items-center justify-center gap-2 h-11 sm:h-10"
          >
            <ChevronLeft className="w-4 h-4" />
            পূর্ববর্তী
          </Button>

          {currentStep === steps.length - 1 ? (
            <Button
              onClick={handleSubmit}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white h-11 sm:h-10"
              disabled={isPending}
            >
              সম্পন্ন করুন
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="w-full sm:w-auto bg-pink-600 hover:bg-pink-700 text-white flex items-center justify-center gap-2 h-11 sm:h-10"
            >
              পরবর্তী
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
