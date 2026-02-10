"use client";

import { AppSidebar } from "@/components/custom/profile/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { TiThMenu } from "react-icons/ti";
import { useEffect, useState, useMemo } from "react"; // Add useMemo import
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { User } from "@/@types/user";

const SidebarHeader = ({ isMobile }: { isMobile: boolean }) => {
  const { toggleSidebar } = useSidebar();

  return (
    <header
      className={`flex h-16 shrink-0 items-center gap-2 border-b px-4 ${
        isMobile ? "justify-end" : "justify-start"
      }`}
    >
      <TiThMenu
        onClick={toggleSidebar}
        className="h-6 w-6 font-bold cursor-pointer hover:opacity-70 transition-opacity"
      />
    </header>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { data: user, isLoading } = useQueryWrapper<User>(
    ["get-my-profile-for-success"],
    "/user/get-my-profile",
  );

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

    // Marriage Information - Women (3 fields)
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

    // Calculate actual percentage
    const actualPercentage = (filledFields / totalFields) * 100;

    // Adjust so 55% actual completion shows as 100%
    const adjustedPercentage = Math.min(actualPercentage * (100 / 55), 100);

    return Math.round(adjustedPercentage);
  }, [user]);

  // Profile is incomplete if less than 65% displayed
  const isProfileIncomplete = profileCompletion < 65;

  // Create userObject with useMemo to avoid unnecessary recalculations
  const userObject = useMemo(
    () => ({
      profileImage: user?.gender === "male" ? "/male.png" : "/female.png",
      name: user?.name || "ব্যবহারকারী",
      isProfileIncomplete: isProfileIncomplete,
      profileCompletion: profileCompletion,
    }),
    [user, isProfileIncomplete, profileCompletion],
  );

  // Create data object with ProfileTop dynamically
  const sidebarData = useMemo(
    () => ({
      navMain: [
        {
          title: "শুরু করুন",
          url: "/profile",
          items: [
            {
              title: "প্রোফাইল",
              url: "/profile",
            },
            {
              title: "প্রিয় তালিকা",
              url: "/profile/short-list",
            },
            {
              title: "আমার সংযোগ",
              url: "/profile/numbers",
            },
          ],
        },
        {
          title: "সেটিংস",
          url: "/profile/settings",
          items: [
            {
              title: "প্রোফাইল সেটিংস",
              url: "/profile/settings",
            },
          ],
        },
      ],
      ProfileTop: userObject,
    }),
    [userObject],
  );

  useEffect(() => {
    setMounted(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  const sidebarSide = isMobile ? "right" : "left";

  return (
    <SidebarProvider side={sidebarSide}>
      {!isMobile && <AppSidebar data={sidebarData} side="left" />}
      <SidebarInset className="w-full">
        <SidebarHeader isMobile={isMobile} />
        <div className="flex flex-1 flex-col gap-4">{children}</div>
      </SidebarInset>
      {isMobile && <AppSidebar data={sidebarData} side="right" />}
    </SidebarProvider>
  );
};

export default Layout;
