/** Single server-side interpretation of biodata lifecycle. */
export type BiodataStage = 'draft' | 'ready' | 'under_review' | 'published' | 'rejected' | 'deleted';
export function biodataStage(profile: any, percentage: number): BiodataStage {
  if (profile?.biodataStatus === 'deleted') return 'deleted';
  if (profile?.isPublished === true && profile?.isPublishFromAdmin === true &&
      profile?.verificationStatus !== 'suspended') return 'published';
  if (profile?.verificationStatus === 'rejected' &&
      ['submitted', 'approved'].includes(profile?.biodataStatus)) return 'rejected';
  if (['submitted', 'approved'].includes(profile?.biodataStatus) ||
      profile?.isPublishFromAdmin === true) return 'under_review';
  return percentage === 100 ? 'ready' : 'draft';
}
export function hasSubmittedBiodata(profile: any): boolean {
  return profile?.biodataStatus !== 'deleted' && (
    ['submitted', 'approved'].includes(profile?.biodataStatus) ||
    profile?.isPublishFromAdmin === true
  );
}
