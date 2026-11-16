import { defaultQuestions, type ProfileQuestion } from "./profile-questions";

/** Use the latest admin label; fall back to the edited question if the
 * original built-in public label was never updated. */
export function currentPublicLabel(q: ProfileQuestion | undefined, fallback: string, gender?: string) {
  if (!q) return fallback;
  const original = defaultQuestions.questions.find(row => row.id === q.id);
  const renamed = (original && q.question !== original.question &&
    (!q.publicLabel || q.publicLabel === original.publicLabel)) ||
    (q.legacyKey && q.question !== q.legacyKey && q.publicLabel === q.legacyKey);
  const selected = (renamed ? q.question : q.publicLabel || q.question) || fallback;
  // This is the biodata owner's age; never describe a woman as a groom.
  if (q.path === "age" && gender === "female") return selected.replaceAll("পাত্রের", "পাত্রীর");
  if (q.path === "age" && gender === "male") return selected.replaceAll("পাত্রীর", "পাত্রের");
  return selected;
}
