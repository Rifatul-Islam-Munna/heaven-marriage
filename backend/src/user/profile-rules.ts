import { BadRequestException } from '@nestjs/common';

export const PROFILE_FIELDS = [
  'name',
  'gender',
  'maritalStatus',
  'age',
  'bloodGroup',
  'weight',
  'nationality',
  'whatsapp',
  'guardianPhone',
  'fatherName',
  'motherName',
  'address',
  'educationInfo',
  'familyInfo',
  'personalInformation',
  'occupational',
  'marriageInformationWomen',
  'marriageInformationMan',
  'expectedLifePartner',
  'pledge',
  'customFields',
  'howYouWannaGetMarried',
] as const;
export const STEP_REQUIRED = [
  [
    'name',
    'gender',
    'maritalStatus',
    'age',
    'weight',
    'nationality',
    'personalInformation.height',
    'personalInformation.skinTone',
  ],
  ['address.district', 'address.upazila'],
  ['educationInfo.educationMethod', 'educationInfo.highestEducation'],
  [
    'personalInformation.outsideClothes',
    'personalInformation.prayerFiverTimeFrom',
    'personalInformation.reciteQuran',
  ],
  ['familyInfo.familyFinancial'],
  ['occupational.profession'],
  [],
  ['expectedLifePartner.age', 'expectedLifePartner.expectedQuality'],
  [],
  [
    'pledge.youGordianKnowsThis',
    'pledge.allTheInformationTrue',
    'pledge.anyMisInformationWeAreNotKnowing',
  ],
];
export const valueAt = (u: any, p: string) =>
  p.split('.').reduce((v, k) => v?.[k], u);
