import type { User } from "@/@types/user";
import { defaultQuestions, getMissingQuestions, type ProfileQuestionSchema } from "./profile-questions";

// Compatibility export. Questions are configured from the admin panel rather
// than a second, hard-coded list that can contradict current requirements.
export const requiredSteps = defaultQuestions.sections.map(section =>
  defaultQuestions.questions.filter(q=>q.section===section.id&&q.enabled&&q.required)
    .map(q=>q.path||q.id),
);

export function missingFields(data: Partial<User>, step?: number,
  schema: ProfileQuestionSchema=defaultQuestions) {
  return getMissingQuestions(data as Record<string,any>,schema,step);
}
