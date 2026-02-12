"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Phone, Loader2 } from "lucide-react";
import { User } from "@/@types/user";
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
import { useMutation } from "@tanstack/react-query";
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

interface ProfileViewProps {
  id: string;
}

const InfoRow = ({
  label,
  value,
  bgWhite = false,
}: {
  label: string;
  value: string | number | boolean | undefined;
  bgWhite?: boolean;
}) => {
  if (value === undefined || value === null || value === "") return null;

  const displayValue =
    typeof value === "boolean" ? (value ? "হ্যাঁ" : "না") : value;

  return (
    <tr className={bgWhite ? "bg-white" : ""}>
      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
        {label}
      </td>
      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900 font-medium">
        {displayValue}
      </td>
    </tr>
  );
};

export default function ProfileView({ id }: ProfileViewProps) {
  const { data: userData, isLoading } = useQueryWrapper<User>(
    ["get-user", id],
    `/user/get-one-user?id=${id}`,
    /*  { enabled: !!id, staleTime: 2 * 60 * 60 * 1000 },
    1000,
    "bio-data-info", */
  );
  const router = useRouter();

  const { mutate, isPending } = useCommonMutationApi({
    method: "POST",
    url: "/user/add-to-shortlist",
    mutationKey: ["add-to-shortlist"],
    successMessage: "Added to shortlist",
  });

  const { mutate: RequestPhoneNumber, isPending: isLoadingNumber } =
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

  const handelRequestForNumber = () => {
    if ((user?.numberOfConnections ?? 0) <= 0) return router.push("/#pricing");
    RequestPhoneNumber({
      userId: user?._id,
      requestUserId: userData._id,
    });
  };

  return (
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
                    <Image
                      src={
                        userData?.gender === "male"
                          ? "/male.png"
                          : userData?.gender === "female"
                            ? "/female.png"
                            : "/male.png"
                      }
                      width={80}
                      height={80}
                      className="object-contain"
                      alt="gender-image"
                    />
                  </div>
                </div>

                {/* Biodata Number */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">
                    বায়োডাটা নং : {userData?.gender === "male" ? "NG" : "NB"}-
                    {userData?.userId}
                  </h2>
                  <Badge className="bg-white/20 text-white hover:bg-white/30 border-0">
                    {userData?.gender === "male" ? "পুরুষ" : "মহিলা"}
                  </Badge>
                </div>

                {/* Quick Info Table */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between py-2 border-b border-white/20">
                    <span className="text-white/80">বৈবাহিক অবস্থা</span>
                    <span className="font-semibold">
                      {marriedStatus.find(
                        (item) => item.en === userData?.maritalStatus,
                      )?.bn || userData?.maritalStatus}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-white/20">
                    <span className="text-white/80">জন্মসন</span>
                    <span className="font-semibold">
                      {userData?.age
                        ? new Date().getFullYear() - userData.age
                        : "তথ্য নেই"}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-white/20">
                    <span className="text-white/80">বয়স</span>
                    <span className="font-semibold">
                      {userData?.age
                        ? `${userData?.age?.toLocaleString("bn-BD")} বছর`
                        : "তথ্য নেই"}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-white/20">
                    <span className="text-white/80">উচ্চতা</span>
                    <span className="font-semibold">
                      {userData?.personalInformation?.height
                        ? `${formatHeightToBangla(userData.personalInformation.height)} `
                        : "তথ্য নেই"}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-white/20">
                    <span className="text-white/80">গাত্রবর্ণ</span>
                    <span className="font-semibold">
                      {skinColorOptions?.find(
                        (t) =>
                          t.value === userData?.personalInformation?.skinTone,
                      )?.label || "তথ্য নেই"}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-white/20">
                    <span className="text-white/80">রক্তের গ্রুপ</span>
                    <span className="font-semibold">
                      {userData?.bloodGroup || "তথ্য নেই"}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-white/20">
                    <span className="text-white/80">ওজন</span>
                    <span className="font-semibold">
                      {userData?.weight
                        ? `${userData.weight?.toLocaleString("bn-BD")} কেজি`
                        : "তথ্য নেই"}
                    </span>
                  </div>

                  <div className="flex justify-between py-2">
                    <span className="text-white/80">জাতীয়তা</span>
                    <span className="font-semibold">
                      {countries.find(
                        (item) => item.en.trim() === userData?.nationality,
                      )?.bn || userData?.nationality}
                    </span>
                  </div>
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
                        disabled={isLoadingNumber}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isLoadingNumber ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Phone className="w-4 h-4 mr-2" />
                        )}
                        মোবাইল নম্বর নিন
                      </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          কানেকশন ব্যবহার করুন
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base space-y-2">
                          <p>
                            এই বায়োডাটার নম্বর দেখতে আপনার{" "}
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
                          className="bg-green-600 hover:bg-green-700"
                        >
                          হ্যাঁ, নিশ্চিত করুন
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <ShareButton />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Information Tables */}
          <div className="space-y-6">
            {/* ঠিকানা */}
            <Card className=" shadow-none">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-pink-700 mb-4 pb-3 border-b-2 border-pink-200">
                  ঠিকানা
                </h2>
                <table className="w-full border-collapse">
                  <tbody>
                    <InfoRow
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
                    <InfoRow
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
                    <InfoRow
                      label="জেলা"
                      value={
                        districts?.find(
                          (t) => t.name === userData?.address?.district,
                        )?.bn_name || userData?.address?.district
                      }
                      bgWhite
                    />
                    <InfoRow
                      label="উপজেলা"
                      value={
                        upazilas?.find(
                          (t) => t.name === userData?.address?.upazila,
                        )?.bn_name || userData?.address?.upazila
                      }
                    />
                    <InfoRow
                      label="কোথায় বড় হয়েছেন?"
                      value={userData?.address?.extraInfo}
                      bgWhite
                    />
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
                    <InfoRow
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
                    <InfoRow
                      label="সর্বোচ্চ শিক্ষাগত যোগ্যতা"
                      value={userData?.educationInfo?.highestEducation}
                    />
                    <InfoRow
                      label="শিক্ষাগত পটভূমি"
                      value={userData?.educationInfo?.educationBackground}
                      bgWhite
                    />
                    <InfoRow
                      label="বিভাগ"
                      value={userData?.educationInfo?.highestEducationBoard}
                    />
                    <InfoRow
                      label="বিষয়/বিভাগ"
                      value={userData?.educationInfo?.highestEducationGroup}
                      bgWhite
                    />
                    <InfoRow
                      label="পাসের সন"
                      value={
                        userData?.educationInfo?.highestEducationPassingYear
                      }
                    />
                    <InfoRow
                      label="বর্তমান শিক্ষা"
                      value={
                        userData?.educationInfo?.currentlyDoingHightEducation
                      }
                      bgWhite
                    />
                    <InfoRow
                      label="এস.এস.সি / দাখিল / সমমান পাসের সন"
                      value={userData?.educationInfo?.sSCPassingYear}
                    />
                    <InfoRow
                      label="এস.এস.সি বিভাগ"
                      value={userData?.educationInfo?.sSCPassingGroup}
                      bgWhite
                    />
                    <InfoRow
                      label="এস.এস.সি ফলাফল"
                      value={userData?.educationInfo?.sSCResult}
                    />
                    <InfoRow
                      label="এইচ.এস.সি / আলিম / সমমান পাসের সন"
                      value={userData?.educationInfo?.hSCPassingYear}
                      bgWhite
                    />
                    <InfoRow
                      label="এইচ.এস.সি বিভাগ"
                      value={userData?.educationInfo?.hSCPassingGroup}
                    />
                    <InfoRow
                      label="এইচ.এস.সি ফলাফল"
                      value={userData?.educationInfo?.hSCResult}
                      bgWhite
                    />
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
                    <InfoRow
                      label="আপনার পিতা কি জীবিত?"
                      value={userData?.familyInfo?.isFatherAlive ? "জী" : "মৃত"}
                      bgWhite
                    />
                    <InfoRow
                      label="পিতার পেশার বিবরণ"
                      value={userData?.familyInfo?.fathersProfession}
                    />
                    <InfoRow
                      label="আপনার মাতা কি জীবিত ?"
                      value={userData?.familyInfo?.isMotherAlive ? "জী" : "মৃত"}
                      bgWhite
                    />
                    <InfoRow
                      label="মাতার পেশার বিবরণ"
                      value={userData?.familyInfo?.mothersProfession}
                    />
                    <InfoRow
                      label="ভাই কতগুলি ?"
                      value={userData?.familyInfo?.brotherCount?.toLocaleString(
                        "bn-BD",
                      )}
                      bgWhite
                    />
                    <InfoRow
                      label="ভাইদের তথ্য "
                      value={userData?.familyInfo?.brotherInformation}
                    />
                    <InfoRow
                      label="বোন কতগুলি"
                      value={userData?.familyInfo?.sisterCount?.toLocaleString(
                        "bn-BD",
                      )}
                      bgWhite
                    />
                    <InfoRow
                      label="বোনদের তথ্য"
                      value={userData?.familyInfo?.sisterInformation}
                    />
                    <InfoRow
                      label="পারিবারিক অর্থনৈতিক অবস্থা"
                      value={
                        economicStatusOptions?.find(
                          (t) =>
                            t.value === userData?.familyInfo?.familyFinancial,
                        )?.label
                      }
                      bgWhite
                    />
                    <InfoRow
                      label="পারিবারিক সম্পদের বিবরণ"
                      value={userData?.familyInfo?.familyAssetDetails}
                    />
                    <InfoRow
                      label="পারিবারিক দ্বীনি পরিবেশ কেমন?"
                      value={userData?.familyInfo?.familyReligiousCondition}
                      bgWhite
                    />
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
                    <InfoRow
                      label="গাত্রবর্ণ"
                      value={
                        skinColorOptions?.find(
                          (t) =>
                            t.value === userData?.personalInformation?.skinTone,
                        )?.label
                      }
                      bgWhite
                    />
                    <InfoRow
                      label="প্রতিদিন পাঁচ ওয়াক্ত নামাজ পড়েন কি?"
                      value={userData?.personalInformation?.prayerFiverTimeFrom}
                    />
                    <InfoRow
                      label="কুরআন তিলওয়াত করতে পারেন?"
                      value={userData?.personalInformation?.reciteQuran}
                      bgWhite
                    />
                    <InfoRow
                      label="কোন ফিকহ অনুসরণ করেন?"
                      value={
                        fiqhOptions?.find(
                          (t) =>
                            t.value ===
                            userData?.personalInformation?.fiqhFollow,
                        )?.label
                      }
                    />
                    <InfoRow
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
                    <InfoRow
                      label="ঘরের বাহিরে সাধারণত কি ধরণের পোশাক পরেন?"
                      value={userData?.personalInformation?.outsideClothes}
                    />
                    {userData?.gender === "female" && (
                      <InfoRow
                        label="কবে থেকে নিকাব সহ পর্দা করছেন?"
                        value={userData?.personalInformation?.womenNiqbYear}
                        bgWhite
                      />
                    )}
                    {userData?.gender === "male" && (
                      <>
                        <InfoRow
                          label="সুন্নতি দাড়ি আছে কি না? কবে থেকে রেখেছেন?"
                          value={userData?.personalInformation?.manBeard}
                          bgWhite
                        />
                        <InfoRow
                          label="টাখনুর উপরে কাপড় পরেন?"
                          value={
                            userData?.personalInformation?.manClothAboveAnkels
                          }
                        />
                      </>
                    )}
                    <InfoRow
                      label="মাহরাম/নন-মাহরাম মেনে চলেন কি?"
                      value={userData?.personalInformation?.maharaNonMahram}
                      bgWhite
                    />
                    <InfoRow
                      label="সাধারণত সপ্তাহে কত ওয়াক্ত নামায আপনার কাযা হয়?"
                      value={userData?.personalInformation?.MissPrayerTime}
                    />
                    <InfoRow
                      label="শারীরিক কাঠামো"
                      value={userData?.personalInformation?.physicalStructure}
                      bgWhite
                    />
                    <InfoRow
                      label="নাটক / সিনেমা / সিরিয়াল / গান এসব দেখেন বা শুনেন?"
                      value={userData?.personalInformation?.digitalMedia}
                    />
                    <InfoRow
                      label="দ্বীনের কোন বিশেষ মেহনতে যুক্ত আছেন?"
                      value={
                        userData?.personalInformation?.mentalOrPhysicalIssue
                      }
                      bgWhite
                    />
                    <InfoRow
                      label="নিজের শখ, পছন্দ-অপছন্দ ইত্যাদি বিষয়ে লিখুন"
                      value={userData?.personalInformation?.extraInfoHobby}
                    />
                    <InfoRow
                      label="আপনার পছন্দের  আলেমের নাম লিখুন"
                      value={userData?.personalInformation?.islamicScholarsName}
                      bgWhite
                    />
                    <InfoRow
                      label="আপনার পড়া  ইসলামি বই এর নাম লিখুন"
                      value={userData?.personalInformation?.islamicBookName}
                    />
                    <InfoRow
                      label="দ্বীনের কোন বিশেষ মেহনতে যুক্ত আছেন?"
                      value={userData?.personalInformation?.specialWorkOfDeen}
                      bgWhite
                    />
                    <InfoRow
                      label="মাজার সম্পর্কে আপনার ধারণা  কি?"
                      value={userData?.personalInformation?.majarBeliveStatus}
                    />
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
                    <InfoRow
                      label="পেশা"
                      value={
                        professionOptions?.find(
                          (t) => t.value === userData?.occupational?.profession,
                        )?.label
                      }
                      bgWhite
                    />
                    <InfoRow
                      label="পেশার বিস্তারিত বিবরণ"
                      value={userData?.occupational?.workingDetails}
                    />
                    <InfoRow
                      label="মাসিক আয়"
                      value={userData?.occupational?.salary}
                      bgWhite
                    />
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* বিবাহ সম্পর্কিত তথ্য - Female */}
            {userData?.gender === "female" && (
              <Card className="shadow-none">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-pink-700 mb-4 pb-3 border-b-2 border-pink-200">
                    বিবাহ সম্পর্কিত তথ্য
                  </h2>
                  <table className="w-full border-collapse">
                    <tbody>
                      <InfoRow
                        label="অভিভাবক আপনার বিয়েতে রাজি কি না?"
                        value={
                          userData?.marriageInformationWomen?.isGuardiansAgreed
                        }
                        bgWhite
                      />
                      <InfoRow
                        label="আপনি কি বিয়ের পর চাকরি করতে ইচ্ছুক?"
                        value={
                          userData?.marriageInformationWomen?.jobAfterMarriage
                        }
                      />
                      <InfoRow
                        label="বিয়ের পর পড়াশোনা চালিয়ে যেতে চান?"
                        value={
                          userData?.marriageInformationWomen?.studyAfterMarriage
                        }
                        bgWhite
                      />
                      <InfoRow
                        label="বিয়ে সম্পর্কে আপনার ধারণা কি?"
                        value={
                          userData?.marriageInformationWomen?.thoughtsOnMarriage
                        }
                      />
                      <InfoRow
                        label="অন্য ঘরের সন্তানদের থাকার সিদ্ধান্ত?"
                        value={userData?.marriageInformationWomen?.childCustody}
                        bgWhite
                      />
                      <InfoRow
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
                      <InfoRow
                        label="মা-হারা সৎ সন্তানের দায়িত্ব গ্রহণে প্রস্তুত?"
                        value={
                          userData?.marriageInformationWomen?.caringforChildren
                        }
                        bgWhite
                      />
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* বিবাহ সম্পর্কিত তথ্য - Male */}
            {userData?.gender === "male" && (
              <Card className="shadow-none">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-pink-700 mb-4 pb-3 border-b-2 border-pink-200">
                    বিবাহ সম্পর্কিত তথ্য
                  </h2>
                  <table className="w-full border-collapse">
                    <tbody>
                      <InfoRow
                        label="অভিভাবক আপনার বিয়েতে রাজি কি না?"
                        value={
                          userData?.marriageInformationMan?.isGuardiansAgreed
                        }
                        bgWhite
                      />
                      <InfoRow
                        label="বিয়ের পর স্ত্রীকে পর্দায় রাখতে পারবেন?"
                        value={
                          userData?.marriageInformationMan
                            ?.wifeVailAfterMarriage
                        }
                      />
                      <InfoRow
                        label="বিয়ের পর স্ত্রীকে পড়াশোনা করতে দিতে চান?"
                        value={
                          userData?.marriageInformationMan
                            ?.allowWifeStudyAfterMarriage
                        }
                        bgWhite
                      />
                      <InfoRow
                        label="বিয়ের পর স্ত্রীকে চাকরী করতে দিতে চান?"
                        value={
                          userData?.marriageInformationMan?.wifeJobAfterMarriage
                        }
                      />
                      <InfoRow
                        label="বিয়ের পর স্ত্রীকে কোথায় নিয়ে থাকবেন?"
                        value={
                          userData?.marriageInformationMan
                            ?.livingPlaceAfterMarriage
                        }
                        bgWhite
                      />
                      <InfoRow
                        label="পাত্রীপক্ষের কাছে কোনো উপহার আশা করবেন কি না?"
                        value={
                          userData?.marriageInformationMan
                            ?.expectedAnyGiftFromMarriage
                        }
                      />
                      <InfoRow
                        label="বিয়ে সম্পর্কে আপনার ধারণা কি?"
                        value={
                          userData?.marriageInformationMan?.thoughtsOnMarriage
                        }
                        bgWhite
                      />
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* প্রত্যাশিত জীবনসঙ্গী */}
            <Card className="shadow-none">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-pink-700 mb-4 pb-3 border-b-2 border-pink-200">
                  প্রত্যাশিত জীবনসঙ্গী
                </h2>
                <table className="w-full border-collapse">
                  <tbody>
                    <InfoRow
                      label="বয়স"
                      value={userData?.expectedLifePartner?.age}
                      bgWhite
                    />
                    <InfoRow
                      label="গাত্রবর্ণ"
                      value={userData?.expectedLifePartner?.complexion}
                    />
                    <InfoRow
                      label="উচ্চতা"
                      value={formatHeightToBangla(
                        userData?.expectedLifePartner?.height ?? 0,
                      )}
                      bgWhite
                    />
                    <InfoRow
                      label="শিক্ষাগত যোগ্যতা"
                      value={userData?.expectedLifePartner?.education}
                    />
                    <InfoRow
                      label="জেলা"
                      value={userData?.expectedLifePartner?.district}
                      bgWhite
                    />
                    <InfoRow
                      label="উপজেলা"
                      value={userData?.expectedLifePartner?.upazila}
                    />
                    <InfoRow
                      label="বৈবাহিক অবস্থা"
                      value={userData?.expectedLifePartner?.maritalStatus}
                      bgWhite
                    />
                    <InfoRow
                      label="পেশা"
                      value={userData?.expectedLifePartner?.profession}
                    />
                    <InfoRow
                      label="অর্থনৈতিক অবস্থা"
                      value={userData?.expectedLifePartner?.financialCondition}
                      bgWhite
                    />
                    <InfoRow
                      label="জীবনসঙ্গীর যে গুণাবলী প্রত্যাশা করেন"
                      value={userData?.expectedLifePartner?.expectedQuality}
                    />
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* অতিরিক্ত তথ্য */}
            {userData?.customFields &&
              Object.keys(userData.customFields).length > 0 && (
                <Card className="shadow-none">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold text-pink-700 mb-4 pb-3 border-b-2 border-pink-200">
                      অতিরিক্ত তথ্য
                    </h2>
                    <table className="w-full border-collapse">
                      <tbody>
                        {Object.entries(userData.customFields).map(
                          ([question, answer], index) => (
                            <InfoRow
                              key={index}
                              label={question}
                              value={answer}
                              bgWhite={index % 2 === 0}
                            />
                          ),
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
