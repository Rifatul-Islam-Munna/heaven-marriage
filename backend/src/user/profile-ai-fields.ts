import { z } from 'zod';
import { PROFILE_OPTIONS } from './profile-ai-options';
export type Question = {
  path: string;
  label: string;
  question: string;
  kind: 'text' | 'number' | 'boolean';
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  gender?: 'male' | 'female';
  hint?: string;
  /** Set for admin-created questions; answers go to user.dynamicAnswers[dynamicId]. */
  dynamicId?: string;
  /** Multiple-choice dynamic question: the model returns comma-separated option values. */
  multiple?: boolean;
};
const text = (
  path: string,
  label: string,
  question: string,
  extra: Partial<Question> = {},
): Question => ({ path, label, question, kind: 'text', ...extra });
const num = (
  path: string,
  label: string,
  question: string,
  min: number,
  max: number,
): Question => ({ path, label, question, kind: 'number', min, max });
const bool = (
  path: string,
  label: string,
  question: string,
  extra: Partial<Question> = {},
): Question => ({ path, label, question, kind: 'boolean', ...extra });
export const QUESTIONS: Question[] = [
  text('name', 'নাম', 'আপনার পূর্ণ নাম কী?', { min: 3, max: 100 }),
  text('gender', 'লিঙ্গ', 'আপনার বায়োডাটার লিঙ্গ নির্বাচন করুন।', {
    options: [
      { value: 'male', label: 'পুরুষ' },
      { value: 'female', label: 'মহিলা' },
    ],
  }),
  text('maritalStatus', 'বৈবাহিক অবস্থা', 'আপনার বর্তমান বৈবাহিক অবস্থা কী?', {
    options: PROFILE_OPTIONS.maritalStatus,
  }),
  num('age', 'বয়স', 'আপনার বয়স কত বছর?', 18, 100),
  num('weight', 'ওজন', 'আপনার ওজন কত কেজি?', 20, 300),
  text('nationality', 'দেশ', 'আপনি কোন দেশের নাগরিক?', {
    options: PROFILE_OPTIONS.country,
  }),
  num(
    'personalInformation.height',
    'উচ্চতা',
    'আপনার উচ্চতা কত ফুট ও কত ইঞ্চি?',
    3,
    8,
  ),
  text('personalInformation.skinTone', 'ত্বকের রং', 'আপনার ত্বকের রং কোনটি?', {
    options: PROFILE_OPTIONS.skinColor,
  }),
  text(
    'address.district',
    'জেলা',
    'বাংলাদেশে আপনার জেলা কোনটি? প্রযোজ্য না হলে প্রশ্নটি এড়িয়ে যেতে পারেন।',
    { options: PROFILE_OPTIONS.district },
  ),
  text('address.upazila', 'উপজেলা', 'আপনার উপজেলা কোনটি?', {
    options: PROFILE_OPTIONS.upazila,
  }),
  text(
    'educationInfo.educationMethod',
    'শিক্ষার মাধ্যম',
    'আপনি কোন শিক্ষামাধ্যমে পড়াশোনা করেছেন?',
    { options: PROFILE_OPTIONS.educationMedium },
  ),
  text(
    'educationInfo.highestEducation',
    'সর্বোচ্চ শিক্ষা',
    'আপনার সর্বোচ্চ শিক্ষাগত যোগ্যতা কী?',
    { options: PROFILE_OPTIONS.education },
  ),
  text(
    'personalInformation.outsideClothes',
    'পোশাক',
    'বাইরে সাধারণত কেমন পোশাক পরেন?',
  ),
  text(
    'personalInformation.prayerFiverTimeFrom',
    'নামাজ',
    'কত সময় ধরে পাঁচ ওয়াক্ত নামাজ পড়ছেন?',
  ),
  text(
    'personalInformation.reciteQuran',
    'কুরআন তিলাওয়াত',
    'আপনি কি শুদ্ধভাবে কুরআন তিলাওয়াত করতে পারেন? আপনার অবস্থা জানান।',
  ),
  text(
    'familyInfo.familyFinancial',
    'পারিবারিক অর্থনৈতিক অবস্থা',
    'আপনার পরিবারের অর্থনৈতিক অবস্থা কেমন?',
    { options: PROFILE_OPTIONS.economicStatus },
  ),
  text('occupational.profession', 'পেশা', 'আপনার বর্তমান পেশা কী?', {
    options: PROFILE_OPTIONS.profession,
  }),
  text(
    'expectedLifePartner.age',
    'প্রত্যাশিত বয়স',
    'জীবনসঙ্গীর বয়সের সীমা কত চান?',
  ),
  text(
    'expectedLifePartner.expectedQuality',
    'প্রত্যাশিত গুণাবলি',
    'জীবনসঙ্গীর কোন গুণাবলি আপনার কাছে গুরুত্বপূর্ণ?',
  ),
  text('fatherName', 'পিতার নাম', 'আপনার পিতার নাম কী?', { max: 100 }),
  text('motherName', 'মাতার নাম', 'আপনার মাতার নাম কী?', { max: 100 }),
  text(
    'guardianPhone',
    'অভিভাবকের ফোন',
    'অভিভাবকের মোবাইল নম্বর কী? নিজের নম্বরের থেকে আলাদা নম্বর দিন।',
    { max: 30 },
  ),
  text('whatsapp', 'WhatsApp', 'আপনার WhatsApp নম্বর কী?', { max: 30 }),
  text('bloodGroup', 'রক্তের গ্রুপ', 'আপনার রক্তের গ্রুপ জানা থাকলে জানান।', {
    options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(
      (value) => ({ value, label: value }),
    ),
  }),
  text('address.presentAddress', 'বর্তমান ঠিকানা', 'আপনার বর্তমান ঠিকানা কী?'),
  text(
    'address.permanentAddress',
    'স্থায়ী ঠিকানা',
    'আপনার স্থায়ী ঠিকানা কী?',
  ),
  text(
    'address.extraInfo',
    'ঠিকানার অতিরিক্ত তথ্য',
    'ঠিকানা সম্পর্কে আরও কিছু জানাতে চান?',
  ),
  text(
    'educationInfo.highestEducationBoard',
    'বোর্ড / প্রতিষ্ঠান',
    'সর্বোচ্চ শিক্ষার বোর্ড বা প্রতিষ্ঠানের নাম কী?',
  ),
  text(
    'educationInfo.highestEducationGroup',
    'বিভাগ',
    'সর্বোচ্চ শিক্ষার বিভাগ বা বিষয় কী?',
  ),
  text(
    'educationInfo.highestEducationPassingYear',
    'পাসের বছর',
    'সর্বোচ্চ শিক্ষার পাসের বছর কী?',
  ),
  bool(
    'educationInfo.currentlyDoingHightEducation',
    'বর্তমানে পড়াশোনা',
    'এখন কি উচ্চশিক্ষায় পড়াশোনা করছেন?',
  ),
  text(
    'educationInfo.sSCPassingYear',
    'SSC পাসের বছর',
    'SSC বা সমমানের পাসের বছর কী?',
  ),
  text(
    'educationInfo.sSCPassingGroup',
    'SSC বিভাগ',
    'SSC বা সমমানের বিভাগ কী ছিল?',
  ),
  text('educationInfo.sSCResult', 'SSC ফলাফল', 'SSC বা সমমানের ফলাফল কী?'),
  text(
    'educationInfo.hSCPassingYear',
    'HSC পাসের বছর',
    'HSC বা সমমানের পাসের বছর কী?',
  ),
  text(
    'educationInfo.hSCPassingGroup',
    'HSC বিভাগ',
    'HSC বা সমমানের বিভাগ কী ছিল?',
  ),
  text('educationInfo.hSCResult', 'HSC ফলাফল', 'HSC বা সমমানের ফলাফল কী?'),
  text(
    'educationInfo.educationBackground',
    'শিক্ষার অতিরিক্ত তথ্য',
    'শিক্ষাজীবন সম্পর্কে আরও কিছু জানাতে চান?',
  ),
  bool('familyInfo.isFatherAlive', 'পিতা জীবিত', 'আপনার পিতা কি জীবিত আছেন?'),
  text('familyInfo.fathersProfession', 'পিতার পেশা', 'আপনার পিতার পেশা কী?'),
  bool('familyInfo.isMotherAlive', 'মাতা জীবিত', 'আপনার মাতা কি জীবিত আছেন?'),
  text('familyInfo.mothersProfession', 'মাতার পেশা', 'আপনার মাতার পেশা কী?'),
  num(
    'familyInfo.brotherCount',
    'ভাইয়ের সংখ্যা',
    'আপনার কতজন ভাই আছেন?',
    0,
    30,
  ),
  text(
    'familyInfo.brotherInformation',
    'ভাইয়ের তথ্য',
    'আপনার ভাইদের সম্পর্কে সংক্ষেপে জানান।',
  ),
  num('familyInfo.sisterCount', 'বোনের সংখ্যা', 'আপনার কতজন বোন আছেন?', 0, 30),
  text(
    'familyInfo.sisterInformation',
    'বোনের তথ্য',
    'আপনার বোনদের সম্পর্কে সংক্ষেপে জানান।',
  ),
  text(
    'familyInfo.familyAssetDetails',
    'পারিবারিক সম্পদ',
    'পারিবারিক সম্পদ সম্পর্কে কী জানাতে চান?',
  ),
  text(
    'familyInfo.familyReligiousCondition',
    'পরিবারের দ্বীনি পরিবেশ',
    'আপনার পরিবারের দ্বীনি পরিবেশ কেমন?',
  ),
  text(
    'personalInformation.womenNiqbYear',
    'নিকাব',
    'কত সময় ধরে নিকাব পরেন?',
    { gender: 'female' },
  ),
  text(
    'personalInformation.manBeard',
    'দাড়ি',
    'আপনার দাড়ি রাখা সম্পর্কে জানান।',
    { gender: 'male' },
  ),
  bool(
    'personalInformation.manClothAboveAnkels',
    'টাখনুর উপরে পোশাক',
    'টাখনুর উপরে পোশাক পরেন কি?',
    { gender: 'male' },
  ),
  text(
    'personalInformation.MissPrayerTime',
    'নামাজ কাজা',
    'নামাজ কাজা হওয়া সম্পর্কে আপনার অবস্থা জানান।',
  ),
  text(
    'personalInformation.maharaNonMahram',
    'মাহরাম ও নন-মাহরাম',
    'মাহরাম ও নন-মাহরাম সম্পর্কে কীভাবে সচেতন থাকেন?',
  ),
  text('personalInformation.fiqhFollow', 'ফিকহ', 'কোন ফিকহ অনুসরণ করেন?', {
    options: PROFILE_OPTIONS.fiqh,
  }),
  text(
    'personalInformation.digitalMedia',
    'ডিজিটাল মাধ্যম',
    'ডিজিটাল মাধ্যম কীভাবে ব্যবহার করেন?',
  ),
  text(
    'personalInformation.mentalOrPhysicalIssue',
    'স্বাস্থ্য',
    'স্বাস্থ্য সম্পর্কে জীবনসঙ্গীকে জানানো প্রয়োজন এমন কিছু থাকলে জানান। না চাইলে এড়িয়ে যান।',
  ),
  text(
    'personalInformation.specialWorkOfDeen',
    'দ্বীনি কাজ',
    'কোন বিশেষ দ্বীনি কাজে যুক্ত আছেন?',
  ),
  text(
    'personalInformation.majarBeliveStatus',
    'মাজার সম্পর্কে ধারণা',
    'মাজার সম্পর্কে আপনার ধারণা কী?',
  ),
  text(
    'personalInformation.islamicBookName',
    'ইসলামি বই',
    'আপনার পছন্দের ইসলামি বইগুলোর নাম কী?',
  ),
  text(
    'personalInformation.islamicScholarsName',
    'পছন্দের আলেম',
    'আপনার পছন্দের আলেমদের নাম কী?',
  ),
  text(
    'personalInformation.extraInfoHobby',
    'শখ ও আগ্রহ',
    'আপনার শখ ও আগ্রহগুলো কী?',
  ),
  text(
    'personalInformation.islamicStudy',
    'ধর্মীয় শিক্ষা',
    'আপনার ধর্মীয় শিক্ষাগত যোগ্যতা কী?',
    { options: PROFILE_OPTIONS.religiousEducation },
  ),
  text(
    'personalInformation.physicalStructure',
    'শারীরিক গঠন',
    'আপনার শারীরিক গঠন সম্পর্কে কী জানাতে চান?',
  ),
  text(
    'occupational.workingDetails',
    'পেশার বিস্তারিত',
    'আপনার কাজের ধরন ও কর্মস্থল সম্পর্কে সংক্ষেপে জানান।',
  ),
  text(
    'occupational.salary',
    'আয়',
    'আপনার আয় সম্পর্কে কী জানাতে চান? না চাইলে এড়িয়ে যান।',
  ),
  bool(
    'marriageInformationWomen.isGuardiansAgreed',
    'অভিভাবকের সম্মতি',
    'আপনার বিয়ের ব্যাপারে অভিভাবক কি সম্মত?',
    { gender: 'female' },
  ),
  text(
    'marriageInformationWomen.jobAfterMarriage',
    'বিয়ের পর চাকরি',
    'বিয়ের পর চাকরি সম্পর্কে আপনার মত কী?',
    { gender: 'female' },
  ),
  text(
    'marriageInformationWomen.studyAfterMarriage',
    'বিয়ের পর পড়াশোনা',
    'বিয়ের পর পড়াশোনা সম্পর্কে আপনার মত কী?',
    { gender: 'female' },
  ),
  text(
    'marriageInformationWomen.thoughtsOnMarriage',
    'বিয়ে সম্পর্কে ধারণা',
    'বিয়ে সম্পর্কে আপনার চিন্তাভাবনা কী?',
    { gender: 'female' },
  ),
  text(
    'marriageInformationWomen.polygamyConsentOptions',
    'একাধিক বিয়ে',
    'একাধিক বিয়ে সম্পর্কে আপনার মত কী?',
    { gender: 'female', options: PROFILE_OPTIONS.polygamy },
  ),
  text(
    'marriageInformationWomen.caringforChildren',
    'সন্তানের যত্ন',
    'সন্তানের যত্ন সম্পর্কে আপনার মত কী?',
    { gender: 'female' },
  ),
  text(
    'marriageInformationWomen.childCustody',
    'সন্তানের অভিভাবকত্ব',
    'সন্তানের অভিভাবকত্ব সম্পর্কে আপনার অবস্থা বা মত কী?',
    { gender: 'female' },
  ),
  bool(
    'marriageInformationMan.isGuardiansAgreed',
    'অভিভাবকের সম্মতি',
    'আপনার বিয়ের ব্যাপারে অভিভাবক কি সম্মত?',
    { gender: 'male' },
  ),
  text(
    'marriageInformationMan.wifeVailAfterMarriage',
    'স্ত্রীর পর্দা',
    'বিয়ের পর স্ত্রীর পর্দা সম্পর্কে আপনার মত কী?',
    { gender: 'male' },
  ),
  text(
    'marriageInformationMan.allowWifeStudyAfterMarriage',
    'স্ত্রীর পড়াশোনা',
    'বিয়ের পর স্ত্রীর পড়াশোনা সম্পর্কে আপনার মত কী?',
    { gender: 'male' },
  ),
  text(
    'marriageInformationMan.wifeJobAfterMarriage',
    'স্ত্রীর চাকরি',
    'বিয়ের পর স্ত্রীর চাকরি সম্পর্কে আপনার মত কী?',
    { gender: 'male' },
  ),
  text(
    'marriageInformationMan.livingPlaceAfterMarriage',
    'বিয়ের পর বাসস্থান',
    'বিয়ের পর কোথায় থাকার পরিকল্পনা করেছেন?',
    { gender: 'male' },
  ),
  text(
    'marriageInformationMan.expectedAnyGiftFromMarriage',
    'উপহার সম্পর্কে মত',
    'বিয়েতে উপহার বা কোনো দাবি সম্পর্কে আপনার মত কী?',
    { gender: 'male' },
  ),
  text(
    'marriageInformationMan.thoughtsOnMarriage',
    'বিয়ে সম্পর্কে ধারণা',
    'বিয়ে সম্পর্কে আপনার চিন্তাভাবনা কী?',
    { gender: 'male' },
  ),
  text(
    'expectedLifePartner.complexion',
    'জীবনসঙ্গীর ত্বকের রং',
    'জীবনসঙ্গীর ত্বকের রং সম্পর্কে আপনার পছন্দ কী?',
  ),
  text(
    'expectedLifePartner.height',
    'জীবনসঙ্গীর উচ্চতা',
    'জীবনসঙ্গীর উচ্চতার সীমা কত চান?',
  ),
  text(
    'expectedLifePartner.education',
    'জীবনসঙ্গীর শিক্ষা',
    'জীবনসঙ্গীর শিক্ষা সম্পর্কে আপনার পছন্দ কী?',
  ),
  text(
    'expectedLifePartner.district',
    'জীবনসঙ্গীর জেলা',
    'জীবনসঙ্গীর জেলা সম্পর্কে আপনার পছন্দ কী?',
  ),
  text(
    'expectedLifePartner.upazila',
    'জীবনসঙ্গীর উপজেলা',
    'জীবনসঙ্গীর উপজেলা সম্পর্কে আপনার পছন্দ কী?',
  ),
  text(
    'expectedLifePartner.maritalStatus',
    'জীবনসঙ্গীর বৈবাহিক অবস্থা',
    'জীবনসঙ্গীর বৈবাহিক অবস্থা সম্পর্কে আপনার পছন্দ কী?',
  ),
  text(
    'expectedLifePartner.profession',
    'জীবনসঙ্গীর পেশা',
    'জীবনসঙ্গীর পেশা সম্পর্কে আপনার পছন্দ কী?',
  ),
  text(
    'expectedLifePartner.financialCondition',
    'জীবনসঙ্গীর অর্থনৈতিক অবস্থা',
    'জীবনসঙ্গীর অর্থনৈতিক অবস্থা সম্পর্কে আপনার পছন্দ কী?',
  ),
  text(
    'howYouWannaGetMarried',
    'বিয়ে সম্পর্কে পরিকল্পনা',
    'আপনি কীভাবে বিয়ে করতে চান?',
  ),
];
export function answerSchema() {
  return z
    .object({
      status: z.enum(['answered', 'clarify', 'skip']),
      value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
      evidence: z.string().max(2000),
      reply: z.string().max(1000),
    })
    .strict();
}
export function validateAnswer(q: Question, value: unknown) {
  if (q.kind === 'text') {
    if (typeof value !== 'string') return null;
    const v = value.trim();
    if (v.length < (q.min || 1) || v.length > (q.max || 2000)) return null;
    if (q.options && !q.options.some((o) => o.value === v)) return null;
    return v;
  }
  if (q.kind === 'boolean') return typeof value === 'boolean' ? value : null;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < (q.min || 0) ||
    value > (q.max || 300)
  )
    return null;
  if (q.path !== 'personalInformation.height' && !Number.isInteger(value))
    return null;
  return value;
}
