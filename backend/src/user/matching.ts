import { publicProfile } from './profile-rules';
export function rankMatches(user: any, candidates: any[], settings: any = {}) {
  const wanted = user.expectedLifePartner || {};
  const base = {
    district: 1,
    maritalStatus: 1,
    profession: 1,
    education: 1,
    age: 1,
    ...settings.matchWeights,
  };
  return candidates
    .map((v) => {
      const checks: { key: string; label: string; match: boolean }[] = [];
      for (const [key, path, label] of [
        ['district', 'address.district', 'প্রত্যাশিত জেলা'],
        ['maritalStatus', 'maritalStatus', 'বৈবাহিক অবস্থা'],
        ['profession', 'occupational.profession', 'প্রত্যাশিত পেশা'],
        ['education', 'educationInfo.highestEducation', 'শিক্ষাগত যোগ্যতা'],
      ]) {
        if (!wanted[key]) continue;
        const actual = path.split('.').reduce((x, k) => x?.[k], v);
        const options = String(wanted[key])
          .split(',')
          .map((x) => x.trim().toLowerCase());
        checks.push({
          key,
          label,
          match: options.includes(String(actual || '').toLowerCase()),
        });
      }
      const ages = String(wanted.age || '')
        .replace(/[০-৯]/g, (n) => String('০১২৩৪৫৬৭৮৯'.indexOf(n)))
        .match(/\d+/g)
        ?.map(Number);
      if (ages?.length === 2)
        checks.push({
          key: 'age',
          label: 'প্রত্যাশিত বয়স',
          match: v.age >= Math.min(...ages) && v.age <= Math.max(...ages),
        });
      const total = checks.reduce(
        (n, c) => n + Math.max(0, Number(base[c.key]) || 0),
        0,
      );
      const matched = checks
        .filter((c) => c.match)
        .reduce((n, c) => n + Math.max(0, Number(base[c.key]) || 0), 0);
      return {
        profile: publicProfile(v),
        score: total ? Math.round((100 * matched) / total) : null,
        reasons: checks.filter((c) => c.match).map((c) => c.label),
      };
    })
    .filter(
      (v) =>
        v.score === null ||
        v.score >= Math.max(1, Number(settings.minMatchScore) || 1),
    )
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 12);
}
