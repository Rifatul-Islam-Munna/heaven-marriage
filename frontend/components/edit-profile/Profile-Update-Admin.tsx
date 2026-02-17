"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { useProfileStore } from "@/zustan/useProfileStore";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useEffect, useState } from "react";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { toast } from "sonner";
import { BasicInfoStep } from "../custom/updateProfile/BasicInfoStep";
import { AddressStep } from "../custom/updateProfile/AddressStep";
import { EducationStep } from "../custom/updateProfile/EducationStep";
import { PersonalInfoStep } from "../custom/updateProfile/PersonalInfoStep";
import { FamilyInfoStep } from "../custom/updateProfile/FamilyInfoStep";
import { OccupationalStep } from "../custom/updateProfile/OccupationalStep";
import { MarriageInfoStep } from "../custom/updateProfile/MarriageInfoStep";
import { ExpectedPartnerStep } from "../custom/updateProfile/ExpectedPartnerStep";
import { CustomQuestionsStep } from "../custom/updateProfile/CustomQuestionsStep";
import { PledgeStep } from "../custom/updateProfile/PledgeStep";

const steps = [
  "মৌলিক তথ্য",
  "ঠিকানা",
  "শিক্ষাগত যোগ্যতা",
  "ব্যক্তিগত তথ্য",
  "পারিবারিক তথ্য",
  "পেশাগত তথ্য",
  "বিবাহ সম্পর্কিত তথ্য",
  "প্রত্যাশিত জীবনসঙ্গী",
  "অতিরিক্ত তথ্য",
  "অঙ্গীকার",
];

export default function ProfileUpdateForm({ id }: { id: string }) {
  const currentStep = useProfileStore((state) => state.currentStep);
  const setCurrentStep = useProfileStore((state) => state.setCurrentStep);
  const getFormData = useProfileStore((state) => state.getFormData);
  const initializeForm = useProfileStore((state) => state.initializeForm);
  const router = useRouter();

  // Alert dialog states
  const [showHideAlert, setShowHideAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  console.log("current-data", getFormData());

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const { data, isLoading, refetch } = useQueryWrapper(
    ["get-my-profile", id],
    `/user/get-user-profile-admin?id=${id}`,
    {
      enabled: !!id,
    },
  );

  // Update mutation
  const { mutate, isPending } = useCommonMutationApi({
    method: "PATCH",
    url: "/user/update-user-admin",
    mutationKey: ["update-user"],
    successMessage: "User Updated",
    onSuccess: (data) => {
      return router.push("/dashboard");
    },
  });

  // Hide/Unhide mutation
  const { mutate: toggleVisibility, isPending: isTogglingVisibility } =
    useCommonMutationApi({
      method: "PATCH",
      url: "/user/update-user-admin", // Adjust to your actual endpoint
      mutationKey: ["toggle-visibility"],
      successMessage: data?.isPublishFromAdmin
        ? "প্রোফাইল লুকানো হয়েছে"
        : "প্রোফাইল প্রকাশিত হয়েছে",
      onSuccess: () => {
        refetch();
      },
    });

  // Delete mutation
  const { mutate: deleteUser, isPending: isDeleting } = useCommonMutationApi({
    method: "DELETE",
    url: "/user/delete-user-admin", // Adjust to your actual endpoint
    mutationKey: ["delete-user"],
    successMessage: "ব্যবহারকারী মুছে ফেলা হয়েছে",
    onSuccess: () => {
      router.push("/dashboard");
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
    if (
      !formData?.maritalStatus ||
      !formData?.age ||
      !formData?.personalInformation?.height ||
      !formData?.personalInformation?.skinTone ||
      !formData?.bloodGroup ||
      !formData?.weight ||
      !formData?.nationality
    ) {
      toast.error(
        "বৈবাহিক অবস্থা, বয়স, উচ্চতা, ত্বকের রং, রক্তের গ্রুপ, ওজন এবং জাতীয়তা - এই তথ্যগুলি আবশ্যক",
        { duration: 10000, style: { background: "red", color: "white" } },
      );
      return;
    }

    console.log("Submitting:", formData);
    const submitData = {
      id,
      ...formData,
    };

    mutate(submitData);
  };

  // Handle hide/unhide confirmation
  const handleToggleVisibility = () => {
    toggleVisibility({
      id,
      isPublishFromAdmin: !data?.isPublishFromAdmin ?? true,
    });
    setShowHideAlert(false);
  };

  // Handle delete confirmation
  const handleDelete = () => {
    deleteUser({ id });
    setShowDeleteAlert(false);
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
        return <CustomQuestionsStep />;
      case 9:
        return <PledgeStep />;
      default:
        return <BasicInfoStep />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 py-4 sm:py-6 lg:py-8">
      <div className="w-full container mx-auto px-3 sm:px-4 lg:px-6">
        {/* Action Buttons - Hide/Unhide and Delete */}
        <div className="flex flex-wrap gap-3 mb-4 sm:mb-6">
          <Button
            onClick={() => setShowHideAlert(true)}
            disabled={isTogglingVisibility || isLoading}
            variant="outline"
            className={`flex items-center gap-2 ${
              data?.isPublishFromAdmin
                ? "border-orange-500 text-orange-600 hover:bg-orange-50"
                : "border-green-500 text-green-600 hover:bg-green-50"
            }`}
          >
            {data?.isPublishFromAdmin ? (
              <>
                <EyeOff className="w-4 h-4" />
                লুকান
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                প্রকাশ করুন
              </>
            )}
          </Button>

          <Button
            onClick={() => setShowDeleteAlert(true)}
            disabled={isDeleting}
            variant="outline"
            className="flex items-center gap-2 border-red-500 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            মুছে ফেলুন
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="mb-6 sm:mb-8">
          {/* Mobile: Simple Progress Bar */}
          <div className="block sm:hidden mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                ধাপ {currentStep + 1} / {steps.length}
              </span>
              <span className="text-sm font-semibold text-gray-800">
                {steps[currentStep]}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-pink-600 h-2 rounded-full transition-all duration-300"
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
                    onClick={() => {
                      setCurrentStep(index);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
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
        <Card className="w-full shadow-none py-0 border-0 sm:border border-gray-50">
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

      {/* Hide/Unhide Confirmation Dialog */}
      <AlertDialog open={showHideAlert} onOpenChange={setShowHideAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {data?.isPublished
                ? "প্রোফাইল লুকাতে চান?"
                : "প্রোফাইল প্রকাশ করতে চান?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {data?.isPublished
                ? "এই প্রোফাইলটি লুকানো হলে অন্য ব্যবহারকারীরা এটি দেখতে পারবেন না।"
                : "এই প্রোফাইলটি প্রকাশিত হলে অন্য ব্যবহারকারীরা এটি দেখতে পারবেন।"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleVisibility}
              className={
                data?.isPublished
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              নিশ্চিত করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ব্যবহারকারী মুছে ফেলতে চান?</AlertDialogTitle>
            <AlertDialogDescription>
              এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না। এটি স্থায়ীভাবে এই
              ব্যবহারকারীর অ্যাকাউন্ট এবং সমস্ত ডেটা মুছে ফেলবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              মুছে ফেলুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