export function completion(u: any) {
  const fields = STEP_REQUIRED.flat();
  const missing = fields.filter((p) => {
    const v = valueAt(u, p);
    return (
      v === undefined ||
      v === null ||
      v === '' ||
      v === 0 ||
      (p.startsWith('pledge.') && v !== true)
    );
  });
  return {
    percentage: Math.round(
      (100 * (fields.length - missing.length)) / fields.length,
    ),
    remaining: missing,
    nextStep: STEP_REQUIRED.findIndex((s) =>
      s.some((p) => missing.includes(p)),
    ),
  };
}
export function publicProfile(u: any, unlocked = false) {
  // Allowlist nested fields: arbitrary custom answers can contain identity/contact data.
  const pick = (v: any, keys: string[]) =>
    Object.fromEntries(
      keys.filter((k) => v?.[k] !== undefined).map((k) => [k, v[k]]),
    );
  const out: any = pick(u, [
    '_id',
    'userId',
    'age',
    'gender',
    'maritalStatus',
    'bloodGroup',
    'weight',
    'nationality',
    'isPublished',
    'isPublishFromAdmin',
    'isSubscriber',
    'verificationStatus',
    'createdAt',
  ]);
  out.name = unlocked ? u.name : undefined;
  out.identityUnlocked = unlocked;
  out.accountType = u.isSubscriber ? 'premium' : 'general';
  out.isVerified =
    u.verificationStatus === 'approved' && u.isPublishFromAdmin === true;
  out.address = pick(u.address, ['district', 'upazila']);
  out.educationInfo = pick(u.educationInfo, [
    'educationMethod',
    'highestEducation',
    'highestEducationBoard',
    'highestEducationGroup',
    'highestEducationPassingYear',
    'sSCPassingYear',
    'sSCPassingGroup',
    'sSCResult',
    'hSCPassingYear',
    'hSCPassingGroup',
    'hSCResult',
    'currentlyDoingHightEducation',
  ]);
  out.familyInfo = pick(u.familyInfo, [
    'isFatherAlive',
    'isMotherAlive',
    'fathersProfession',
    'mothersProfession',
    'brotherCount',
    'sisterCount',
    'familyFinancial',
    'familyReligiousCondition',
  ]);
  out.personalInformation = pick(u.personalInformation, [
    'outsideClothes',
    'womenNiqbYear',
    'manBeard',
    'manClothAboveAnkels',
    'prayerFiverTimeFrom',
    'MissPrayerTime',
    'maharaNonMahram',
    'reciteQuran',
    'fiqhFollow',
    'digitalMedia',
    'mentalOrPhysicalIssue',
    'specialWorkOfDeen',
    'majarBeliveStatus',
    'islamicBookName',
    'islamicScholarsName',
    'extraInfoHobby',
    'height',
    'skinTone',
    'islamicStudy',
    'physicalStructure',
  ]);
  out.occupational = pick(u.occupational, [
    'profession',
    'workingDetails',
    'salary',
  ]);
  out.marriageInformationWomen = pick(u.marriageInformationWomen, [
    'isGuardiansAgreed',
    'jobAfterMarriage',
    'studyAfterMarriage',
    'thoughtsOnMarriage',
    'polygamyConsentOptions',
    'caringforChildren',
    'childCustody',
  ]);
  out.marriageInformationMan = pick(u.marriageInformationMan, [
    'isGuardiansAgreed',
    'wifeVailAfterMarriage',
    'allowWifeStudyAfterMarriage',
    'wifeJobAfterMarriage',
    'livingPlaceAfterMarriage',
    'expectedAnyGiftFromMarriage',
    'thoughtsOnMarriage',
  ]);
  out.expectedLifePartner = pick(u.expectedLifePartner, [
    'age',
    'complexion',
    'height',
    'education',
    'district',
    'upazila',
    'maritalStatus',
    'profession',
    'financialCondition',
    'expectedQuality',
  ]);
  if (unlocked)
    Object.assign(
      out,
      pick(u, [
        'name',
        'fatherName',
        'motherName',
        'phoneNumber',
        'whatsapp',
        'guardianPhone',
      ]),
    );
  if (!unlocked) {
    const secrets = [
      u.name,
      u.fatherName,
      u.motherName,
      u.phoneNumber,
      u.whatsapp,
      u.guardianPhone,
      u.email,
      u.address?.presentAddress,
      u.address?.permanentAddress,
    ].filter((v) => typeof v === 'string' && v.length >= 3);
    const clean = (v: any): any => {
      if (typeof v === 'string') {
        for (const secret of secrets) v = v.split(secret).join('[সংরক্ষিত]');
        return v
          .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[সংরক্ষিত]')
          .replace(/(?:\+?\d[\d\s()-]{8,}\d)/g, '[সংরক্ষিত]');
      }
      if (v instanceof Date || v?.toHexString) return v;
      if (Array.isArray(v)) return v.map(clean);
      if (v && typeof v === 'object')
        return Object.fromEntries(
          Object.entries(v).map(([k, x]) => [k, clean(x)]),
        );
      return v;
    };
    return clean(out);
  }
  return out;
}
export function editableProfile(input: any) {
  const out: any = {};
  for (const k of PROFILE_FIELDS) if (input[k] !== undefined) out[k] = input[k];
  // Reject MongoDB operators and dotted keys at every depth.
  const validate = (v: any) => {
    if (v && typeof v === 'object')
      for (const [k, x] of Object.entries(v)) {
        if (
          k.startsWith('$') ||
          k.includes('.') ||
          ['__proto__', 'constructor', 'prototype'].includes(k)
        )
          throw new BadRequestException('Invalid field');
        validate(x);
      }
  };
  validate(out);
  if (
    out.guardianPhone &&
    out.guardianPhone.replace(/\D/g, '') ===
      String(input.phoneNumber || '').replace(/\D/g, '')
  )
    throw new BadRequestException('নিজের ও অভিভাবকের ফোন নম্বর আলাদা হতে হবে');
  return out;
}
export const visibleFilter = {
  isPublished: true,
  isPublishFromAdmin: true,
  verificationStatus: { $nin: ['rejected', 'suspended'] },
};

