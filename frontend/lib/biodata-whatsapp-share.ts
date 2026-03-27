import { User } from "@/@types/user";
import {
  educationMediumOptions,
  marriedStatus,
  polygamyConsentOptions,
  professionOptions,
} from "@/staticData/all-data";
import { districts } from "@/staticData/districts";
import { upazilas } from "@/staticData/upazilas";

const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

const cleanText = (value?: string | null) =>
  value?.replace(/\s+/g, " ").trim() || "";

const toBanglaDigits = (value: string | number) =>
  String(value).replace(/\d/g, (digit) => banglaDigits[Number(digit)]);

const joinNonEmpty = (
  values: Array<string | undefined>,
  separator = ", ",
) =>
  values
    .map((value) => cleanText(value))
    .filter(Boolean)
    .join(separator);

const getDistrictLabel = (district?: string) =>
  districts.find((item) => item.name === district)?.bn_name ||
  cleanText(district);

const getUpazilaLabel = (upazila?: string) =>
  upazilas.find((item) => item.name === upazila)?.bn_name ||
  cleanText(upazila);

const formatLocation = (
  addressText?: string,
  upazila?: string,
  district?: string,
) => {
  const exactAddress = cleanText(addressText);
  if (exactAddress) return exactAddress;

  return joinNonEmpty([getUpazilaLabel(upazila), getDistrictLabel(district)]);
};

const formatAge = (age?: number) =>
  age ? `${toBanglaDigits(age)} বছর` : "";

const formatBirthYear = (age?: number) =>
  age ? toBanglaDigits(new Date().getFullYear() - age) : "";

const formatHeight = (height?: string | number) => {
  if (height === undefined || height === null || height === "") return "";

  const [feet, inches = "0"] = String(height).split(".");
  return `${toBanglaDigits(feet)} ফিট ${toBanglaDigits(inches)} ইঞ্চি`;
};

const formatMaritalStatus = (maritalStatus?: string) =>
  marriedStatus.find((item) => item.en === maritalStatus)?.bn ||
  cleanText(maritalStatus);

const formatEducationBackground = (user: User) =>
  cleanText(user.educationInfo?.educationBackground) ||
  educationMediumOptions.find(
    (item) => item.value === user.educationInfo?.educationMethod,
  )?.label ||
  cleanText(user.educationInfo?.educationMethod);

const formatEducationSummary = (user: User) => {
  const highestEducation = cleanText(user.educationInfo?.highestEducation);
  const subject = cleanText(user.educationInfo?.highestEducationGroup);

  if (!highestEducation) return "";

  return joinNonEmpty([
    highestEducation,
    subject ? `ইন ${subject}` : undefined,
  ], " ");
};

const formatProfession = (user: User) =>
  professionOptions.find((item) => item.value === user.occupational?.profession)
    ?.label || cleanText(user.occupational?.profession);

const formatFemaleMarriagePreference = (user: User) =>
  polygamyConsentOptions.find(
    (item) => item.value === user.marriageInformationWomen?.polygamyConsentOptions,
  )?.label || cleanText(user.marriageInformationWomen?.polygamyConsentOptions);

const formatMaleStudyJobPreference = (user: User) =>
  joinNonEmpty(
    [
      cleanText(user.marriageInformationMan?.allowWifeStudyAfterMarriage)
        ? `পড়াশোনা - ${cleanText(user.marriageInformationMan?.allowWifeStudyAfterMarriage)}`
        : undefined,
      cleanText(user.marriageInformationMan?.wifeJobAfterMarriage)
        ? `চাকরি - ${cleanText(user.marriageInformationMan?.wifeJobAfterMarriage)}`
        : undefined,
    ],
    ", ",
  );

