"use client";
import { useUser } from "@/lib/useUser";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  User as UserIcon,
  Mail,
  Phone,
  IdCard,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  Shield,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { UserType, User as USer } from "@/@types/user";
import { useRouter } from "next/navigation";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import Image from "next/image";

export interface UserInfo {
  _id: string;
  name: string;
  userId: string;
  role: UserType;
  email: string;
  phoneNumber: string;
  password: string;
  isOtpVerified: boolean;
}

const User = () => {
  const router = useRouter();

  const { data: user, isLoading } = useQueryWrapper<USer>(
    ["get-my-profile-for-success"],
    "/user/get-my-profile",
  );

  const handleEdit = () => {
    router.push("/profile/my-profile");
  };

  const handleVisitProfile = () => {
    router.push(`/biodata/${user?._id}`);
  };

  // Calculate profile completion percentage
  const profileCompletion = useMemo(() => {
    if (!user) return 0;

    let totalFields = 0;
    let filledFields = 0;

    // Helper function to check if a field has value
    const hasValue = (field: any): boolean => {
      if (field === undefined || field === null || field === "") return false;
      if (typeof field === "number" && field === 0) return false;
      return true;
    };

    // Basic Information (8 fields)
    const basicFields = [
      user?.name,
      user?.email,
      user?.phoneNumber,
      user?.gender,
      user?.age,
      user?.bloodGroup,
      user?.weight,
      user?.nationality,
    ];
    totalFields += basicFields.length;
    filledFields += basicFields.filter(hasValue).length;

    // Address (5 fields)
    if (user?.address) {
      const addressFields = [
        user.address.presentAddress,
        user.address.permanentAddress,
        user.address.district,
        user.address.upazila,
        user.address.extraInfo,
      ];
      totalFields += addressFields.length;
      filledFields += addressFields.filter(hasValue).length;
    } else {
      totalFields += 5;
    }

    // Education Information (9 fields)
    if (user?.educationInfo) {
      const eduFields = [
        user.educationInfo.educationMethod,
        user.educationInfo.highestEducation,
        user.educationInfo.highestEducationBoard,
        user.educationInfo.highestEducationGroup,
        user.educationInfo.highestEducationPassingYear,
        user.educationInfo.sSCPassingYear,
        user.educationInfo.sSCPassingGroup,
        user.educationInfo.hSCPassingYear,
        user.educationInfo.hSCPassingGroup,
      ];
      totalFields += eduFields.length;
      filledFields += eduFields.filter(hasValue).length;
    } else {
      totalFields += 9;
    }

    // Family Information (9 fields)
    if (user?.familyInfo) {
      const familyFields = [
        user.familyInfo.fathersProfession,
        user.familyInfo.mothersProfession,
        user.familyInfo.brotherCount,
        user.familyInfo.brotherInformation,
        user.familyInfo.sisterCount,
        user.familyInfo.sisterInformation,
        user.familyInfo.familyFinancial,
        user.familyInfo.familyAssetDetails,
        user.familyInfo.familyReligiousCondition,
      ];
      totalFields += familyFields.length;
      filledFields += familyFields.filter(hasValue).length;
    } else {
      totalFields += 9;
    }

    // Personal Information (17 fields)
    if (user?.personalInformation) {
      const personalFields = [
        user.personalInformation.outsideClothes,
        user.personalInformation.womenNiqbYear,
        user.personalInformation.manBeard,
        user.personalInformation.prayerFiverTimeFrom,
        user.personalInformation.MissPrayerTime,
        user.personalInformation.maharaNonMahram,
        user.personalInformation.reciteQuran,
        user.personalInformation.fiqhFollow,
        user.personalInformation.digitalMedia,
        user.personalInformation.mentalOrPhysicalIssue,
        user.personalInformation.specialWorkOfDeen,
        user.personalInformation.majarBeliveStatus,
        user.personalInformation.islamicBookName,
        user.personalInformation.islamicScholarsName,
        user.personalInformation.extraInfoHobby,
        user.personalInformation.height,
        user.personalInformation.skinTone,
      ];
      totalFields += personalFields.length;
      filledFields += personalFields.filter(hasValue).length;
    } else {
      totalFields += 17;
    }

    // Occupational (3 fields)
    if (user?.occupational) {
      const occupationalFields = [
        user.occupational.profession,
        user.occupational.workingDetails,
        user.occupational.salary,
      ];
      totalFields += occupationalFields.length;
      filledFields += occupationalFields.filter(hasValue).length;
    } else {
      totalFields += 3;
    }

    // Marriage Information - Women (4 fields)
    if (user?.marriageInformationWomen) {
      const marriageWomenFields = [
        user.marriageInformationWomen.jobAfterMarriage,
        user.marriageInformationWomen.studyAfterMarriage,
        user.marriageInformationWomen.thoughtsOnMarriage,
      ];
      totalFields += marriageWomenFields.length;
      filledFields += marriageWomenFields.filter(hasValue).length;
    }

    // Marriage Information - Men (6 fields)
    if (user?.marriageInformationMan) {
      const marriageMenFields = [
        user.marriageInformationMan.wifeVailAfterMarriage,
        user.marriageInformationMan.allowWifeStudyAfterMarriage,
        user.marriageInformationMan.wifeJobAfterMarriage,
        user.marriageInformationMan.livingPlaceAfterMarriage,
        user.marriageInformationMan.expectedAnyGiftFromMarriage,
        user.marriageInformationMan.thoughtsOnMarriage,
      ];
      totalFields += marriageMenFields.length;
      filledFields += marriageMenFields.filter(hasValue).length;
    }

    // Expected Life Partner (10 fields)
    if (user?.expectedLifePartner) {
      const expectedPartnerFields = [
        user.expectedLifePartner.age,
        user.expectedLifePartner.complexion,
        user.expectedLifePartner.height,
        user.expectedLifePartner.education,
        user.expectedLifePartner.district,
        user.expectedLifePartner.upazila,
        user.expectedLifePartner.maritalStatus,
        user.expectedLifePartner.profession,
        user.expectedLifePartner.financialCondition,
        user.expectedLifePartner.expectedQuality,
      ];
      totalFields += expectedPartnerFields.length;
      filledFields += expectedPartnerFields.filter(hasValue).length;
    } else {
      totalFields += 10;
    }

    // Pledge (3 fields - boolean fields)
    if (user?.pledge) {
      const pledgeFields = [
        user.pledge.youGordianKnowsThis,
        user.pledge.allTheInformationTrue,
        user.pledge.anyMisInformationWeAreNotKnowing,
      ];
      totalFields += pledgeFields.length;
      filledFields += pledgeFields.filter((field) => field === true).length;
    } else {
      totalFields += 3;
    }

    const percentage = Math.round((filledFields / totalFields) * 100);
    return percentage;
  }, [user]);

  const isProfileIncomplete = profileCompletion < 100;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
            <p className="text-gray-600">তথ্য লোড হচ্ছে...</p>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Card className="border border-gray-200 bg-white">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">কোনো তথ্য পাওয়া যায়নি</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
                আপনার সম্পর্কে তথ্য
              </h1>
              <p className="text-sm text-gray-600">
                আপনার ব্যক্তিগত তথ্য এবং প্রোফাইল বিবরণ
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleEdit}
                className="bg-pink-500 hover:bg-pink-600 text-white"
              >
                <Edit className="w-4 h-4 mr-2" />
                সম্পাদনা করুন
              </Button>
              <Button
                onClick={handleVisitProfile}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                <Eye className="w-4 h-4 mr-2" />
                আমার প্রোফাইল দেখুন
              </Button>
            </div>
          </div>
        </div>

        {/* Profile Completion Alert */}
        {isProfileIncomplete && (
          <Card className="border border-orange-200 bg-orange-50 mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    প্রোফাইল সম্পূর্ণ করুন
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    আপনার প্রোফাইল মাত্র {profileCompletion}% সম্পূর্ণ। সম্পূর্ণ
                    প্রোফাইল আপনার উপযুক্ত ম্যাচ পাওয়ার সম্ভাবনা বৃদ্ধি করে।
                  </p>
                  <div className="mb-3">
                    <Progress value={profileCompletion} className="h-2" />
                  </div>
                  <Button
                    onClick={handleEdit}
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    এখনই সম্পূর্ণ করুন
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Profile Card */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader className="border-b border-gray-200 bg-gray-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                {/* Gender-based Profile Image */}
                <div className="w-12 h-12 rounded-lg overflow-hidden  flex-shrink-0">
                  {user?.gender ? (
                    <Image
                      src={
                        user.gender.toLowerCase() === "male"
                          ? "/male.png"
                          : "/female.png"
                      }
                      alt="Profile"
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-pink-100 flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-pink-600" />
                    </div>
                  )}
                </div>
                প্রোফাইল তথ্য
              </CardTitle>
              {user?.isOtpVerified !== undefined && (
                <Badge
                  variant={user?.isOtpVerified ? "default" : "destructive"}
                  className={
                    user?.isOtpVerified
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-red-500"
                  }
                >
                  {user?.isOtpVerified ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      যাচাইকৃত
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      যাচাই করা হয়নি
                    </>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Grid Layout for Profile Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      নাম
                    </p>
                    <p className="text-lg font-semibold text-gray-900 break-words">
                      {user?.name || "তথ্য নেই"}
                    </p>
                  </div>
                </div>
              </div>

              {/* User ID */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <IdCard className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      ব্যবহারকারী আইডি
                    </p>
                    <p className="text-lg font-semibold text-gray-900 break-words">
                      {user?.userId || "তথ্য নেই"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      ইমেইল
                    </p>
                    <p className="text-lg font-semibold text-gray-900 break-all">
                      {user?.email || "তথ্য নেই"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Phone Number */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      ফোন নম্বর
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {user?.phoneNumber || "তথ্য নেই"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Role */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      ভূমিকা
                    </p>
                    <Badge
                      variant="secondary"
                      className="text-base font-semibold"
                    >
                      {user?.role || "তথ্য নেই"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Connections */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <IdCard className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      কানেকশন
                    </p>
                    <p className="text-lg font-semibold text-gray-900 break-all font-mono text-sm">
                      {user?.numberOfConnections?.toLocaleString("bn-BD") ||
                        "নেই"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info Card */}
        <Card className="border border-gray-200 bg-white mt-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  প্রোফাইল সম্পূর্ণ করুন
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  আপনার প্রোফাইল সম্পূর্ণ এবং সঠিক তথ্য প্রদান করুন যাতে আরও
                  ভালো ম্যাচ পেতে পারেন। সম্পূর্ণ প্রোফাইল আপনার সাফল্যের
                  সম্ভাবনা বৃদ্ধি করে।
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default User;