export function adminFilter(q: any) {
  const f: any = {};
  if (q.query?.trim()) f.$text = { $search: q.query.trim() };
  if (q.gender && q.gender !== 'all') f.gender = q.gender;
  if (q.isPublished && q.isPublished !== 'all')
    f.isPublishFromAdmin = q.isPublished === 'true';
  for (const [key, path] of Object.entries({
    districtId: 'address.district',
    upazilaId: 'address.upazila',
    country: 'nationality',
  }))
    if (q[key]) f[path] = q[key];
  for (const [key, path] of Object.entries({
    maritalStatus: 'maritalStatus',
    educationMedium: 'educationInfo.educationMethod',
    religiousEducation: 'personalInformation.islamicStudy',
    skinColor: 'personalInformation.skinTone',
    fiqh: 'personalInformation.fiqhFollow',
    profession: 'occupational.profession',
    economicStatus: 'familyInfo.familyFinancial',
  }))
    if (q[key]?.length) f[path] = { $in: q[key] };
  if (q.ageMin !== undefined || q.ageMax !== undefined) {
    f.age = {};
    if (q.ageMin !== undefined) f.age.$gte = q.ageMin;
    if (q.ageMax !== undefined) f.age.$lte = q.ageMax;
  }
  if (q.heightMin !== undefined || q.heightMax !== undefined) {
    f['personalInformation.height'] = {};
    if (q.heightMin !== undefined)
      f['personalInformation.height'].$gte = q.heightMin;
    if (q.heightMax !== undefined)
      f['personalInformation.height'].$lte = q.heightMax;
  }
  if (q.accountType === 'premium') f.isSubscriber = true;
  else if (q.accountType === 'general') f.isSubscriber = { $ne: true };
  if (
    ['pending', 'approved', 'rejected', 'suspended'].includes(
      q.verificationStatus,
    )
  )
    f.verificationStatus = q.verificationStatus;
  if (['draft', 'submitted'].includes(q.biodataStatus))
    f.biodataStatus = q.biodataStatus;
  if (q.category?.includes('verified')) f.verificationStatus = 'approved';
  if (q.category?.includes('general')) f.isSubscriber = { $ne: true };
  for (const [key, path] of Object.entries({
    phoneVerified: 'isPhoneVerified',
    emailVerified: 'isEmailVerified',
  })) {
    if (q[key] === 'true') f[path] = true;
    if (q[key] === 'false') f[path] = { $ne: true };
  }
  for (const [key, path] of Object.entries({
    hasPhone: 'phoneNumber',
    hasEmail: 'email',
  })) {
    if (q[key] === 'true') f[path] = { $type: 'string', $ne: '' };
    if (q[key] === 'false')
      f.$and = [
        ...(f.$and || []),
        {
          $or: [
            { [path]: { $exists: false } },
            { [path]: null },
            { [path]: '' },
          ],
        },
      ];
  }
  if (q.role && q.role !== 'all') f.role = q.role;
  if (q.registeredFrom || q.registeredTo) {
    f.createdAt = {};
    if (q.registeredFrom) f.createdAt.$gte = new Date(q.registeredFrom);
    if (q.registeredTo) {
      const end = new Date(q.registeredTo);
      end.setUTCHours(23, 59, 59, 999);
      f.createdAt.$lte = end;
    }
    if (f.createdAt.$gte > f.createdAt.$lte)
      throw new BadRequestException('Invalid registration date range');
  }
  for (const [lo, hi, path] of [
    ['connectionsMin', 'connectionsMax', 'numberOfConnections'],
    ['ageMin', 'ageMax', 'age'],
    ['heightMin', 'heightMax', 'personalInformation.height'],
  ]) {
    if (q[lo] !== undefined && q[hi] !== undefined && q[lo] > q[hi])
      throw new BadRequestException('Minimum must not exceed maximum');
    if (
      path === 'numberOfConnections' &&
      (q[lo] !== undefined || q[hi] !== undefined)
    ) {
      f[path] = {};
      if (q[lo] !== undefined) f[path].$gte = q[lo];
      if (q[hi] !== undefined) f[path].$lte = q[hi];
    }
  }
  return f;
}
export function adminSort(sort?: string): Record<string, 1 | -1> {
  const fields: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
    ageAsc: { age: 1, _id: 1 },
    ageDesc: { age: -1, _id: -1 },
    connectionsAsc: { numberOfConnections: 1, _id: 1 },
    connectionsDesc: { numberOfConnections: -1, _id: -1 },
  };
  return fields[sort || 'newest'] || fields.newest;
}

export function samePhone(a: string, b: string) {
  const norm = (s: string) =>
    String(s || '')
      .replace(/[০-৯]/g, (n) => String('০১২৩৪৫৬৭৮৯'.indexOf(n)))
      .replace(/\D/g, '')
      .replace(/^880/, '0');
  return !!a && !!b && norm(a) === norm(b);
}
