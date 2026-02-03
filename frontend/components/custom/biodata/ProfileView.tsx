"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  Users,
  Book,
  Sparkles,
  Target,
  Calendar,
  User as UserIcon,
  Activity,
  Ruler,
  Droplet,
  Weight,
  Flag,
} from "lucide-react";
import { User } from "@/@types/user";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";

interface ProfileViewProps {
  id: string;
}

const QuickInfoCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string | number | undefined;
}) => {
  if (!value) return null;

  return (
    <div className="bg-white border  border-gray-200 rounded-lg p-4 shadow-none hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-pink-50 rounded-lg">
          <Icon className="w-4 h-4 text-pink-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-0.5">{label}</p>
          <p className="font-semibold text-gray-900 text-sm truncate">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="p-2 bg-pink-50 rounded-lg">
      <Icon className="w-5 h-5 text-pink-600" />
    </div>
    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
  </div>
);

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | undefined;
}) => {
  if (value === undefined || value === null || value === "") return null;

  const displayValue =
    typeof value === "boolean" ? (value ? "Yes" : "No") : value;

  return (
    <div className="grid grid-cols-2 gap-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 -mx-2 rounded">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right">
        {displayValue}
      </span>
    </div>
  );
};

export default function ProfileView({ id }: ProfileViewProps) {
  const { data: userData, isLoading } = useQueryWrapper<User>(
    ["get-user", id],
    `/user/get-one-user?id=${id}`,
    { enabled: !!id },
  );

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <Badge className="mb-3 bg-pink-100 text-pink-700 hover:bg-pink-200 border-0">
                {userData?.gender === "male" ? "Brother" : "Sister"}
              </Badge>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                প্রোফাইল বিস্তারিত
              </h1>
              <p className="text-gray-600 text-sm">
                আল্লাহ আপনাকে সঠিক পথে পরিচালিত করুন।
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Button className="bg-pink-600 hover:bg-pink-700 text-white">
                <Heart className="w-4 h-4 mr-2" />
                Shortlist
              </Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Phone className="w-4 h-4 mr-2" />
                Ask for Number
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <QuickInfoCard
            icon={Activity}
            label="বৈবাহিক অবস্থা"
            value={userData?.maritalStatus}
          />
          <QuickInfoCard
            icon={Calendar}
            label="বয়স"
            value={userData?.age ? `${userData.age} years` : undefined}
          />
          <QuickInfoCard
            icon={Ruler}
            label="উচ্চতা"
            value={
              userData?.personalInformation?.height
                ? `${userData.personalInformation.height} ft`
                : undefined
            }
          />
          <QuickInfoCard
            icon={Droplet}
            label="রক্তের গ্রুপ"
            value={userData?.bloodGroup}
          />
          <QuickInfoCard
            icon={Weight}
            label="ওজন"
            value={userData?.weight ? `${userData.weight} kg` : undefined}
          />
          <QuickInfoCard
            icon={Flag}
            label="জাতীয়তা"
            value={userData?.nationality}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Personal Information */}
            <Card className=" shadow-none">
              <CardContent className="pt-6">
                <SectionHeader icon={UserIcon} title="ব্যক্তিগত তথ্য " />
                <div className="space-y-1">
                  <InfoRow
                    label="গাত্রবর্ণ"
                    value={userData?.personalInformation?.skinTone}
                  />
                  <InfoRow
                    label="প্রতিদিন পাঁচ ওয়াক্ত নামাজ পড়েন কি?"
                    value={userData?.personalInformation?.prayerFiverTimeFrom}
                  />
                  <InfoRow
                    label=" কুরআন তিলওয়াত করতে পারেন?"
                    value={userData?.personalInformation?.reciteQuran}
                  />
                  <InfoRow
                    label="কোন ফিকহ অনুসরণ করেন?"
                    value={userData?.personalInformation?.fiqhFollow}
                  />
                  <InfoRow
                    label="দ্বীনের শিক্ষা"
                    value={userData?.personalInformation?.islamicStudy}
                  />
                  <InfoRow
                    label="ঘরের বাহিরে সাধারণত কি ধরণের পোশাক পরেন?"
                    value={userData?.personalInformation?.outsideClothes}
                  />
                  {userData?.gender === "female" && (
                    <InfoRow
                      label="কবে থেকে নিকাব সহ পর্দা করছেন?"
                      value={userData?.personalInformation?.womenNiqbYear}
                    />
                  )}
                  {userData?.gender === "male" && (
                    <>
                      <InfoRow
                        label="সুন্নতি দাড়ি আছে কি না? কবে থেকে রেখেছেন?"
                        value={userData?.personalInformation?.manBeard}
                      />
                      <InfoRow
                        label="টাখনুর উপরে কাপড় পরেন?"
                        value={
                          userData?.personalInformation?.manClothAboveAnkels
                        }
                      />
                    </>
                  )}
                  <InfoRow
                    label="মাহরাম/নন-মাহরাম মেনে চলেন কি?"
                    value={userData?.personalInformation?.maharaNonMahram}
                  />
                  <InfoRow
                    label="সাধারণত সপ্তাহে কত ওয়াক্ত নামায আপনার কাযা হয়?"
                    value={userData?.personalInformation?.MissPrayerTime}
                  />
                  <InfoRow
                    label="নাটক / সিনেমা / সিরিয়াল / গান এসব দেখেন বা শুনেন?"
                    value={userData?.personalInformation?.digitalMedia}
                  />
                  <InfoRow
                    label="দ্বীনের কোন বিশেষ মেহনতে যুক্ত আছেন?"
                    value={userData?.personalInformation?.mentalOrPhysicalIssue}
                  />
                  <InfoRow
                    label="নিজের শখ, পছন্দ-অপছন্দ ইত্যাদি বিষয়ে লিখুন"
                    value={userData?.personalInformation?.extraInfoHobby}
                  />
                  <InfoRow
                    label="আপনার পছন্দের  আলেমের নাম লিখুন"
                    value={userData?.personalInformation?.islamicScholarsName}
                  />
                  <InfoRow
                    label="আপনার পড়া  ইসলামি বই এর নাম লিখুন"
                    value={userData?.personalInformation?.islamicBookName}
                  />
                  <InfoRow
                    label="দ্বীনের কোন বিশেষ মেহনতে যুক্ত আছেন?"
                    value={userData?.personalInformation?.specialWorkOfDeen}
                  />
                  <InfoRow
                    label="মাজার সম্পর্কে আপনার ধারণা  কি?"
                    value={userData?.personalInformation?.majarBeliveStatus}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Education */}
            {userData?.educationInfo && (
              <Card className="shadow-none">
                <CardContent className="pt-6">
                  <SectionHeader
                    icon={GraduationCap}
                    title="শিক্ষাগত যোগ্যতা  "
                  />
                  <div className="space-y-1">
                    <InfoRow
                      label="আপনার শিক্ষা মাধ্যম"
                      value={userData?.educationInfo?.educationMethod}
                    />
                    <InfoRow
                      label="সর্বোচ্চ শিক্ষাগত যোগ্যতা"
                      value={userData?.educationInfo?.highestEducation}
                    />
                    <InfoRow
                      label="বিভাগ"
                      value={userData?.educationInfo?.highestEducationBoard}
                    />
                    <InfoRow
                      label="বিষয়/বিভাগ"
                      value={userData?.educationInfo?.highestEducationGroup}
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
                    />

                    {(userData?.educationInfo?.sSCPassingYear ||
                      userData?.educationInfo?.sSCPassingGroup ||
                      userData?.educationInfo?.sSCResult) && (
                      <>
                        <div className="pt-3 pb-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            এস.এস.সি / দাখিল / সমমান পাসের সন
                          </p>
                        </div>
                        <InfoRow
                          label="পাসের সন"
                          value={userData?.educationInfo?.sSCPassingYear}
                        />
                        <InfoRow
                          label="বিভাগ"
                          value={userData?.educationInfo?.sSCPassingGroup}
                        />
                        <InfoRow
                          label="ফলাফল"
                          value={userData?.educationInfo?.sSCResult}
                        />
                      </>
                    )}

                    {(userData?.educationInfo?.hSCPassingYear ||
                      userData?.educationInfo?.hSCPassingGroup ||
                      userData?.educationInfo?.hSCResult) && (
                      <>
                        <div className="pt-3 pb-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            স্নাতক / স্নাতক (সম্মান) / ফাজিল অধ্যয়নের বিষয়
                          </p>
                        </div>
                        <InfoRow
                          label="পাসের সন"
                          value={userData?.educationInfo?.hSCPassingYear}
                        />
                        <InfoRow
                          label="বিভাগ"
                          value={userData?.educationInfo?.hSCPassingGroup}
                        />
                        <InfoRow
                          label="ফলাফল"
                          value={userData?.educationInfo?.hSCResult}
                        />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Occupation */}
            {userData?.occupational && (
              <Card className="shadow-none">
                <CardContent className="pt-6">
                  <SectionHeader icon={Briefcase} title="পেশাগত তথ্য" />
                  <div className="space-y-1">
                    <InfoRow
                      label="পেশা"
                      value={userData?.occupational?.profession}
                    />
                    <InfoRow
                      label="পেশার বিস্তারিত বিবরণ"
                      value={userData?.occupational?.workingDetails}
                    />
                    <InfoRow
                      label="মাসিক আয়"
                      value={userData?.occupational?.salary}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Address */}
            {userData?.address && (
              <Card className="shadow-none">
                <CardContent className="pt-6">
                  <SectionHeader icon={MapPin} title="ঠিকানা" />
                  <div className="space-y-1">
                    <InfoRow label="জেলা" value={userData?.address?.district} />
                    <InfoRow
                      label="উপজেলা"
                      value={userData?.address?.upazila}
                    />
                    <InfoRow
                      label="বর্তমান ঠিকানা"
                      value={userData?.address?.presentAddress}
                    />
                    <InfoRow
                      label="স্থায়ী ঠিকানা"
                      value={userData?.address?.permanentAddress}
                    />
                    <InfoRow
                      label="অন্যান্য তথ্য"
                      value={userData?.address?.extraInfo}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Family Information */}
            {userData?.familyInfo && (
              <Card className=" shadow-none">
                <CardContent className="pt-6">
                  <SectionHeader icon={Users} title="পারিবারিক তথ্য" />
                  <div className="space-y-1">
                    <div className="pt-2 pb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Parents
                      </p>
                    </div>
                    <InfoRow
                      label="আপনার পিতা কি জীবিত?"
                      value={userData?.familyInfo?.isFatherAlive}
                    />
                    <InfoRow
                      label="পিতার পেশার বিবরণ"
                      value={userData?.familyInfo?.fathersProfession}
                    />
                    <InfoRow
                      label="আপনার মাতা কি জীবিত ?"
                      value={userData?.familyInfo?.isMotherAlive}
                    />
                    <InfoRow
                      label="মাতার পেশার বিবরণ"
                      value={userData?.familyInfo?.mothersProfession}
                    />

                    <div className="pt-3 pb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        ভাইবোন
                      </p>
                    </div>
                    <InfoRow
                      label="ভাই কতগুলি ?"
                      value={userData?.familyInfo?.brotherCount}
                    />
                    <InfoRow
                      label="ভাইদের তথ্য "
                      value={userData?.familyInfo?.brotherInformation}
                    />
                    <InfoRow
                      label="বোন কতগুলি"
                      value={userData?.familyInfo?.sisterCount}
                    />
                    <InfoRow
                      label="বোনদের তথ্য"
                      value={userData?.familyInfo?.sisterInformation}
                    />

                    <div className="pt-3 pb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        পারিবারিক অবস্থা
                      </p>
                    </div>
                    <InfoRow
                      label="পারিবারিক অর্থনৈতিক অবস্থা"
                      value={userData?.familyInfo?.familyFinancial}
                    />
                    <InfoRow
                      label="পারিবারিক সম্পদের বিবরণ"
                      value={userData?.familyInfo?.familyAssetDetails}
                    />
                    <InfoRow
                      label="পারিবারিক দ্বীনি পরিবেশ কেমন?"
                      value={userData?.familyInfo?.familyReligiousCondition}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Marriage Information - Female */}
            {userData?.gender === "female" &&
              userData?.marriageInformationWomen && (
                <Card className="shadow-sm">
                  <CardContent className="pt-6">
                    <SectionHeader
                      icon={Sparkles}
                      title="বিবাহ সম্পর্কিত তথ্য"
                    />
                    <div className="space-y-1">
                      <InfoRow
                        label="অভিভাবক আপনার বিয়েতে রাজি কি না?"
                        value={
                          userData?.marriageInformationWomen?.isGuardiansAgreed
                        }
                      />
                      <InfoRow
                        label="আপনি কি বিয়ের পর চাকরি করতে ইচ্ছুক?"
                        value={
                          userData?.marriageInformationWomen?.jobAfterMarriage
                        }
                      />
                      <InfoRow
                        label="বিয়ের পর পড়াশোনা চালিয়ে যেতে চান?"
                        value={
                          userData?.marriageInformationWomen?.studyAfterMarriage
                        }
                      />
                      <InfoRow
                        label=" বিয়ে সম্পর্কে আপনার ধারণা কি?"
                        value={
                          userData?.marriageInformationWomen?.thoughtsOnMarriage
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Marriage Information - Male */}
            {userData?.gender === "male" &&
              userData?.marriageInformationMan && (
                <Card className="shadow-none">
                  <CardContent className="pt-6">
                    <SectionHeader
                      icon={Sparkles}
                      title="বিবাহ সম্পর্কিত তথ্য "
                    />
                    <div className="space-y-1">
                      <InfoRow
                        label="অভিভাবক আপনার বিয়েতে রাজি কি না?"
                        value={
                          userData?.marriageInformationMan?.isGuardiansAgreed
                        }
                      />
                      <InfoRow
                        label="বিয়ের পর স্ত্রীকে পর্দায় রাখতে পারবেন?"
                        value={
                          userData?.marriageInformationMan
                            ?.wifeVailAfterMarriage
                        }
                      />
                      <InfoRow
                        label="বিয়ের পর স্ত্রীকে পড়াশোনা করতে দিতে চান?"
                        value={
                          userData?.marriageInformationMan
                            ?.allowWifeStudyAfterMarriage
                        }
                      />
                      <InfoRow
                        label="বিয়ের পর স্ত্রীকে চাকরী করতে দিতে চান?"
                        value={
                          userData?.marriageInformationMan?.wifeJobAfterMarriage
                        }
                      />
                      <InfoRow
                        label="বিয়ের পর স্ত্রীকে কোথায় নিয়ে থাকবেন?"
                        value={
                          userData?.marriageInformationMan
                            ?.livingPlaceAfterMarriage
                        }
                      />
                      <InfoRow
                        label=" পাত্রীপক্ষের কাছে কোনো উপহার আশা করবেন কি না?"
                        value={
                          userData?.marriageInformationMan
                            ?.expectedAnyGiftFromMarriage
                        }
                      />
                      <InfoRow
                        label="বিয়ে সম্পর্কে আপনার ধারণা কি?"
                        value={
                          userData?.marriageInformationMan?.thoughtsOnMarriage
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Expected Partner */}
            {userData?.expectedLifePartner && (
              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <SectionHeader icon={Target} title="প্রত্যাশিত জীবনসঙ্গী " />
                  <div className="space-y-1">
                    <InfoRow
                      label="বয়স"
                      value={userData?.expectedLifePartner?.age}
                    />
                    <InfoRow
                      label="গাত্রবর্ণ"
                      value={userData?.expectedLifePartner?.complexion}
                    />
                    <InfoRow
                      label="উচ্চতা"
                      value={userData?.expectedLifePartner?.height}
                    />
                    <InfoRow
                      label="শিক্ষাগত যোগ্যতা"
                      value={userData?.expectedLifePartner?.education}
                    />
                    <InfoRow
                      label="জেলা"
                      value={userData?.expectedLifePartner?.district}
                    />
                    <InfoRow
                      label="উপজেলা"
                      value={userData?.expectedLifePartner?.upazila}
                    />
                    <InfoRow
                      label="বৈবাহিক অবস্থা"
                      value={userData?.expectedLifePartner?.maritalStatus}
                    />
                    <InfoRow
                      label="পেশা"
                      value={userData?.expectedLifePartner?.profession}
                    />
                    <InfoRow
                      label="অর্থনৈতিক অবস্থা"
                      value={userData?.expectedLifePartner?.financialCondition}
                    />
                    <InfoRow
                      label="জীবনসঙ্গীর গুণাবলী প্রত্যাশা করেন"
                      value={userData?.expectedLifePartner?.expectedQuality}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center p-6 bg-white rounded-xl shadow-sm">
          <p className="text-gray-600 text-sm italic">
            "And among His signs is that He created for you mates from among
            yourselves, that you may dwell in tranquility with them" - Quran
            30:21
          </p>
        </div>
      </div>
    </div>
  );
}
