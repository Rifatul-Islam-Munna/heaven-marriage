import { User } from "@/@types/user";
import {
  educationMediumOptions,
  marriedStatus,
  polygamyConsentOptions,
  professionOptions,
} from "@/staticData/all-data";
import { districts } from "@/staticData/districts";
import { upazilas } from "@/staticData/upazilas";
import { savedBiodataAddress } from "./biodata-address";
import { formatBirthDate } from "./birth-date";
import { biodataCvFields, type BiodataCvOptions } from "./biodata-cv";

export interface BiodataWhatsappGroup {
  id: "girls" | "boys";
  label: string;
  description: string;
  inviteUrl: string;
}

export const BIODATA_WHATSAPP_GROUPS: BiodataWhatsappGroup[] = [
  {
    id: "girls",
    label: "মেয়েদের গ্রুপ",
    description: "এই গ্রুপে পাত্রীর CV পাঠাতে পারবেন।",
    inviteUrl: "https://chat.whatsapp.com/Feorpv1yT9JAwpu93bkbvo?mode=gi_t",
  },
  {
    id: "boys",
    label: "ছেলেদের গ্রুপ",
    description: "এই গ্রুপে পাত্রের CV পাঠাতে পারবেন।",
    inviteUrl: "https://chat.whatsapp.com/BqVeBzM3ELL1a114s6bYyw?mode=gi_t",
  },
];

const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

const cleanText = (value?: string | null) =>
  value?.replace(/\s+/g, " ").trim() || "";

const formatLabelValueLine = (label: string, value?: string) => {
  const cleanedValue = cleanText(value);
  return cleanedValue ? `*${label}* ${cleanedValue}` : "";
};

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
  address?: User["address"],
  country?: string,
) => {
  const exactAddress = cleanText(addressText);
  if (exactAddress) return exactAddress;

  const location = joinNonEmpty([
    address?.area,
    cleanText(address?.cityCorporation) || getUpazilaLabel(address?.upazila),
    getDistrictLabel(address?.district),
  ]);

  return location
    ? joinNonEmpty([location, cleanText(country) || "Bangladesh"])
    : cleanText(country);
};

const formatAge = (age?: number) =>
  age ? `${toBanglaDigits(age)} বছর` : "";

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

type BuildBiodataWhatsappTextOptions = BiodataCvOptions;

const writeTextToClipboard = async (message: string) => {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(message);
    return true;
  } catch {
    return false;
  }
};

export const buildBiodataWhatsappText = (
  user: User,
  origin: string,
  options: BuildBiodataWhatsappTextOptions = {},
) => {
  const { includeContactNumber = false } = options;
  const cv = biodataCvFields(user, options);
  const field = cv.field;
  const isFemale = user.gender === "female";
  const publicProfileId = cleanText(user.userId) || cleanText(user._id);
  const biodataNumber = publicProfileId || "N/A";
  const currentLocation = formatLocation(
    savedBiodataAddress(user, "presentAddress"),
    user.address,
    user.residenceCountry,
  );
  const permanentLocation = savedBiodataAddress(user, "permanentAddress");
  const profileUrl = publicProfileId
    ? `${origin}/biodata/${publicProfileId}`
    : origin;
  const details = options.format === "long" ? cv.sections() : [
    field("name", "নামঃ"),
    field("age", "বয়সঃ", value => formatAge(Number(value))),
    formatLabelValueLine("বর্তমান অবস্থানঃ", currentLocation),
    formatLabelValueLine("স্থায়ী ঠিকানাঃ", permanentLocation),
    field("dateOfBirth", "জন্ম তারিখঃ", value => formatBirthDate(String(value))),
    field("educationInfo.educationBackground", "শিক্ষাগত ব্যাকগ্রাউন্ডঃ"),
    field("educationInfo.educationMethod", "শিক্ষা মাধ্যমঃ", () => formatEducationBackground(user)),
    field("educationInfo.highestEducation", "পড়াশুনাঃ", () => formatEducationSummary(user)),
    field("occupational.profession", "পেশাঃ", () => formatProfession(user)),
    field("personalInformation.height", "উচ্চতাঃ", value => formatHeight(String(value))),
    field("personalInformation.physicalStructure", "শারীরিক কাঠামোঃ"),
    field("personalInformation.skinTone", "গায়ের রঙঃ"),
    field("maritalStatus", "বৈবাহিক অবস্থাঃ", value => formatMaritalStatus(String(value))),
    !isFemale ? field("occupational.salary", "মাসিক আয়ঃ") : "",
    isFemale ? field("marriageInformationWomen.polygamyConsentOptions",
      "আপনি কারোর ২য়/৩য়/৪র্থ স্ত্রী (মাসনা, সুলাছা, রুবা'আ) হতে রাজি আছেন কি নাঃ",
      () => formatFemaleMarriagePreference(user)) : "",
    !isFemale ? field("marriageInformationMan.wifeVailAfterMarriage", "বিয়ের পর স্ত্রীকে পর্দায় রাখতে পারবেন কি নাঃ") : "",
    !isFemale ? field("marriageInformationMan.allowWifeStudyAfterMarriage", "স্ত্রীর পড়াশোনাঃ") : "",
    !isFemale ? field("marriageInformationMan.wifeJobAfterMarriage", "স্ত্রীর চাকরিঃ") : "",
    field("expectedLifePartner.maritalStatus", isFemale ? "পাত্রের বৈবাহিক অবস্থাঃ" : "পাত্রীর বৈবাহিক অবস্থাঃ"),
    field("expectedLifePartner.expectedQuality", isFemale ? "কেমন পাত্র চানঃ" : "কেমন পাত্রী চানঃ"),
    field("whatsapp", "আপনার হোয়াটসঅ্যাপ নাম্বারঃ"),
    field("guardianPhone", "অভিভাবকের নম্বরঃ"),
    ...cv.extras(),
  ];
  const lines = [
    options.format === "long" ? "বিস্তারিত সিভি" : "পাবলিক শর্ট সিভি",
    "",
    `${isFemale ? "🌿🍂" : "🌿🍁"} *${isFemale ? "পাত্রীর" : "পাত্রের"} বায়োডাটা নাম্বারঃ* ${biodataNumber}`,
    "",
    ...details,
    includeContactNumber && !cv.schema.questions.some(q => q.path === "phoneNumber")
      ? formatLabelValueLine("মোবাইল নম্বর:", user.phoneNumber) : "",
    "",
    `*${isFemale ? "পাত্রীর" : "পাত্রের"} বিস্তারিত বায়োডাটা লিংকঃ*`,
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
  options: BuildBiodataWhatsappTextOptions = {},
) => {
  const normalizedNumber = normalizeWhatsappPhoneNumber(phoneNumber);
  const message = encodeURIComponent(
    buildBiodataWhatsappText(user, origin, options),
  );

  return normalizedNumber
    ? `https://wa.me/${normalizedNumber}?text=${message}`
    : `https://wa.me/?text=${message}`;
};

export const copyBiodataWhatsappText = async (
  user: User,
  origin: string,
  options: BuildBiodataWhatsappTextOptions = {},
) => {
  const message = buildBiodataWhatsappText(user, origin, options);
  const copied = await writeTextToClipboard(message);

  return { copied, message };
};

export const openBiodataWhatsappGroupShare = async (
  user: User,
  origin: string,
  inviteUrl: string,
) => {
  const { copied, message } = await copyBiodataWhatsappText(user, origin, {
    includeContactNumber: true,
  });

  if (typeof window !== "undefined") {
    window.open(inviteUrl, "_blank", "noopener,noreferrer");
  }

  return { copied, message };
};
