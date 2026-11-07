import { compareMatches, countMatchPreferences, rankMatches, scoreMatch } from './matching';

const seeker = {
  gender: 'male',
  expectedLifePartner: {
    age: '২২-২৭', height: "৫ ফুট ৪ ইঞ্চি - ৫ ফুট ৮ ইঞ্চি",
    complexion: 'ফর্সা', education: 'মাস্টার্স',
    district: 'ঢাকা', upazila: 'Savar',
    maritalStatus: 'অবিবাহিত', profession: 'ডাক্তার',
    financialCondition: 'মধ্যবিত্ত',
    expectedQuality: 'দয়ালু, দায়িত্বশীল',
  },
};
const candidate = {
  _id: 'candidate1', userId: '002', gender: 'female', age: 25,
  address: { district: 'Dhaka', upazila: 'Savar' },
  maritalStatus: 'Unmarried',
  occupational: { profession: 'doctor' },
  educationInfo: { highestEducation: 'মাস্টার্স' },
  personalInformation: { height: 5.6, skinTone: 'ফর্সা' },
  familyInfo: { familyFinancial: 'middle' },
};
describe('explainable biodata smart matching', () => {
  it('matches Bangla digits, ranges and equivalent stored option values', () => {
    const result = scoreMatch(seeker, candidate);
    expect(result.score).toBe(100);
    expect(result.coverage).toBe(100);
    expect(result.matchedCount).toBe(9);
    expect(result.mismatchedCount).toBe(0);
    expect(result.reasons).toContain('জেলা');
  });
  it('explains mismatches without treating absent answers as mismatches', () => {
    const result = scoreMatch(seeker, {
      ...candidate, age: 32, occupational: {}, personalInformation: {},
    });
    expect(result.criteria.find((x) => x.key === 'age')?.status).toBe('mismatched');
    expect(result.criteria.find((x) => x.key === 'profession')?.status).toBe('unknown');
    expect(result.criteria.find((x) => x.key === 'height')?.status).toBe('unknown');
    expect(result.mismatches).toContain('বয়স');
    expect(result.coverage).toBeLessThan(100);
    expect(result.score).toBeLessThan(100);
  });
  it('does not invent comparisons for vague unstructured text or missing preferences', () => {
    const result = scoreMatch({expectedLifePartner: {
      age: 'প্রাপ্তবয়স্ক', profession: 'কিছু একটা ভালো', expectedQuality: 'সৎ',
    }}, {age: 26, occupational: {profession: 'doctor'}});
    expect(result.criteria.find((x) => x.key === 'age')?.status).toBe('unknown');
    expect(result.criteria.find((x) => x.key === 'profession')?.status).toBe('mismatched');
    expect(result.criteria.some((x) => x.key === ('expectedQuality' as string))).toBe(false);
    expect(countMatchPreferences({expectedLifePartner: {age: 'যেকোনো'}})).toBe(0);
    expect(scoreMatch({expectedLifePartner: {}}, candidate).score).toBeNull();
  });
  it('respects configured weight and ranks deterministically', () => {
    const settings = {matchWeights: {age: 10, district: 1}, minMatchScore: 1};
    const ranked = rankMatches(
      {expectedLifePartner: {age: '20-28', district: 'Dhaka'}},
      [{...candidate, _id: 'older', age: 40}, {...candidate, _id: 'younger', age: 25}],
      settings,
    );
    expect(ranked.map((x) => x.profile._id)).toEqual(['younger', 'older']);
    expect(ranked[0].score).toBe(100);
    expect(compareMatches(ranked[0], ranked[1])).toBeLessThan(0);
  });
  it('treats ambiguous numeric height 5.1 as unknown rather than claiming 5 ft 10 in', () => {
    const result = scoreMatch({expectedLifePartner: {height: '5.10'}},
      {...candidate, personalInformation: {height: 5.1}});
    expect(result.criteria[0].status).toBe('unknown');
  });
  it('does not return hidden private fields when scoring a public-profile copy', () => {
    const profile = {...candidate, occupational: {}};
    const result = scoreMatch({expectedLifePartner: {profession: 'ডাক্তার'}}, profile);
    expect(result.score).toBe(0);
    expect(result.criteria[0].status).toBe('unknown');
  });
});
