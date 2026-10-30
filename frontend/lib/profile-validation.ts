import type { User } from "@/@types/user";
export const requiredSteps = [
  [
    "name",
    "gender",
    "maritalStatus",
    "age",
    "weight",
    "nationality",
    "personalInformation.height",
    "personalInformation.skinTone",
  ],
  ["address.district", "address.upazila"],
  ["educationInfo.educationMethod", "educationInfo.highestEducation"],
  [
    "personalInformation.outsideClothes",
    "personalInformation.prayerFiverTimeFrom",
    "personalInformation.reciteQuran",
  ],
  ["familyInfo.familyFinancial"],
  ["occupational.profession"],
  [],
  ["expectedLifePartner.age", "expectedLifePartner.expectedQuality"],
  [],
  [
    "pledge.youGordianKnowsThis",
    "pledge.allTheInformationTrue",
    "pledge.anyMisInformationWeAreNotKnowing",
  ],
];
export function missingFields(data: Partial<User>, step?: number) {
  const fields =
    step === undefined ? requiredSteps.flat() : requiredSteps[step];
  return fields.filter((path) => {
    const value = path
      .split(".")
      .reduce<unknown>(
        (v, k) =>
          v && typeof v === "object"
            ? (v as Record<string, unknown>)[k]
            : undefined,
        data,
      );
    return (
      value === undefined ||
      value === null ||
      value === "" ||
      value === 0 ||
      (path.startsWith("pledge.") && value !== true)
    );
  });
}
