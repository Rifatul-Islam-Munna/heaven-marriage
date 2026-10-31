"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Phone, Loader2 } from "lucide-react";
import { User } from "@/@types/user";
import { PostRequestAxios } from "@/api-hooks/api-hooks";
import { GetRequestNormal } from "@/api-hooks/api-hooks";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import {
  countries,
  economicStatusOptions,
  educationMediumOptions,
  fiqhOptions,
  marriedStatus,
  polygamyConsentOptions,
  professionOptions,
  religiousEducationOptions,
  skinColorOptions,
} from "@/staticData/all-data";
import { districts } from "@/staticData/districts";
import { upazilas } from "@/staticData/upazilas";
import { useUser } from "@/lib/useUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestNumber } from "@/actions/auth";
import { toast } from "sonner";
import Image from "next/image";
import { ShareButton } from "./ShareButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { leadEvent, viewContentEvent } from "@/lib/google-tag-manager";
import { useEffect, useState } from "react";
import { QuestionPublicContext,useQuestionPublicConfig,PublicProfileDataContext,usePublicProfileData } from "@/lib/QuestionPublicContext";
import { defaultQuestions,questionUsesSeparateStorage } from "@/lib/profile-questions";
import PublicAdditionalAnswers, {PublicExtraRows} from "./PublicAdditionalAnswers";

interface ProfileViewProps {
  id: string;
}

const InfoRow = ({
  label,
  value,
  bgWhite = false,
  fieldPath,
}: {
  fieldPath?: string;
  label: string;
  value: string | number | boolean | undefined;
  bgWhite?: boolean;
}) => {
  const schema=useQuestionPublicConfig();
  const data=usePublicProfileData();
  const config=schema.questions.find(q=>q.path===fieldPath);
  const original=defaultQuestions.questions.find(q=>q.path===fieldPath);
  if(config&&(!config.enabled||!config.showPublic||
    questionUsesSeparateStorage(config)||
    (original&&original.section!==config.section)))return null;
  const displayLabel=config?.publicLabel||label;
  if (value === undefined || value === null || value === "") return null;

  const raw=fieldPath?.split('.').reduce<any>((part,key)=>part?.[key],data);
  const option=config&&['select','dropdown'].includes(config.type)
    ? config.options.find(o=>o.value===String(raw)) : undefined;
  const displayValue=option?.label||
    (typeof value === "boolean" ? (value ? "হ্যাঁ" : "না") : value);

  return (
    <tr className={bgWhite ? "bg-white" : ""}>
      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
        {displayLabel}
      </td>
      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900 font-medium">
        {displayValue}
      </td>
    </tr>
  );
};

