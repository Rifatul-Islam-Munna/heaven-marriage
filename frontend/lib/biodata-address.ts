import type { User } from "@/@types/user";
import { defaultQuestions, readQuestionAnswer, type ProfileQuestion } from "./profile-questions";

export type AddressKind = "presentAddress" | "permanentAddress";

/** Older profiles can store these answers in custom questions. */
export function addressQuestionKind(question: ProfileQuestion): AddressKind | undefined {
  if (question.path) {
    if (question.path === "address.presentAddress") return "presentAddress";
    if (question.path === "address.permanentAddress") return "permanentAddress";
    return undefined;
  }
  const label = [question.publicLabel, question.question, question.legacyKey]
    .filter(Boolean).join(" ").normalize("NFC").replace(/[\sঃ:?!।]/g, "").toLowerCase();
  if (/বর্তমান(?:ঠিকানা|অবস্থান)|presentaddress|currentaddress/.test(label)) return "presentAddress";
  if (/স্থায়ীঠিকানা|স্থায়ীঠিকানা|permanentaddress/.test(label)) return "permanentAddress";
}

export function savedBiodataAddress(user: User, kind: AddressKind): string {
  const schema = user.publicQuestionSchema || user.profileQuestionSchema || defaultQuestions;
  const isPublic = !!user.publicQuestionSchema;
  const questions = schema.questions.filter(question =>
    addressQuestionKind(question) === kind && question.enabled &&
    (!isPublic || (question.showPublic && question.section === 1)) &&
    (question.gender === "both" || question.gender === user.gender));
  // Read explicit answers before constructing any location fallback.
  for (const question of questions.sort((a, b) => Number(!a.path) - Number(!b.path) || a.order - b.order)) {
    const value = user.publicAnswers?.[question.id] ?? readQuestionAnswer(user, question);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  if (!isPublic) {
    const direct = user.address?.[kind];
    if (direct?.trim()) return direct.trim();
    for (const [label, value] of Object.entries(user.customFields || {})) {
      const question = { question: label, publicLabel: label } as ProfileQuestion;
      if (addressQuestionKind(question) === kind && value?.trim()) return value.trim();
    }
  }
  return "";
}