export const buildBiodataWhatsappText = (user: User, origin: string) => {
  const contactWhatsapp =
    cleanText(user?.whatsapp) || cleanText(user?.phoneNumber);
  const isFemale = user.gender === "female";
  const publicProfileId = cleanText(user.userId) || cleanText(user._id);
  const biodataNumber = publicProfileId || "N/A";
  const currentLocation = formatLocation(
    user.address?.presentAddress,
    user.address?.upazila,
    user.address?.district,
  );
  const permanentLocation = formatLocation(
    user.address?.permanentAddress,
    user.address?.upazila,
    user.address?.district,
  );
  const profileUrl = publicProfileId
    ? `${origin}/biodata/${publicProfileId}`
    : origin;
  const lines = [
    "পাবলিক শর্ট সিভি",
    "",
    `${isFemale ? "🌿🍂" : "🌿🍁"} ${isFemale ? "পাত্রীর" : "পাত্রের"} বায়োডাটা নাম্বারঃ ${biodataNumber}`,
    "",
    cleanText(user.name) ? `নামঃ ${cleanText(user.name)}` : "",
    formatAge(user.age) ? `বয়সঃ ${formatAge(user.age)}` : "",
    currentLocation ? `বর্তমান অবস্থানঃ ${currentLocation}` : "",
    permanentLocation ? `স্থায়ী ঠিকানাঃ ${permanentLocation}` : "",
    formatBirthYear(user.age) ? `জন্ম সনঃ ${formatBirthYear(user.age)}` : "",
    formatEducationBackground(user)
      ? `শিক্ষাগত ব্যাকগ্রাউন্ডঃ ${formatEducationBackground(user)}`
      : "",
    formatEducationSummary(user)
      ? `পড়াশুনাঃ ${formatEducationSummary(user)}`
      : "",
    formatProfession(user) ? `পেশাঃ ${formatProfession(user)}` : "",
    formatHeight(user.personalInformation?.height)
      ? `উচ্চতাঃ ${formatHeight(user.personalInformation?.height)}`
      : "",
    cleanText(user.personalInformation?.physicalStructure)
      ? `শারীরিক কাঠামোঃ ${cleanText(user.personalInformation?.physicalStructure)}`
      : "",
    cleanText(user.personalInformation?.skinTone)
      ? `গায়ের রঙঃ ${cleanText(user.personalInformation?.skinTone)}`
      : "",
    formatMaritalStatus(user.maritalStatus)
      ? `বৈবাহিক অবস্থাঃ ${formatMaritalStatus(user.maritalStatus)}`
      : "",
    isFemale && formatFemaleMarriagePreference(user)
      ? `আপনি কারোর ২য়/৩য়/৪র্থ স্ত্রী (মাসনা, সুলাছা, রুবা'আ) হতে রাজি আছেন কি নাঃ ${formatFemaleMarriagePreference(user)}`
      : "",
    !isFemale && cleanText(user.marriageInformationMan?.wifeVailAfterMarriage)
      ? `বিয়ের পর স্ত্রীকে পর্দায় রাখতে পারবেন কি নাঃ ${cleanText(user.marriageInformationMan?.wifeVailAfterMarriage)}`
      : "",
    !isFemale && formatMaleStudyJobPreference(user)
      ? `স্ত্রীকে পড়াশোনা/চাকরি করতে দিতে চান কি নাঃ ${formatMaleStudyJobPreference(user)}`
      : "",
    cleanText(user.expectedLifePartner?.expectedQuality)
      ? `${isFemale ? "কেমন পাত্র চানঃ" : "কেমন পাত্রী চানঃ"} ${cleanText(user.expectedLifePartner?.expectedQuality)}`
      : "",
    contactWhatsapp
      ? `আপনার হোয়াটসঅ্যাপ নাম্বারঃ ${contactWhatsapp}`
      : "",
    "",
    `${isFemale ? "পাত্রীর" : "পাত্রের"} বিস্তারিত বায়োডাটা লিংকঃ`,
    profileUrl,
  ];

  return lines.filter(Boolean).join("\n");
};

export const normalizeWhatsappPhoneNumber = (phoneNumber?: string) => {
  const digits = cleanText(phoneNumber).replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `88${digits}`;
  if (digits.length === 10 && digits.startsWith("1")) return `880${digits}`;

  return digits;
};

export const buildBiodataWhatsappShareUrl = (user: User, origin: string) =>
  `https://wa.me/?text=${encodeURIComponent(
    buildBiodataWhatsappText(user, origin),
  )}`;

export const buildBiodataWhatsappShareUrlForNumber = (
  user: User,
  origin: string,
  phoneNumber?: string,
) => {
  const normalizedNumber = normalizeWhatsappPhoneNumber(phoneNumber);
  const message = encodeURIComponent(buildBiodataWhatsappText(user, origin));

  return normalizedNumber
    ? `https://wa.me/${normalizedNumber}?text=${message}`
    : `https://wa.me/?text=${message}`;
};