export default function ProfileView({ id }: ProfileViewProps) {
  const queryClient = useQueryClient();
  const [isCheckingNumberAccess, setIsCheckingNumberAccess] = useState(false);
  const { data: userData, isLoading, refetch } = useQueryWrapper<User>(
    ["get-user", id],
    `/user/get-one-user?id=${id}`,
    { enabled: !!id, staleTime: 0 },
    0,
    "bio-data-info",
  );
  // Always render the exact question revision the backend used to filter this
  // public profile. Do not rely on a stale 20-minute browser schema cache.
  const questionSchema=userData?.publicQuestionSchema||defaultQuestions;
  const showField=(key:string)=>{
    const q=questionSchema.questions.find(q=>q.path===key);
    const original=defaultQuestions.questions.find(row=>row.path===key);
    return !q||(q.enabled&&q.showPublic&&!questionUsesSeparateStorage(q)&&
      (!original||original.section===q.section));
  };
  const publicFieldLabel=(key:string,fallback:string)=>
    questionSchema.questions.find(q=>q.path===key)?.publicLabel||fallback;
  const publicOptionLabel=(key:string,value:unknown,fallback:string|undefined)=>
    questionSchema.questions.find(q=>q.path===key)?.options.find(
      option=>option.value===String(value))?.label||fallback;

  useEffect(() => {
    if (userData) {
      viewContentEvent({
        biodata_id: userData._id,
        biodata_number: userData.userId,
        gender: userData.gender,
        age: userData.age,
        district: userData.address?.district,
        education: userData.educationInfo?.highestEducation,
        profession: userData.occupational?.profession,
      }, String(userData._id));
    }
  }, [userData]);
  const router = useRouter();

  const { mutate, isPending } = useCommonMutationApi({
    method: "POST",
    url: "/user/add-to-shortlist",
    mutationKey: ["add-to-shortlist"],
    successMessage: "Added to shortlist",
    onSuccess: (data)=>{if(data.created)leadEvent(String(id),"interest");},
  });

  const { mutateAsync: RequestPhoneNumber, isPending: isLoadingNumber } =
    useMutation({
      mutationKey: ["request-number"],
      mutationFn: (payload: { userId: string; requestUserId: string }) =>
        requestNumber(payload),
      onSuccess: (data) => {
        if (data?.data) {
          toast.success("Successfully requested for number");
          return;
        }
        toast.error(data?.error?.message);
      },
    });
  const { user } = useUser();
  useEffect(()=>{if(user?._id&&userData?._id)void PostRequestAxios("/platform/visit/"+userData._id,{});},[user?._id,userData?._id]);
  const isRequestingNumber = isLoadingNumber || isCheckingNumberAccess;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="text-center py-20">
          <p className="text-gray-600">Profile not found</p>
        </div>
      </div>
    );
  }
  // Gender may itself be private, so infer which existing marriage table has
  // public answers without re-exposing the gender account field.
  const hasAnswers=(data:Record<string,unknown>|undefined)=>
    Object.values(data||{}).some(value=>value!==undefined&&value!==null&&value!=='');
  const hasExtraFor=(gender:'female'|'male'|'both')=>
    questionSchema.questions.some(q=>q.section===6&&q.gender===gender&&q.enabled&&q.showPublic&&
      userData.publicAnswers?.[q.id]!==undefined);
  const showWomenMarriageSection=userData.gender==='female'||
    hasAnswers(userData.marriageInformationWomen as Record<string,unknown>|undefined)||hasExtraFor('female');
  const showMenMarriageSection=userData.gender==='male'||
    hasAnswers(userData.marriageInformationMan as Record<string,unknown>|undefined)||hasExtraFor('male');
  const showGeneralMarriageSection=!showWomenMarriageSection&&!showMenMarriageSection&&hasExtraFor('both');

  const formatHeightToBangla = (height: string | number): string => {
    const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

    const heightStr = String(height);
    const [feet, inches] = heightStr.split(".");

    const banglaFeet = feet
      .split("")
      .map((d) => banglaDigits[parseInt(d)])
      .join("");
    const banglaInches = inches
      ? inches
          .split("")
          .map((d) => banglaDigits[parseInt(d)])
          .join("")
      : "০";

    return `${banglaFeet}' ${banglaInches}"`;
  };

  const handelRequestForNumber = async () => {
    if (!user?._id) {
      router.push("/login");
      return;
    }

    if (!userData._id) {
      toast.error("Profile not found");
      return;
    }

    setIsCheckingNumberAccess(true);

    try {
      const currentUser = await queryClient.fetchQuery({
        queryKey: ["number-request-user-profile", user._id],
        queryFn: () =>
          GetRequestNormal<User>(
            "/user/get-my-profile",
            0,
            "number-request-user-profile",
          ),
        staleTime: 0,
      });

      if (!userData.identityUnlocked && (currentUser?.numberOfConnections ?? 0) <= 0) {
        router.push("/#pricing");
        return;
      }

      const result = await RequestPhoneNumber({
        userId: currentUser._id ?? user._id,
        requestUserId: userData._id,
      });

      if (result?.data) {
        await refetch();
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["number-request-user-profile"],
            exact: false,
          }),
          queryClient.invalidateQueries({
            queryKey: ["get-my-profile"],
            exact: false,
          }),
          queryClient.invalidateQueries({
            queryKey: ["get-my-profile-for-success"],
            exact: false,
          }),
        ]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setIsCheckingNumberAccess(false);
    }
  };

  return (
    <QuestionPublicContext.Provider value={questionSchema}>
    <PublicProfileDataContext.Provider value={userData}>
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Main Grid Layout */}
        <div className="grid lg:grid-cols-[350px_1fr] gap-6">
          {/* Left Side - Pink Card */}
          <div className="lg:sticky lg:top-8 h-fit">
            <Card className=" bg-pink-500 text-white ">
              <CardContent className="p-8">
                {/* Avatar */}
                <div className="flex justify-center mb-6">
                  <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    {showField("gender") && userData?.gender ? (
                      <Image
                        src={userData.gender === "male" ? "/male.png" : "/female.png"}
                        width={80}
                        height={80}
                        className="object-contain"
                        alt="Profile illustration"
                      />
                    ) : <Heart className="h-14 w-14 text-white" aria-hidden="true"/>}
                  </div>
                </div>
                {showField("name") && <h2 className="text-2xl text-center font-bold mb-2">
                  {publicFieldLabel("name","নাম")} : <span className={userData.identityUnlocked?"":"blur-sm select-none"}>{userData?.name || "পরিচয় সংরক্ষিত"}</span>
                </h2>}

                {/* Biodata Number */}
                <div className="text-center mb-8">
                  <h2 className="text-xl text-gray-100 font-bold mb-2">
                    বায়োডাটা নং : {showField("gender")&&userData.gender
                      ? (userData.gender === "male" ? "NG-" : "NB-")
                      : ""}{userData?.userId}
                  </h2>
                  {showField('gender')&&<Badge className="bg-white/20 text-white hover:bg-white/30 border-0">
                    {publicFieldLabel("gender","লিঙ্গ")} : {userData?.gender === "male" ? "পুরুষ" : "মহিলা"}
                  </Badge>}
                </div>

                {/* Quick Info Table */}
                <div className="space-y-1 text-sm">
                  {showField("maritalStatus") && (<div className="flex justify-between py-2 border-b border-white/20">
                    <span className="text-white/80">{publicFieldLabel("maritalStatus","বৈবাহিক অবস্থা")}</span>
                    <span className="font-semibold">
                      {publicOptionLabel("maritalStatus",userData?.maritalStatus,
                        marriedStatus.find((item)=>item.en===userData?.maritalStatus)?.bn||
                        userData?.maritalStatus)}
                    </span>
                  </div>)}

                  {showField("age") && (<div className="flex justify-between py-2 border-b border-white/20">
                    <span className="text-white/80">জন্মসন</span>
                    <span className="font-semibold">
                      {userData?.age
                        ? new Date().getFullYear() - userData.age
                        : "তথ্য নেই"}
                    </span>
                  </div>)}

                  {showField("age") && (<div className="flex justify-between py-2 border-b border-white/20">
                    <span className="text-white/80">{publicFieldLabel("age","বয়স")}</span>
                    <span className="font-semibold">
                      {userData?.age
                        ? `${userData?.age?.toLocaleString("bn-BD")} বছর`
                        : "তথ্য নেই"}
                    </span>
                  </div>)}

                  {showField("personalInformation.height") && (<div className="flex justify-between py-2 border-b border-white/20">
                    <span className="text-white/80">{publicFieldLabel("personalInformation.height","উচ্চতা")}</span>
                    <span className="font-semibold">
                      {userData?.personalInformation?.height
                        ? `${formatHeightToBangla(userData.personalInformation.height)} `
                        : "তথ্য নেই"}
                    </span>
                  </div>)}

                  {showField("personalInformation.skinTone") && (<div className="flex justify-between py-2 border-b border-white/20">
                    <span className="text-white/80">{publicFieldLabel("personalInformation.skinTone","গাত্রবর্ণ")}</span>
                    <span className="font-semibold">
                      {publicOptionLabel("personalInformation.skinTone",
                        userData?.personalInformation?.skinTone,userData?.personalInformation?.skinTone)}
                    </span>
                  </div>)}

                  {showField("bloodGroup") && (<div className="flex justify-between py-2 border-b border-white/20">
                    <span className="text-white/80">{publicFieldLabel("bloodGroup","রক্তের গ্রুপ")}</span>
                    <span className="font-semibold">
                      {userData?.bloodGroup || "তথ্য নেই"}
                    </span>
                  </div>)}

                  {showField("weight") && (<div className="flex justify-between py-2 border-b border-white/20">
                    <span className="text-white/80">{publicFieldLabel("weight","ওজন")}</span>
                    <span className="font-semibold">
                      {userData?.weight
                        ? `${userData.weight?.toLocaleString("bn-BD")} কেজি`
                        : "তথ্য নেই"}
                    </span>
                  </div>)}

                  {showField("nationality") && (<div className="flex justify-between py-2">
                    <span className="text-white/80">{publicFieldLabel("nationality","জাতীয়তা")}</span>
                    <span className="font-semibold">
                      {publicOptionLabel("nationality",userData?.nationality,
                        countries.find((item)=>item.en.trim()===userData?.nationality)?.bn||
                        userData?.nationality)}
                    </span>
                  </div>)}
                </div>

                {/* Action Buttons */}
                <div className="mt-8 space-y-3">
                  <Button
                    onClick={() => mutate({ shortlistedUserId: id })}
                    className="w-full bg-white text-pink-700 hover:bg-gray-100"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Heart className="w-4 h-4 mr-2" />
                    )}
                    পছন্দের তালিকায় যুক্ত করুন
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        disabled={isRequestingNumber}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isRequestingNumber ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Phone className="w-4 h-4 mr-2" />
                        )}
                        {userData.identityUnlocked?"পরিচয় ও যোগাযোগ দেখুন":"পরিচয় ও যোগাযোগ আনলক করুন"}
                      </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          কানেকশন ব্যবহার করুন
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base space-y-2">
                          <p>
                            এই বায়োডাটার পরিচয় ও যোগাযোগ দেখতে আপনার{" "}
                            <span className="font-bold text-green-600">
                              ১টি কানেকশন
                            </span>{" "}
                            খরচ হবে।
                          </p>
                          <p className="text-sm text-muted-foreground">
                            আপনি কি এগিয়ে যেতে চান?
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <AlertDialogFooter>
                        <AlertDialogCancel>না, বাতিল করুন</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handelRequestForNumber}
                          disabled={isRequestingNumber}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          হ্যাঁ, নিশ্চিত করুন
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <ShareButton />
                  <Button variant="outline" className="w-full" onClick={async()=>{if(!user?._id){router.push("/login");return;}const message=window.prompt("রিপোর্টের কারণ লিখুন");if(!message)return;const [data,error]=await PostRequestAxios("/platform/request/report",{targetId:userData._id,message});if(data)toast.success("Report submitted");else toast.error(error?.message||"Unable to report");}}>প্রোফাইল রিপোর্ট করুন</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Information Tables */}
          <div className="space-y-6">
            <Card className="shadow-none"><CardContent className="p-6"><h2 className="text-xl font-bold text-pink-700 mb-4">পরিচয় ও যোগাযোগ</h2><table className="w-full"><tbody><InfoRow fieldPath="fatherName" label="পিতার নাম" value={userData.fatherName || "কানেকশনের পরে দেখা যাবে"}/><InfoRow fieldPath="motherName" label="মাতার নাম" value={userData.motherName || "কানেকশনের পরে দেখা যাবে"}/><InfoRow label="মোবাইল" value={userData.phoneNumber}/><InfoRow fieldPath="whatsapp" label="WhatsApp" value={userData.whatsapp}/><InfoRow fieldPath="guardianPhone" label="অভিভাবকের নম্বর" value={userData.guardianPhone}/><PublicExtraRows user={userData} schema={questionSchema} section={0}/>
                      </tbody></table><div className="mt-3 flex gap-2"><Badge>{userData.isSubscriber?"Premium":"General"}</Badge>{userData.isVerified&&<Badge>Verified</Badge>}</div></CardContent></Card>
            {/* ঠিকানা */}
            <Card className=" shadow-none">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-pink-700 mb-4 pb-3 border-b-2 border-pink-200">
                  ঠিকানা
                </h2>
                <table className="w-full border-collapse">
                  <tbody>
                    <InfoRow fieldPath="address.permanentAddress"
                      label="স্থায়ী ঠিকানা"
                      value={
                        userData?.address?.permanentAddress ||
                        `${
                          upazilas?.find(
                            (t) => t.name === userData?.address?.upazila,
                          )?.bn_name ||
                          userData?.address?.upazila ||
                          ""
                        }, ${
                          districts?.find(
                            (t) => t.name === userData?.address?.district,
                          )?.bn_name ||
                          userData?.address?.district ||
                          ""
                        }, বাংলাদেশ`
                      }
                      bgWhite
                    />
                    <InfoRow fieldPath="address.presentAddress"
                      label="বর্তমান ঠিকানা"
                      value={
                        userData?.address?.presentAddress ||
                        `${
                          upazilas?.find(
                            (t) => t.name === userData?.address?.upazila,
                          )?.bn_name ||
                          userData?.address?.upazila ||
                          ""
                        }, ${
                          districts?.find(
                            (t) => t.name === userData?.address?.district,
                          )?.bn_name ||
                          userData?.address?.district ||
                          ""
                        }, বাংলাদেশ`
                      }
                    />
                    <InfoRow fieldPath="address.district"
                      label="জেলা"
                      value={
                        districts?.find(
                          (t) => t.name === userData?.address?.district,
                        )?.bn_name || userData?.address?.district
                      }
                      bgWhite
                    />
                    <InfoRow fieldPath="address.upazila"
                      label="উপজেলা"
                      value={
                        upazilas?.find(
                          (t) => t.name === userData?.address?.upazila,
                        )?.bn_name || userData?.address?.upazila
                      }
                    />
                    <InfoRow fieldPath="address.extraInfo"
                      label="কোথায় বড় হয়েছেন?"
                      value={userData?.address?.extraInfo}
                      bgWhite
                    />
                  <PublicExtraRows user={userData} schema={questionSchema} section={1}/>
                      </tbody>
                </table>
              </CardContent>
            </Card>

            {/* শিক্ষাগত যোগ্যতা */}
            <Card className="shadow-none">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-pink-700 mb-4 pb-3 border-b-2 border-pink-200">
                  শিক্ষাগত যোগ্যতা
                </h2>
                <table className="w-full border-collapse">
                  <tbody>
                    <InfoRow fieldPath="educationInfo.educationMethod"
                      label="আপনার শিক্ষা মাধ্যম"
                      value={
                        educationMediumOptions?.find(
                          (t) =>
                            t.value ===
                            userData?.educationInfo?.educationMethod,
                        )?.label
                      }
                      bgWhite
                    />
                    <InfoRow fieldPath="educationInfo.highestEducation"
                      label="সর্বোচ্চ শিক্ষাগত যোগ্যতা"
                      value={userData?.educationInfo?.highestEducation}
                    />
                    <InfoRow fieldPath="educationInfo.educationBackground"
                      label="শিক্ষাগত পটভূমি"
                      value={userData?.educationInfo?.educationBackground}
                      bgWhite
                    />
                    <InfoRow fieldPath="educationInfo.highestEducationBoard"
                      label="বিভাগ"
                      value={userData?.educationInfo?.highestEducationBoard}
                    />
                    <InfoRow fieldPath="educationInfo.highestEducationGroup"
                      label="বিষয়/বিভাগ"
                      value={userData?.educationInfo?.highestEducationGroup}
                      bgWhite
                    />
                    <InfoRow fieldPath="educationInfo.highestEducationPassingYear"
                      label="পাসের সন"
                      value={
                        userData?.educationInfo?.highestEducationPassingYear
                      }
                    />
                    <InfoRow fieldPath="educationInfo.currentlyDoingHightEducation"
                      label="বর্তমান শিক্ষা"
                      value={
                        userData?.educationInfo?.currentlyDoingHightEducation
                      }
                      bgWhite
                    />
                    <InfoRow fieldPath="educationInfo.sSCPassingYear"
                      label="এস.এস.সি / দাখিল / সমমান পাসের সন"
                      value={userData?.educationInfo?.sSCPassingYear}
                    />
                    <InfoRow fieldPath="educationInfo.sSCPassingGroup"
                      label="এস.এস.সি বিভাগ"
                      value={userData?.educationInfo?.sSCPassingGroup}
                      bgWhite
                    />
                    <InfoRow fieldPath="educationInfo.sSCResult"
                      label="এস.এস.সি ফলাফল"
                      value={userData?.educationInfo?.sSCResult}
                    />
                    <InfoRow fieldPath="educationInfo.hSCPassingYear"
                      label="এইচ.এস.সি / আলিম / সমমান পাসের সন"
                      value={userData?.educationInfo?.hSCPassingYear}
                      bgWhite
                    />
                    <InfoRow fieldPath="educationInfo.hSCPassingGroup"
                      label="এইচ.এস.সি বিভাগ"
                      value={userData?.educationInfo?.hSCPassingGroup}
                    />
                    <InfoRow fieldPath="educationInfo.hSCResult"
                      label="এইচ.এস.সি ফলাফল"
                      value={userData?.educationInfo?.hSCResult}
                      bgWhite
                    />
                  <PublicExtraRows user={userData} schema={questionSchema} section={2}/>
                      </tbody>
                </table>
              </CardContent>
            </Card>

            {/* পারিবারিক তথ্য */}
            <Card className="shadow-none">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-pink-700 mb-4 pb-3 border-b-2 border-pink-200">
                  পারিবারিক তথ্য
                </h2>
                <table className="w-full border-collapse">
                  <tbody>
                    <InfoRow fieldPath="familyInfo.isFatherAlive"
                      label="আপনার পিতা কি জীবিত?"
                      value={userData?.familyInfo?.isFatherAlive ? "জী" : "মৃত"}
                      bgWhite
                    />
                    <InfoRow fieldPath="familyInfo.fathersProfession"
                      label="পিতার পেশার বিবরণ"
                      value={userData?.familyInfo?.fathersProfession}
                    />
                    <InfoRow fieldPath="familyInfo.isMotherAlive"
                      label="আপনার মাতা কি জীবিত ?"
                      value={userData?.familyInfo?.isMotherAlive ? "জী" : "মৃত"}
                      bgWhite
                    />
                    <InfoRow fieldPath="familyInfo.mothersProfession"
                      label="মাতার পেশার বিবরণ"
                      value={userData?.familyInfo?.mothersProfession}
                    />
                    <InfoRow fieldPath="familyInfo.brotherCount"
                      label="ভাই কতগুলি ?"
                      value={userData?.familyInfo?.brotherCount}
                      bgWhite
                    />
                    <InfoRow fieldPath="familyInfo.brotherInformation"
                      label="ভাইদের তথ্য "
                      value={userData?.familyInfo?.brotherInformation}
                    />
                    <InfoRow fieldPath="familyInfo.sisterCount"
                      label="বোন কতগুলি"
                      value={userData?.familyInfo?.sisterCount}
                      bgWhite
                    />
                    <InfoRow fieldPath="familyInfo.sisterInformation"
                      label="বোনদের তথ্য"
                      value={userData?.familyInfo?.sisterInformation}
                    />
                    <InfoRow fieldPath="familyInfo.familyFinancial"
                      label="পারিবারিক অর্থনৈতিক অবস্থা"
                      value={
                        economicStatusOptions?.find(
                          (t) =>
                            t.value === userData?.familyInfo?.familyFinancial,
                        )?.label
                      }
                      bgWhite
                    />
                    <InfoRow fieldPath="familyInfo.familyAssetDetails"
                      label="পারিবারিক সম্পদের বিবরণ"
                      value={userData?.familyInfo?.familyAssetDetails}
                    />
                    <InfoRow fieldPath="familyInfo.familyReligiousCondition"
                      label="পারিবারিক দ্বীনি পরিবেশ কেমন?"
                      value={userData?.familyInfo?.familyReligiousCondition}
                      bgWhite
                    />
                  <PublicExtraRows user={userData} schema={questionSchema} section={4}/>
                      </tbody>
                </table>
              </CardContent>
            </Card>

            {/* ব্যক্তিগত তথ্য */}
            <Card className="shadow-none">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-pink-700 mb-4 pb-3 border-b-2 border-pink-200">
                  ব্যক্তিগত তথ্য
                </h2>
                <table className="w-full border-collapse">
                  <tbody>
                    <InfoRow fieldPath="personalInformation.skinTone"
                      label="গাত্রবর্ণ"
                      value={
                        skinColorOptions?.find(
                          (t) =>
                            t.value === userData?.personalInformation?.skinTone,
                        )?.label
                      }
                      bgWhite
                    />
                    <InfoRow fieldPath="personalInformation.prayerFiverTimeFrom"
                      label="প্রতিদিন পাঁচ ওয়াক্ত নামাজ পড়েন কি?"
                      value={userData?.personalInformation?.prayerFiverTimeFrom}
                    />
                    <InfoRow fieldPath="personalInformation.reciteQuran"
                      label="কুরআন তিলওয়াত করতে পারেন?"
                      value={userData?.personalInformation?.reciteQuran}
                      bgWhite
                    />
                    <InfoRow fieldPath="personalInformation.fiqhFollow"
                      label="কোন ফিকহ অনুসরণ করেন?"
                      value={
                        fiqhOptions?.find(
                          (t) =>
                            t.value ===
                            userData?.personalInformation?.fiqhFollow,
                        )?.label
                      }
                    />
                    <InfoRow fieldPath="personalInformation.islamicStudy"
                      label="দ্বীনের শিক্ষা"
                      value={
                        religiousEducationOptions?.find(
                          (t) =>
                            t.value ===
                            userData?.personalInformation?.islamicStudy,
                        )?.label
                      }
                      bgWhite
                    />
                    <InfoRow fieldPath="personalInformation.outsideClothes"
                      label="ঘরের বাহিরে সাধারণত কি ধরণের পোশাক পরেন?"
                      value={userData?.personalInformation?.outsideClothes}
                    />
                    {userData?.gender === "female" && (
                      <InfoRow fieldPath="personalInformation.womenNiqbYear"
                        label="কবে থেকে নিকাব সহ পর্দা করছেন?"
                        value={userData?.personalInformation?.womenNiqbYear}
                        bgWhite
                      />
                    )}
                    {userData?.gender === "male" && (
                      <>
                        <InfoRow fieldPath="personalInformation.manBeard"
                          label="সুন্নতি দাড়ি আছে কি না? কবে থেকে রেখেছেন?"
                          value={userData?.personalInformation?.manBeard}
                          bgWhite
                        />
                        <InfoRow fieldPath="personalInformation.manClothAboveAnkels"
                          label="টাখনুর উপরে কাপড় পরেন?"
                          value={
                            userData?.personalInformation?.manClothAboveAnkels
                          }
                        />
                      </>
                    )}
                    <InfoRow fieldPath="personalInformation.maharaNonMahram"
                      label="মাহরাম/নন-মাহরাম মেনে চলেন কি?"
                      value={userData?.personalInformation?.maharaNonMahram}
                      bgWhite
                    />
                    <InfoRow fieldPath="personalInformation.MissPrayerTime"
                      label="সাধারণত সপ্তাহে কত ওয়াক্ত নামায আপনার কাযা হয়?"
                      value={userData?.personalInformation?.MissPrayerTime}
                    />
                    <InfoRow fieldPath="personalInformation.physicalStructure"
                      label="শারীরিক কাঠামো"
                      value={userData?.personalInformation?.physicalStructure}
                      bgWhite
                    />
                    <InfoRow fieldPath="personalInformation.digitalMedia"
                      label="নাটক / সিনেমা / সিরিয়াল / গান এসব দেখেন বা শুনেন?"
                      value={userData?.personalInformation?.digitalMedia}
                    />
                    <InfoRow fieldPath="personalInformation.mentalOrPhysicalIssue"
                      label="দ্বীনের কোন বিশেষ মেহনতে যুক্ত আছেন?"
                      value={
                        userData?.personalInformation?.mentalOrPhysicalIssue
                      }
                      bgWhite
                    />
                    <InfoRow fieldPath="personalInformation.extraInfoHobby"
                      label="নিজের শখ, পছন্দ-অপছন্দ ইত্যাদি বিষয়ে লিখুন"
                      value={userData?.personalInformation?.extraInfoHobby}
                    />
                    <InfoRow fieldPath="personalInformation.islamicScholarsName"
                      label="আপনার পছন্দের  আলেমের নাম লিখুন"
                      value={userData?.personalInformation?.islamicScholarsName}
                      bgWhite
                    />
                    <InfoRow fieldPath="personalInformation.islamicBookName"
                      label="আপনার পড়া  ইসলামি বই এর নাম লিখুন"
                      value={userData?.personalInformation?.islamicBookName}
                    />
                    <InfoRow fieldPath="personalInformation.specialWorkOfDeen"
                      label="দ্বীনের কোন বিশেষ মেহনতে যুক্ত আছেন?"
                      value={userData?.personalInformation?.specialWorkOfDeen}
                      bgWhite
                    />
                    <InfoRow fieldPath="personalInformation.majarBeliveStatus"
                      label="মাজার সম্পর্কে আপনার ধারণা  কি?"
                      value={userData?.personalInformation?.majarBeliveStatus}
                    />
                  <PublicExtraRows user={userData} schema={questionSchema} section={3}/>
                      </tbody>
                </table>
              </CardContent>
            </Card>

            {/* পেশাগত তথ্য */}
            <Card className="shadow-none">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-pink-700 mb-4 pb-3 border-b-2 border-pink-200">
                  পেশাগত তথ্য
                </h2>
                <table className="w-full border-collapse">
                  <tbody>
                    <InfoRow fieldPath="occupational.profession"
                      label="পেশা"
                      value={
                        professionOptions?.find(
                          (t) => t.value === userData?.occupational?.profession,
                        )?.label
                      }
                      bgWhite
                    />
                    <InfoRow fieldPath="occupational.workingDetails"
                      label="পেশার বিস্তারিত বিবরণ"
                      value={userData?.occupational?.workingDetails}
                    />
                    <InfoRow fieldPath="occupational.salary"
                      label="মাসিক আয়"
                      value={userData?.occupational?.salary}
                      bgWhite
                    />
                  <PublicExtraRows user={userData} schema={questionSchema} section={5}/>
                      </tbody>
                </table>
              </CardContent>
            </Card>

            {/* বিবাহ সম্পর্কিত তথ্য - Female */}
            {showWomenMarriageSection && (
              <Card className="shadow-none">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-pink-700 mb-4 pb-3 border-b-2 border-pink-200">
                    বিবাহ সম্পর্কিত তথ্য
                  </h2>
                  <table className="w-full border-collapse">
                    <tbody>
                      <InfoRow fieldPath="marriageInformationWomen.isGuardiansAgreed"
                        label="অভিভাবক আপনার বিয়েতে রাজি কি না?"
                        value={
                          userData?.marriageInformationWomen?.isGuardiansAgreed
                        }
                        bgWhite
                      />
                      <InfoRow fieldPath="marriageInformationWomen.jobAfterMarriage"
                        label="আপনি কি বিয়ের পর চাকরি করতে ইচ্ছুক?"
                        value={
                          userData?.marriageInformationWomen?.jobAfterMarriage
                        }
                      />
                      <InfoRow fieldPath="marriageInformationWomen.studyAfterMarriage"
                        label="বিয়ের পর পড়াশোনা চালিয়ে যেতে চান?"
                        value={
                          userData?.marriageInformationWomen?.studyAfterMarriage
                        }
                        bgWhite
                      />
                      <InfoRow fieldPath="marriageInformationWomen.thoughtsOnMarriage"
                        label="বিয়ে সম্পর্কে আপনার ধারণা কি?"
                        value={
                          userData?.marriageInformationWomen?.thoughtsOnMarriage
                        }
                      />
                      <InfoRow fieldPath="marriageInformationWomen.childCustody"
                        label="অন্য ঘরের সন্তানদের থাকার সিদ্ধান্ত?"
                        value={userData?.marriageInformationWomen?.childCustody}
                        bgWhite
                      />
                      <InfoRow fieldPath="marriageInformationWomen.polygamyConsentOptions"
                        label="বহুবিবাহে রাজি আছেন?(মাসনা)"
                        value={
                          polygamyConsentOptions?.find(
                            (t) =>
                              t.value ===
                              userData?.marriageInformationWomen
                                ?.polygamyConsentOptions,
                          )?.label
                        }
                      />
                      <InfoRow fieldPath="marriageInformationWomen.caringforChildren"
                        label="মা-হারা সৎ সন্তানের দায়িত্ব গ্রহণে প্রস্তুত?"
                        value={
                          userData?.marriageInformationWomen?.caringforChildren
                        }
                        bgWhite
                      />
                    <PublicExtraRows user={userData} schema={questionSchema} section={6}/>
                      </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* বিবাহ সম্পর্কিত তথ্য - Male */}
            {showMenMarriageSection && (
              <Card className="shadow-none">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-pink-700 mb-4 pb-3 border-b-2 border-pink-200">
                    বিবাহ সম্পর্কিত তথ্য
                  </h2>
                  <table className="w-full border-collapse">
                    <tbody>
                      <InfoRow fieldPath="marriageInformationMan.isGuardiansAgreed"
                        label="অভিভাবক আপনার বিয়েতে রাজি কি না?"
                        value={
                          userData?.marriageInformationMan?.isGuardiansAgreed
                        }
                        bgWhite
                      />
                      <InfoRow fieldPath="marriageInformationMan.wifeVailAfterMarriage"
                        label="বিয়ের পর স্ত্রীকে পর্দায় রাখতে পারবেন?"
                        value={
                          userData?.marriageInformationMan
                            ?.wifeVailAfterMarriage
                        }
                      />
                      <InfoRow fieldPath="marriageInformationMan.allowWifeStudyAfterMarriage"
                        label="বিয়ের পর স্ত্রীকে পড়াশোনা করতে দিতে চান?"
                        value={
                          userData?.marriageInformationMan
                            ?.allowWifeStudyAfterMarriage
                        }
                        bgWhite
                      />
                      <InfoRow fieldPath="marriageInformationMan.wifeJobAfterMarriage"
                        label="বিয়ের পর স্ত্রীকে চাকরী করতে দিতে চান?"
                        value={
                          userData?.marriageInformationMan?.wifeJobAfterMarriage
                        }
                      />
                      <InfoRow fieldPath="marriageInformationMan.livingPlaceAfterMarriage"
                        label="বিয়ের পর স্ত্রীকে কোথায় নিয়ে থাকবেন?"
                        value={
                          userData?.marriageInformationMan
                            ?.livingPlaceAfterMarriage
                        }
                        bgWhite
                      />
                      <InfoRow fieldPath="marriageInformationMan.expectedAnyGiftFromMarriage"
                        label="পাত্রীপক্ষের কাছে কোনো উপহার আশা করবেন কি না?"
                        value={
                          userData?.marriageInformationMan
                            ?.expectedAnyGiftFromMarriage
                        }
                      />
                      <InfoRow fieldPath="marriageInformationMan.thoughtsOnMarriage"
                        label="বিয়ে সম্পর্কে আপনার ধারণা কি?"
                        value={
                          userData?.marriageInformationMan?.thoughtsOnMarriage
                        }
                        bgWhite
                      />
                    <PublicExtraRows user={userData} schema={questionSchema} section={6}/>
                      </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {showGeneralMarriageSection && (
              <Card className="shadow-none"><CardContent className="p-6">
                <h2 className="text-xl font-bold text-pink-700 mb-4">বিবাহ সম্পর্কিত তথ্য</h2>
                <table className="w-full border-collapse"><tbody>
                  <PublicExtraRows user={userData} schema={questionSchema} section={6}/>
                </tbody></table>
              </CardContent></Card>
            )}
            {/* প্রত্যাশিত জীবনসঙ্গী */}
            <Card className="shadow-none">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-pink-700 mb-4 pb-3 border-b-2 border-pink-200">
                  প্রত্যাশিত জীবনসঙ্গী
                </h2>
                <table className="w-full border-collapse">
                  <tbody>
                    <InfoRow fieldPath="expectedLifePartner.age"
                      label="বয়স"
                      value={userData?.expectedLifePartner?.age}
                      bgWhite
                    />
                    <InfoRow fieldPath="expectedLifePartner.complexion"
                      label="গাত্রবর্ণ"
                      value={userData?.expectedLifePartner?.complexion}
                    />
                    <InfoRow fieldPath="expectedLifePartner.height"
                      label="উচ্চতা"
                      value={userData?.expectedLifePartner?.height ?? "N/A"}
                      bgWhite
                    />
                    <InfoRow fieldPath="expectedLifePartner.education"
                      label="শিক্ষাগত যোগ্যতা"
                      value={userData?.expectedLifePartner?.education}
                    />
                    <InfoRow fieldPath="expectedLifePartner.district"
                      label="জেলা"
                      value={userData?.expectedLifePartner?.district}
                      bgWhite
                    />
                    <InfoRow fieldPath="expectedLifePartner.upazila"
                      label="উপজেলা"
                      value={userData?.expectedLifePartner?.upazila}
                    />
                    <InfoRow fieldPath="expectedLifePartner.maritalStatus"
                      label="বৈবাহিক অবস্থা"
                      value={userData?.expectedLifePartner?.maritalStatus}
                      bgWhite
                    />
                    <InfoRow fieldPath="expectedLifePartner.profession"
                      label="পেশা"
                      value={userData?.expectedLifePartner?.profession}
                    />
                    <InfoRow fieldPath="expectedLifePartner.financialCondition"
                      label="অর্থনৈতিক অবস্থা"
                      value={userData?.expectedLifePartner?.financialCondition}
                      bgWhite
                    />
                    <InfoRow fieldPath="expectedLifePartner.expectedQuality"
                      label="জীবনসঙ্গীর যে গুণাবলী প্রত্যাশা করেন"
                      value={userData?.expectedLifePartner?.expectedQuality}
                    />
                  <PublicExtraRows user={userData} schema={questionSchema} section={7}/>
                      </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Legacy and newly added answers must BOTH pass admin visibility
                filtering. Never render raw customFields on a public profile. */}
            <PublicAdditionalAnswers user={userData} schema={questionSchema}/>
          </div>
        </div>
      </div>
    </div>
    </PublicProfileDataContext.Provider>
    </QuestionPublicContext.Provider>
  );
}
