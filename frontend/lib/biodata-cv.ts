import type { User } from "@/@types/user";
import { currentPublicLabel } from "./biodata-public-label";
import { visiblePublicAnswer } from "./biodata-visible-answer";
import { profileQuestionOptions } from "./profile-question-options";
import {
  defaultQuestions, questionApplies, questionDisplayValue,
  questionUsesSeparateStorage, readQuestionAnswer, type ProfileQuestion,
} from "./profile-questions";

export interface BiodataCvOptions {
  includeContactNumber?: boolean;
  format?: "short" | "long";
}

const contactPaths = new Set(["phoneNumber", "whatsapp", "guardianPhone"]);
const identityPaths = new Set(["name", "fatherName", "motherName"]);
const privatePaths = new Set(["email", "password"]);

/** Resolve copy text through the same question IDs and answer storage as the editor. */
export function biodataCvFields(user: User, options: BiodataCvOptions) {
  const schema = user.publicQuestionSchema || user.profileQuestionSchema || defaultQuestions;
  const used = new Set<string>();
  const allowed = (q: ProfileQuestion) => questionApplies(q, user.gender) && q.showPublic &&
    !privatePaths.has(q.path || "") &&
    (!contactPaths.has(q.path || "") || options.includeContactNumber === true) &&
    (!identityPaths.has(q.path || "") || user.identityUnlocked !== false);
  const answer = (q: ProfileQuestion) => visiblePublicAnswer(
    Object.prototype.hasOwnProperty.call(user.publicAnswers || {}, q.id)
      ? user.publicAnswers?.[q.id] : readQuestionAnswer(user, q),
  );
  const display = (q: ProfileQuestion, value: unknown) => questionDisplayValue(value, {
    ...q, options: profileQuestionOptions(q, user.gender, user),
  });
  const label = (q: ProfileQuestion, fallback: string) => {
    const text = currentPublicLabel(q, fallback, user.gender).trim().replace(/[ঃ:]+$/u, "");
    return text ? `${text}ঃ` : fallback;
  };
  const line = (q: ProfileQuestion, fallback: string, format?: (value: unknown) => string) => {
    used.add(q.id);
    if (!allowed(q)) return "";
    const raw = answer(q);
    if (raw === undefined || raw === null || raw === "") return "";
    const customChoices = q.options.length > 0 && ["select", "dropdown", "multi_checkbox"].includes(q.type);
    const value = format && !questionUsesSeparateStorage(q) && !customChoices ? format(raw) : display(q, raw);
    return value.trim() ? `*${label(q, fallback)}* ${value.replace(/\s+/g, " ").trim()}` : "";
  };
  return {
    schema,
    field(path: string, fallback: string, format?: (value: unknown) => string) {
      const q = schema.questions.find(row => row.path === path);
      return q ? line(q, fallback, format) : "";
    },
    extras() {
      return schema.questions.filter(q => !used.has(q.id) && (!q.path || questionUsesSeparateStorage(q)))
        .sort((a, b) => a.section - b.section || a.order - b.order)
        .map(q => line(q, q.question)).filter(Boolean);
    },
    sections() {
      return schema.sections.map(section => {
        const rows = schema.questions.filter(q => q.section === section.id)
          .sort((a, b) => a.order - b.order).map(q => line(q, q.question)).filter(Boolean);
        return rows.length ? [`*${section.title}*`, ...rows].join("\n") : "";
      }).filter(Boolean);
    },
  };
}
