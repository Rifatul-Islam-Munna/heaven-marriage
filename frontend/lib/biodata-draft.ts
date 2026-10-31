/**
 * Autosave must never POST a complete user record. The returned profile includes
 * account fields, server-only metadata and possibly stale/archived answers.
 * Only send changes to biodata fields; keep nested objects as small patches.
 */
export const BIODATA_DRAFT_FIELDS = [
  "name", "gender", "maritalStatus", "age", "bloodGroup", "weight",
  "nationality", "whatsapp", "guardianPhone", "fatherName", "motherName",
  "address", "educationInfo", "familyInfo", "personalInformation",
  "occupational", "marriageInformationWomen", "marriageInformationMan",
  "expectedLifePartner", "pledge", "customFields", "dynamicAnswers",
  "howYouWannaGetMarried",
] as const;

const nested = new Set<string>([
  "address", "educationInfo", "familyInfo", "personalInformation",
  "occupational", "marriageInformationWomen", "marriageInformationMan",
  "expectedLifePartner", "pledge", "customFields", "dynamicAnswers",
]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeValue(value: unknown): unknown {
  // JSON requests cannot represent undefined. Clearing a field sends null;
  // the server already treats nullable draft fields as optional.
  return value === undefined ? null : value;
}

export function diffBiodataDraft(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  for (const key of BIODATA_DRAFT_FIELDS) {
    const before = previous[key];
    const after = next[key];
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    if (nested.has(key) && record(after) && (record(before) || before === undefined || before === null)) {
      const old = record(before) ? before : {};
      const fields: Record<string, unknown> = {};
      for (const [field, value] of Object.entries(after)) {
        if (JSON.stringify(old[field]) !== JSON.stringify(value)) {
          fields[field] = safeValue(value);
        }
      }
      for (const field of Object.keys(old)) {
        if (!Object.hasOwn(after, field)) fields[field] = null;
      }
      if (Object.keys(fields).length) changes[key] = fields;
    } else {
      changes[key] = safeValue(after);
    }
  }
  return changes;
}

export function applyBiodataDraft(
  profile: Record<string, unknown>,
  changes: Record<string, unknown>,
): Record<string, unknown> {
  const updated = { ...profile };
  for (const key of BIODATA_DRAFT_FIELDS) {
    if (!Object.hasOwn(changes, key)) continue;
    const value = changes[key];
    if (nested.has(key) && record(value)) {
      updated[key] = { ...(record(updated[key]) ? updated[key] : {}), ...value };
    } else {
      updated[key] = value;
    }
  }
  return updated;
}

export function hasBiodataChanges(changes: Record<string, unknown>): boolean {
  return Object.keys(changes).length > 0;
}
