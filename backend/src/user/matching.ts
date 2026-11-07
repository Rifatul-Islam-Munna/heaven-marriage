/**
 * Explainable biodata matching. No embeddings, external APIs, or ML models.
 * Only explicit partner preferences and comparable, public profile fields count.
 * Unknown answers are NOT classified as mismatches, and award no points.
 */
export type MatchKey =
  | 'age' | 'height' | 'complexion' | 'education' | 'district'
  | 'upazila' | 'maritalStatus' | 'profession' | 'financialCondition';

export type MatchStatus = 'matched' | 'mismatched' | 'unknown';
export interface MatchCriterion {
  key: MatchKey;
  label: string;
  expected: string;
  actual: string | null;
  status: MatchStatus;
  weight: number;
}
export interface MatchResult {
  profile: Record<string, any>;
  score: number | null;
  coverage: number;
  assessedCount: number;
  matchedCount: number;
  mismatchedCount: number;
  unknownCount: number;
  criteria: MatchCriterion[];
  reasons: string[];
  mismatches: string[];
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const DEFAULT_WEIGHTS: Record<MatchKey, number> = {
  age: 3, height: 2, complexion: 1, education: 2, district: 2,
  upazila: 1, maritalStatus: 3, profession: 2, financialCondition: 2,
};
const ALIASES: Record<string, string[]> = {
  'unmarried': ['অবিবাহিত'],
  'divorced (with children)': ['ডিভোর্স্ড (সন্তান আছে)', 'ডিভোর্সী (সন্তান আছে)', 'divorced (with children)'],
  'divorced (no children)': ['ডিভোর্স্ড (সন্তান নাই)', 'ডিভোর্সী (সন্তান নেই)', 'divorced (without children)'],
  'widower (with children)': ['বিপত্নীক (সন্তান আছে)'],
  'widower (no children)': ['বিপত্নীক (সন্তান নাই)'],
  'widow (with children)': ['বিধবা (সন্তান আছে)'],
  'widow (without children)': ['বিধবা (সন্তান নেই)'],
  'very_fair': ['উজ্জ্বল ফর্সা'],
  'fair': ['ফর্সা'],
  'bright_tan': ['bright_tan_male', 'bright_tan_female', 'উজ্জ্বল শ্যামলা', 'উজ্জ্বল শ্যামলী'],
  'tan': ['tan_male', 'tan_female', 'শ্যামলা', 'শ্যামলী'],
  'dark': ['কালো'],
  'upper': ['উচ্চবিত্ত'],
  'upper_middle': ['উচ্চ-মধ্যবিত্ত'],
  'middle': ['মধ্যবিত্ত'],
  'lower_middle': ['নিম্ন-মধ্যবিত্ত'],
  'lower': ['নিম্নবিত্ত'],
  'doctor': ['ডাক্তার'],
  'engineer': ['ইঞ্জিনিয়ার', 'ইঞ্জিনিয়ার'],
  'teacher': ['শিক্ষক'],
  'businessman': ['ব্যবসায়ী', 'ব্যবসায়ী'],
  'govt-job': ['সরকারি চাকরি'],
  'private-job': ['বেসরকারি চাকরি'],
  'student': ['ছাত্র', 'ছাত্রী', 'ছাত্র/ছাত্রী'],
  'housewife': ['গৃহিণী'],
  'business': ['ব্যবসা'],
  'job': ['চাকরি'],
  'agriculture': ['কৃষি'],
  'expatriate': ['প্রবাস'],
  'freelance': ['ফ্রিল্যান্স'],
  'technical': ['কারিগরি'],
  'no-income': ['আয় নেই', 'আয় নেই'],
  'dhaka': ['ঢাকা'],
  'chattogram': ['চট্টগ্রাম', 'chittagong'],
  'sylhet': ['সিলেট'],
  'rajshahi': ['রাজশাহী'],
  'khulna': ['খুলনা'],
  'barishal': ['বরিশাল', 'barisal'],
  'rangpur': ['রংপুর'],
  'mymensingh': ['ময়মনসিংহ', 'ময়মনসিংহ'],
  'gazipur': ['গাজীপুর'],
  'narayanganj': ['নারায়ণগঞ্জ', 'নারায়ণগঞ্জ'],
};
const SYNONYMS = new Map<string, string>();
function normalize(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[০-৯]/g, (digit) => String(BN_DIGITS.indexOf(digit)))
    .trim().toLowerCase().replace(/\s+/g, ' ');
}
for (const [canonical, alternatives] of Object.entries(ALIASES)) {
  for (const value of [canonical, ...alternatives])
    SYNONYMS.set(normalize(value), canonical);
}
function canonical(value: unknown): string {
  const text = normalize(value);
  return SYNONYMS.get(text) || text;
}
const ANY = new Set(['all', 'any', 'no preference', 'যেকোনো', 'যে কোনো', 'সকল', 'সব', 'প্রযোজ্য নয়', 'প্রযোজ্য না']);
function hasPreference(value: unknown): boolean {
  const v = normalize(value);
  return !!v && !ANY.has(v) && v !== 'n/a' && v !== '-';
}
function alternatives(value: unknown): string[] {
  return String(value ?? '').split(/[,;|/।]|\s+অথবা\s+|\s+or\s+/i)
    .map(canonical).filter(Boolean);
}
function comparable(expected: unknown, actual: unknown): boolean {
  const value = canonical(actual);
  return !!value && alternatives(expected).includes(value);
}
function digits(value: unknown): number[] {
  return (normalize(value).match(/\d+(?:\.\d+)?/g) || [])
    .map(Number).filter(Number.isFinite);
}
function numberRange(value: unknown): [number, number] | null {
  const values = digits(value);
  if (values.length === 1) return [values[0], values[0]];
  if (values.length === 2) return [Math.min(...values), Math.max(...values)];
  return null;
}
function heightInches(value: unknown): number | null {
  // Height dropdown uses '5.6' for 5'6". 5.1 as a NUMBER is ambiguous:
  // it can be 5'1" or a rounded 5'10", so never claim an exact match.
  if (typeof value === 'number' && String(value).endsWith('.1')) return null;
  const text = normalize(value);
  const feetAndInches = text.match(/^([4-7])\s*(?:ফুট|ফিট|feet|ft|')\s*(\d{1,2})?\s*(?:ইঞ্চি|inch|in|")?$/);
  const dotted = text.match(/^([4-7])\.(\d{1,2})$/);
  const feet = feetAndInches ? Number(feetAndInches[1]) : dotted ? Number(dotted[1]) : null;
  const inch = feetAndInches ? Number(feetAndInches[2] || 0) : dotted ? Number(dotted[2]) : null;
  if (feet === null || inch === null || inch > 11) return null;
  return feet * 12 + inch;
}
function heightRange(value: unknown): [number, number] | null {
  const text = normalize(value);
  if (heightInches(text) !== null) {
    const h = heightInches(text)!;
    return [h, h];
  }
  const tokens = text.match(/[4-7]\s*(?:ফুট|ফিট|feet|ft|')\s*\d{0,2}\s*(?:ইঞ্চি|inch|in|")?|[4-7]\.\d{1,2}/g);
  if (!tokens || tokens.length !== 2) return null;
  const values = tokens.map(heightInches);
  if (values.some((x) => x === null)) return null;
  return [Math.min(...(values as number[])), Math.max(...(values as number[]))];
}
const SPEC: {
  key: MatchKey; label: string; path: string;
  kind: 'choice' | 'age' | 'height';
}[] = [
  { key: 'age', label: 'বয়স', path: 'age', kind: 'age' },
  { key: 'height', label: 'উচ্চতা', path: 'personalInformation.height', kind: 'height' },
  { key: 'complexion', label: 'গাত্রবর্ণ', path: 'personalInformation.skinTone', kind: 'choice' },
  { key: 'education', label: 'শিক্ষাগত যোগ্যতা', path: 'educationInfo.highestEducation', kind: 'choice' },
  { key: 'district', label: 'জেলা', path: 'address.district', kind: 'choice' },
  { key: 'upazila', label: 'উপজেলা', path: 'address.upazila', kind: 'choice' },
  { key: 'maritalStatus', label: 'বৈবাহিক অবস্থা', path: 'maritalStatus', kind: 'choice' },
  { key: 'profession', label: 'পেশা', path: 'occupational.profession', kind: 'choice' },
  { key: 'financialCondition', label: 'অর্থনৈতিক অবস্থা', path: 'familyInfo.familyFinancial', kind: 'choice' },
];
export const MATCH_FIELD_PATHS = SPEC.map((entry) => entry.path);
export function countMatchPreferences(user: any): number {
  return SPEC.filter((s) => hasPreference(user?.expectedLifePartner?.[s.key])).length;
}
function weight(key: MatchKey, settings: any): number {
  const configured = settings?.matchWeights?.[key];
  const value = configured === undefined ? DEFAULT_WEIGHTS[key] : Number(configured);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : DEFAULT_WEIGHTS[key];
}
export function scoreMatch(user: any, profile: Record<string, any>, settings: any = {}): MatchResult {
  const criteria: MatchCriterion[] = [];
  for (const spec of SPEC) {
    const expected = user?.expectedLifePartner?.[spec.key];
    const importance = weight(spec.key, settings);
    if (!hasPreference(expected) || !importance) continue;
    const actual = spec.path.split('.').reduce((value: any, k) => value?.[k], profile);
    let matched = false;
    let parseable = true;
    if (spec.kind === 'age') {
      const range = numberRange(expected);
      parseable = range !== null;
      matched = !!range && Number.isFinite(Number(actual)) && actual !== null && actual !== ''
        && Number(actual) >= range[0] && Number(actual) <= range[1];
    } else if (spec.kind === 'height') {
      const range = heightRange(expected);
      const actualInches = heightInches(actual);
      parseable = range !== null;
      matched = !!range && actualInches !== null && actualInches >= range[0] && actualInches <= range[1];
    } else matched = comparable(expected, actual);
    const unknown = !parseable || !hasPreference(actual) ||
      (spec.kind === 'height' && heightInches(actual) === null) ||
      (spec.kind === 'age' && !Number.isFinite(Number(actual)));
    criteria.push({
      key: spec.key, label: spec.label, expected: String(expected),
      actual: unknown ? null : String(actual),
      status: unknown ? 'unknown' : matched ? 'matched' : 'mismatched',
      weight: importance,
    });
  }
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const matchedWeight = criteria.reduce((sum, c) => sum + (c.status === 'matched' ? c.weight : 0), 0);
  const assessedWeight = criteria.reduce((sum, c) => sum + (c.status !== 'unknown' ? c.weight : 0), 0);
  return {
    profile,
    score: totalWeight ? Math.round(100 * matchedWeight / totalWeight) : null,
    coverage: totalWeight ? Math.round(100 * assessedWeight / totalWeight) : 0,
    assessedCount: criteria.filter((c) => c.status !== 'unknown').length,
    matchedCount: criteria.filter((c) => c.status === 'matched').length,
    mismatchedCount: criteria.filter((c) => c.status === 'mismatched').length,
    unknownCount: criteria.filter((c) => c.status === 'unknown').length,
    criteria,
    reasons: criteria.filter((c) => c.status === 'matched').map((c) => c.label),
    mismatches: criteria.filter((c) => c.status === 'mismatched').map((c) => c.label),
  };
}
export function compareMatches(a: MatchResult, b: MatchResult): number {
  return (b.score ?? -1) - (a.score ?? -1) ||
    b.coverage - a.coverage ||
    b.matchedCount - a.matchedCount ||
    String(b.profile.createdAt || '').localeCompare(String(a.profile.createdAt || '')) ||
    String(a.profile._id || '').localeCompare(String(b.profile._id || ''));
}
export function rankMatches(user: any, candidates: any[], settings: any = {}): MatchResult[] {
  const minimum = Math.max(0, Math.min(100, Number(settings?.minMatchScore ?? 0) || 0));
  return candidates.map((profile) => scoreMatch(user, profile, settings))
    .filter((item) => item.score !== null && item.score >= minimum)
    .sort(compareMatches).slice(0, 24);
}
