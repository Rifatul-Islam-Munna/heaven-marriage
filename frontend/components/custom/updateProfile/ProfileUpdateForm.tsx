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
import { useEffect, useMemo, useRef, useState } from "react";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { useRouter } from "next/navigation";
import { CustomQuestionsStep } from "./CustomQuestionsStep";
import { toast } from "sonner";
import { PatchRequestAxios } from "@/api-hooks/api-hooks";
import { defaultQuestions, getMissingQuestions, type ProfileQuestionSchema } from "@/lib/profile-questions";
import { DynamicQuestionStep } from "./DynamicQuestionStep";
import AiBiodataAssistant from "./AiBiodataAssistant";
import { useUser } from "@/lib/useUser";

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

export default function ProfileUpdateForm() {
  const currentStep = useProfileStore((state) => state.currentStep);
  const setCurrentStep = useProfileStore((state) => state.setCurrentStep);
  const getFormData = useProfileStore((state) => state.getFormData);
  const initializeForm = useProfileStore((state) => state.initializeForm);
  const formData=useProfileStore(state=>state.formData);
  const initialized=useRef(false), saved=useRef("");
  const saveChain=useRef(Promise.resolve());
  const [saveStatus,setSaveStatus]=useState("");
  const [errors,setErrors]=useState<string[]>([]);
  const [questionSchema,setQuestionSchema]=useState<ProfileQuestionSchema>(defaultQuestions);
  useEffect(()=>{
    const controller=new AbortController();
    void fetch('/api/profile-questions',{signal:controller.signal})
      .then(r=>r.ok?r.json():Promise.reject(Error()))
      .then((next:ProfileQuestionSchema)=>{
        if(Array.isArray(next?.questions))setQuestionSchema(next);
      })
      .catch(()=>{ /* Keep the current hard-coded questions as fallback. */ });
    return ()=>controller.abort();
  },[]);
  // Completely empty sections (including the old extra-question step) disappear.
  const activeSteps=useMemo(()=>{
    const indices=steps.map((_,index)=>index).filter(index=>
      questionSchema.questions.some(q=>q.section===index&&q.enabled&&
        (q.gender==='both'||q.gender===formData.gender)));
    return indices.length?indices:[0];
  },[questionSchema,formData.gender]);
  const stepPosition=Math.max(0,activeSteps.indexOf(currentStep));
  useEffect(()=>{
    if(!activeSteps.includes(currentStep))
      setCurrentStep(activeSteps.find(index=>index>currentStep)??activeSteps[activeSteps.length-1]);
  },[activeSteps,currentStep,setCurrentStep]);

  const saveDraft=async(snapshot=useProfileStore.getState().getFormData(),step=useProfileStore.getState().currentStep)=>{
    setSaveStatus("সংরক্ষণ হচ্ছে...");
    const [data,error]=await PatchRequestAxios("/user/update-user",{...snapshot,draftStep:step});
    if(!data){setSaveStatus("সংরক্ষণ হয়নি — সংযোগ হলে আবার চেষ্টা করুন");throw new Error(error?.message||"Draft save failed");}
    saved.current=JSON.stringify(snapshot);setSaveStatus("ডেটাবেসে সংরক্ষিত");
  };
  useEffect(()=>{
    if(!initialized.current||saved.current===JSON.stringify(formData))return;
    const snapshot=formData;
    const timer=setTimeout(()=>{saveChain.current=saveChain.current.catch(()=>{}).then(()=>saveDraft(snapshot,currentStep));void saveChain.current.catch(()=>{});},1000);
    return ()=>clearTimeout(timer);
  },[formData,currentStep]);
  useEffect(()=>{const retry=()=>{void saveDraft().catch(()=>{});};window.addEventListener("online",retry);return ()=>window.removeEventListener("online",retry);},[]);
  const handleNext = async () => {
    const missing=getMissingQuestions(formData,questionSchema,currentStep);setErrors(missing);
    if(missing.length){toast.error("অনুগ্রহ করে এই ধাপের আবশ্যিক তথ্য পূরণ করুন");return;}
    const next=activeSteps[stepPosition+1];
    try{await saveChain.current.catch(()=>{});await saveDraft(undefined,next??currentStep);}catch{return;}
    if (next!==undefined) {
      setCurrentStep(next);
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
    if (data && !initialized.current) {
      initialized.current=true;
      initializeForm(data);
      saved.current=JSON.stringify(useProfileStore.getState().getFormData());
      setCurrentStep(Math.max(0,Math.min(9,(data as {draftStep?:number}).draftStep||0)));
    }
  }, [data]);

  const handlePrevious = () => {
    const previous=activeSteps[stepPosition-1];
    if(previous!==undefined) {
      setCurrentStep(previous);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    const formData = getFormData();
    // The published question schema is the source of truth for requirements.
    const missing=getMissingQuestions(formData,questionSchema);setErrors(missing);
    if(missing.length){toast.error("বাকি আবশ্যিক তথ্য পূরণ করুন");return;}
    try{await saveChain.current.catch(()=>{});await saveDraft();}catch{return;}
    mutate({...formData,submit:true,draftStep:currentStep});
  };

  const renderStep = () => <DynamicQuestionStep step={currentStep} schema={questionSchema} />;

  return (
    <div className="min-h-screen w-full bg-gray-50 py-4 sm:py-6 lg:py-8">
      <div className="w-full container mx-auto px-3 sm:px-4 lg:px-6">
        <div className=" w-full flex justify-end items-end mb-3">
          <Button
            onClick={handleSubmit}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white h-11 sm:h-10"
            disabled={isPending}
          >
            সম্পন্ন করুন
          </Button>
        </div>

        <p role="status" aria-live="polite" className="text-sm text-gray-600 mb-3">{saveStatus}</p>
        {errors.length>0&&<div role="alert" className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">আবশ্যিক তথ্য বাকি: {errors.join(", ")}</div>}
        <AiBiodataAssistant />
        {/* Progress Steps */}
        <div className="mb-6 sm:mb-8">
          {/* Mobile: Simple Progress Bar */}
          <div className="block sm:hidden mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                ধাপ {stepPosition + 1} / {activeSteps.length}
              </span>
              <span className="text-sm  font-semibold text-gray-800">
                {steps[currentStep]}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-pink-600 h-2 rounded-full  transition-all duration-300"
                style={{
                  width: `${((stepPosition + 1) / activeSteps.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Desktop: Detailed Steps */}
          <div className="hidden sm:flex items-center justify-between">
            {activeSteps.map((index,position) => (
              <div key={index} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    onClick={() => {
                      if(index>currentStep&&getMissingQuestions(formData,questionSchema,currentStep).length){setErrors(getMissingQuestions(formData,questionSchema,currentStep));toast.error("বর্তমান ধাপের আবশ্যিক তথ্য পূরণ করুন");return;}
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
                    {steps[index]}
                  </p>
                </div>
                {position < activeSteps.length - 1 && (
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
              ধাপ {stepPosition + 1} / {activeSteps.length}
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
            disabled={stepPosition === 0}
            variant="outline"
            className="w-full sm:w-auto flex items-center justify-center gap-2 h-11 sm:h-10"
          >
            <ChevronLeft className="w-4 h-4" />
            পূর্ববর্তী
          </Button>

          {stepPosition === activeSteps.length - 1 ? (
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
