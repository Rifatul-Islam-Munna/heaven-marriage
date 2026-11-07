import {
  locationQuestionApplies, questionApplies, readQuestionAnswer,
  type ProfileQuestion, type ProfileQuestionSchema,
} from './profile-questions';

export type AdminBiodataSectionProgress = {
  id: number; title: string; answered: number; total: number;
  required: number; requiredMissing: number; percentage: number;
};

/** Progress is based on saved + currently edited answers, never on navigation history. */
export function adminAnswerIsComplete(question: ProfileQuestion, value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (question.type === 'checkbox') return question.required ? value === true : typeof value === 'boolean';
  if (question.type === 'number') return Number.isFinite(Number(value)) && Number(value) !== 0 && value !== '';
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function getAdminBiodataProgress(
  schema: ProfileQuestionSchema,
  profile: Record<string, any>,
): AdminBiodataSectionProgress[] {
  return schema.sections.map(section => {
    const questions = schema.questions.filter(q =>
      q.section === section.id && !q.locked &&
      questionApplies(q, profile.gender) && locationQuestionApplies(q, profile));
    const answered = questions.filter(q => adminAnswerIsComplete(q, readQuestionAnswer(profile, q))).length;
    const required = questions.filter(q => q.required);
    const requiredMissing = required.filter(q => !adminAnswerIsComplete(q, readQuestionAnswer(profile, q))).length;
    return {
      id: section.id, title: section.title,
      answered, total: questions.length,
      required: required.length, requiredMissing,
      percentage: questions.length ? Math.round(answered / questions.length * 100) : 100,
    };
  }).filter(section => section.total > 0);
}
