// components/UserNav.tsx
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  User,
  Settings,
  LogOut,
  Heart,
  HeartCrack,
  ShoppingBag,
  Flag,
  Trash2,
  Edit,
  LayoutDashboard,
} from "lucide-react";
import { logOutUser } from "@/actions/auth";
import { useUser } from "@/lib/useUser";
import { useRouter } from "next/navigation";
import { User as UserType, UserInfo } from "@/@types/user";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";

export function UserNav({ user }: { user: UserInfo | null }) {
  const { refetch } = useUser();
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: users, isLoading } = useQueryWrapper<UserType>(
    ["get-my-profile-for-success"],
    "/user/get-my-profile",
  );

  const profileCompletion = useMemo(() => {
    if (!users) return 0;

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
      users?.name,
      users?.email,
      users?.phoneNumber,
      users?.gender,
      users?.age,
      users?.bloodGroup,
      users?.weight,
      users?.nationality,
    ];
    totalFields += basicFields.length;
    filledFields += basicFields.filter(hasValue).length;

    // Address (5 fields)
    if (users?.address) {
      const addressFields = [
        users.address.presentAddress,
        users.address.permanentAddress,
        users.address.district,
        users.address.upazila,
        users.address.extraInfo,
      ];
      totalFields += addressFields.length;
      filledFields += addressFields.filter(hasValue).length;
    } else {
      totalFields += 5;
    }

    // Education Information (9 fields)
    if (users?.educationInfo) {
      const eduFields = [
        users.educationInfo.educationMethod,
        users.educationInfo.highestEducation,
        users.educationInfo.highestEducationBoard,
        users.educationInfo.highestEducationGroup,
        users.educationInfo.highestEducationPassingYear,
        users.educationInfo.sSCPassingYear,
        users.educationInfo.sSCPassingGroup,
        users.educationInfo.hSCPassingYear,
        users.educationInfo.hSCPassingGroup,
      ];
      totalFields += eduFields.length;
      filledFields += eduFields.filter(hasValue).length;
    } else {
      totalFields += 9;
    }

    // Family Information (9 fields)
    if (users?.familyInfo) {
      const familyFields = [
        users.familyInfo.fathersProfession,
        users.familyInfo.mothersProfession,
        users.familyInfo.brotherCount,
        users.familyInfo.brotherInformation,
        users.familyInfo.sisterCount,
        users.familyInfo.sisterInformation,
        users.familyInfo.familyFinancial,
        users.familyInfo.familyAssetDetails,
        users.familyInfo.familyReligiousCondition,
      ];
      totalFields += familyFields.length;
      filledFields += familyFields.filter(hasValue).length;
    } else {
      totalFields += 9;
    }

    // Personal Information (17 fields)
    if (users?.personalInformation) {
      const personalFields = [
        users.personalInformation.outsideClothes,
        users.personalInformation.womenNiqbYear,
        users.personalInformation.manBeard,
        users.personalInformation.prayerFiverTimeFrom,
        users.personalInformation.MissPrayerTime,
        users.personalInformation.maharaNonMahram,
        users.personalInformation.reciteQuran,
        users.personalInformation.fiqhFollow,
        users.personalInformation.digitalMedia,
        users.personalInformation.mentalOrPhysicalIssue,
        users.personalInformation.specialWorkOfDeen,
        users.personalInformation.majarBeliveStatus,
        users.personalInformation.islamicBookName,
        users.personalInformation.islamicScholarsName,
        users.personalInformation.extraInfoHobby,
        users.personalInformation.height,
        users.personalInformation.skinTone,
      ];
      totalFields += personalFields.length;
      filledFields += personalFields.filter(hasValue).length;
    } else {
      totalFields += 17;
    }

    // Occupational (3 fields)
    if (users?.occupational) {
      const occupationalFields = [
        users.occupational.profession,
        users.occupational.workingDetails,
        users.occupational.salary,
      ];
      totalFields += occupationalFields.length;
      filledFields += occupationalFields.filter(hasValue).length;
    } else {
      totalFields += 3;
    }

    // Marriage Information - Women (3 fields)
    if (users?.marriageInformationWomen) {
      const marriageWomenFields = [
        users.marriageInformationWomen.jobAfterMarriage,
        users.marriageInformationWomen.studyAfterMarriage,
        users.marriageInformationWomen.thoughtsOnMarriage,
      ];
      totalFields += marriageWomenFields.length;
      filledFields += marriageWomenFields.filter(hasValue).length;
    }

    // Marriage Information - Men (6 fields)
    if (users?.marriageInformationMan) {
      const marriageMenFields = [
        users.marriageInformationMan.wifeVailAfterMarriage,
        users.marriageInformationMan.allowWifeStudyAfterMarriage,
        users.marriageInformationMan.wifeJobAfterMarriage,
        users.marriageInformationMan.livingPlaceAfterMarriage,
        users.marriageInformationMan.expectedAnyGiftFromMarriage,
        users.marriageInformationMan.thoughtsOnMarriage,
      ];
      totalFields += marriageMenFields.length;
      filledFields += marriageMenFields.filter(hasValue).length;
    }

    // Expected Life Partner (10 fields)
    if (users?.expectedLifePartner) {
      const expectedPartnerFields = [
        users.expectedLifePartner.age,
        users.expectedLifePartner.complexion,
        users.expectedLifePartner.height,
        users.expectedLifePartner.education,
        users.expectedLifePartner.district,
        users.expectedLifePartner.upazila,
        users.expectedLifePartner.maritalStatus,
        users.expectedLifePartner.profession,
        users.expectedLifePartner.financialCondition,
        users.expectedLifePartner.expectedQuality,
      ];
      totalFields += expectedPartnerFields.length;
      filledFields += expectedPartnerFields.filter(hasValue).length;
    } else {
      totalFields += 10;
    }

    // Pledge (3 fields - boolean fields)
    if (users?.pledge) {
      const pledgeFields = [
        users.pledge.youGordianKnowsThis,
        users.pledge.allTheInformationTrue,
        users.pledge.anyMisInformationWeAreNotKnowing,
      ];
      totalFields += pledgeFields.length;
      filledFields += pledgeFields.filter((field) => field === true).length;
    } else {
      totalFields += 3;
    }

    // Calculate actual percentage
    const actualPercentage = (filledFields / totalFields) * 100;

    // Adjust so 55% actual completion shows as 100%
    const adjustedPercentage = Math.min(actualPercentage * (100 / 55), 100);

    return Math.round(adjustedPercentage);
  }, [users]);

  const hasValue = (field: any): boolean => {
    if (field === undefined || field === null || field === "") return false;
    if (typeof field === "number" && field === 0) return false;
    return true;
  };

  const hasCriticalFields = useMemo(() => {
    if (!users) return false;

    const hasAge = hasValue(users?.age);
    const hasGender = hasValue(users?.gender);
    const hasHeight = hasValue(users?.personalInformation?.height);

    return hasAge && hasGender && hasHeight;
  }, [users]);

  // Profile is incomplete if missing critical fields OR less than 65% completion
  const isProfileIncomplete = !hasCriticalFields || profileCompletion < 65;

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  const { mutate: deleteUser, isPending: isDeleting } = useCommonMutationApi({
    method: "DELETE",
    url: "/user/delete-my-account", // Adjust to your actual endpoint
    mutationKey: ["delete-user"],
    successMessage: "ব্যবহারকারী মুছে ফেলা হয়েছে",
    onSuccess: () => {
      handellogout();
    },
  });

  const handellogout = async () => {
    const res = await logOutUser();
    if (res) {
      /*    await refetch();
      router.refresh(); */
      window.location.href = "/";
    }
  };

  const handleDeleteAccount = () => {
    deleteUser({});
  };

  const isAdmin = user?.role === "admin";
  const url = isAdmin ? "/dashboard" : "/profile";
  const settings = isAdmin ? "/dashboard/settings" : "/profile/settings";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={
                  user?.gender === "male"
                    ? "/male.png"
                    : user?.gender === "female"
                      ? "/female.png"
                      : ""
                }
                alt={user?.name || "User"}
              />
              <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72" align="center" forceMount>
          {/* Profile Completion Status - Only for non-admin users */}
          {!isAdmin && (
            <>
              <div className="flex flex-col items-center space-y-3 p-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={
                      user?.gender === "male"
                        ? "/male.png"
                        : user?.gender === "female"
                          ? "/female.png"
                          : ""
                    }
                    alt={user?.name || "User"}
                  />
                  <AvatarFallback className="text-xl">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="text-center">
                  <p className="text-base font-heading font-semibold">
                    বায়োডাটার অবস্থা
                  </p>
                  <Badge
                    variant={isProfileIncomplete ? "destructive" : "default"}
                    className={cn("mt-2", {
                      "bg-blue-500 hover:bg-blue-600": !isProfileIncomplete,
                    })}
                  >
                    {isProfileIncomplete ? "অসম্পূর্ণ" : "সম্পূর্ণ"} (
                    {profileCompletion}%)
                  </Badge>
                </div>

                {isProfileIncomplete && (
                  <Button
                    asChild
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Link href="/profile/my-profile">
                      বায়োডাটা সম্পূর্ণ করুন
                    </Link>
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          {/* User Info - Only show for admin */}
          {isAdmin && (
            <>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-heading font-medium leading-none">
                    {user?.name || "ব্যবহারকারী"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuGroup>
            {/* Dashboard */}
            <DropdownMenuItem asChild className="py-3 cursor-pointer">
              <Link href={url}>
                <LayoutDashboard className="mr-3 h-5 w-5" />
                <span className="font-heading text-base">ড্যাশবোর্ড</span>
              </Link>
            </DropdownMenuItem>

            {/* Edit Biodata - Only for non-admin */}
            {!isAdmin && (
              <DropdownMenuItem asChild className="py-3 cursor-pointer">
                <Link href="/profile/my-profile">
                  <Edit className="mr-3 h-5 w-5" />
                  <span className="font-heading text-base">
                    বায়োডাটা এডিট করুন
                  </span>
                </Link>
              </DropdownMenuItem>
            )}

            {/* Shortlist - Only for non-admin */}
            {!isAdmin && (
              <DropdownMenuItem asChild className="py-3 cursor-pointer">
                <Link href="/profile/short-list">
                  <Heart className="mr-3 h-5 w-5" />
                  <span className="font-heading text-base">পছন্দের তালিকা</span>
                </Link>
              </DropdownMenuItem>
            )}

            {/* My Purchases - Only for non-admin */}
            {!isAdmin && (
              <DropdownMenuItem asChild className="py-3 cursor-pointer">
                <Link href="/profile/numbers">
                  <ShoppingBag className="mr-3 h-5 w-5" />
                  <span className="font-heading text-base">আমার ক্রয়সমূহ</span>
                </Link>
              </DropdownMenuItem>
            )}

            {/* Settings */}
            <DropdownMenuItem asChild className="py-3 cursor-pointer">
              <Link href={settings}>
                <Settings className="mr-3 h-5 w-5" />
                <span className="font-heading text-base">সেটিংস</span>
              </Link>
            </DropdownMenuItem>

            {/* Delete Biodata - Only for non-admin with Alert */}
            {!isAdmin && (
              <DropdownMenuItem
                className="py-3 cursor-pointer text-orange-600 focus:text-orange-600"
                onSelect={(e) => {
                  e.preventDefault();
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="mr-3 h-5 w-5" />
                <span className="font-heading text-base">ডিলিট বায়োডাটা</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Logout */}
          <DropdownMenuItem
            onClick={handellogout}
            className="py-3 cursor-pointer text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-3 h-5 w-5" />
            <span className="font-heading text-base">লগ আউট</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-xl">
              বায়োডাটা ডিলিট করবেন?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-heading text-base">
              আপনি কি নিশ্চিত যে আপনি আপনার বায়োডাটা ডিলিট করতে চান? এই কাজটি
              পূর্বাবস্থায় ফেরানো যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-heading">না</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-orange-600 hover:bg-orange-700 font-heading"
              disabled={isDeleting}
            >
              হ্যাঁ, ডিলিট করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
