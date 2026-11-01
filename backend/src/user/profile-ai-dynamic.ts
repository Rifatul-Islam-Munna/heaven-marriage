import {
  answerForQuestion,
  usesSeparateAnswerStorage,
  type ProfileQuestion,
} from '../profile-questions/question-config.service';
import type { Question } from './profile-ai-fields';

/** Session/skip key for admin-created questions; never used as a MongoDB path. */
export const DYNAMIC_PREFIX = 'dynamic:';

const unanswered = (value: unknown) =>
  value === undefined || value === null || value === '' ||
  (Array.isArray(value) && value.length === 0);

/**
 * Next admin-configured question stored in user.dynamicAnswers that this member
 * has neither answered nor skipped, in builder order (section, then order).
 */
export function nextDynamicQuestion(
  profile: any,
  skipped: string[],
  questions: readonly ProfileQuestion[],
): Question | undefined {
  const q = questions.find((item) =>
    item.enabled && !item.locked && usesSeparateAnswerStorage(item) &&
    (item.gender === 'both' || item.gender === profile.gender) &&
    !skipped.includes(DYNAMIC_PREFIX + item.id) &&
    unanswered(answerForQuestion(profile, item)));
  if (!q) return undefined;
  const multiple = q.type === 'multi_checkbox';
  return {
    path: DYNAMIC_PREFIX + q.id,
    label: q.publicLabel || q.question,
    question: q.question,
    kind: q.type === 'number' ? 'number' : q.type === 'checkbox' ? 'boolean' : 'text',
    ...(q.options.length ? { options: q.options.map((o) => ({ value: o.value, label: o.label })) } : {}),
    dynamicId: q.id,
    multiple,
    ...(multiple
      ? { hint: 'Several answers are allowed. Return the EXACT allowed option values joined with commas.' }
      : q.type === 'checkbox' ? { hint: 'Yes/no question: return true or false.' } : {}),
  };
}

/**
 * Normalise the model's value to what this dynamic question accepts, or null.
 * Option labels are mapped to their stored values; unknown choices are rejected.
 */
export function dynamicAnswerValue(
  q: ProfileQuestion,
  value: unknown,
): string | number | boolean | string[] | null {
  const pick = (raw: string) => {
    const v = raw.trim().toLowerCase();
    return q.options.find((o) => o.value.toLowerCase() === v || o.label.trim().toLowerCase() === v)?.value;
  };
  switch (q.type) {
    case 'checkbox':
      return typeof value === 'boolean' ? value : null;
    case 'number': {
      const n = typeof value === 'number' ? value
        : typeof value === 'string' && value.trim() ? Number(value) : NaN;
      return Number.isFinite(n) ? n : null;
    }
    case 'multi_checkbox': {
      const parts = (Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,;\n]/) : [])
        .map((x) => String(x).trim()).filter(Boolean);
      if (!parts.length) return null;
      if (!q.options.length) return parts.slice(0, 100);
      const picked = parts.map(pick);
      return picked.every((x): x is string => !!x) ? [...new Set(picked)] : null;
    }
    case 'select':
    case 'dropdown': {
      if (typeof value !== 'string' || !value.trim()) return null;
      if (!q.options.length) return value.trim().slice(0, 5000);
      return pick(value) ?? null;
    }
    default: {
      if (typeof value !== 'string' && typeof value !== 'number') return null;
      const text = String(value).trim();
      return text && text.length <= 5000 ? text : null;
    }
  }
}
