/** Single server-side interpretation of biodata lifecycle. */
export type BiodataStage = 'draft' | 'ready' | 'under_review' | 'published' | 'rejected' | 'deleted';
export function biodataStage(profile: any, percentage: number): BiodataStage {
  if (profile?.biodataStatus === 'deleted') return 'deleted';
  if (profile?.isPublished === true && profile?.isPublishFromAdmin === true &&
      !['suspended', 'rejected'].includes(profile?.verificationStatus)) return 'published';
  if (profile?.verificationStatus === 'rejected' &&
      ['submitted', 'approved'].includes(profile?.biodataStatus)) return 'rejected';
  if (['submitted', 'approved'].includes(profile?.biodataStatus) ||
      profile?.isPublishFromAdmin === true) return 'under_review';
  return percentage === 100 ? 'ready' : 'draft';
}
/** Registration-only is different from a saved draft; legacy bios may lack draftSavedAt. */
export function hasStartedBiodata(profile: any): boolean {
  return Boolean(profile?.draftSavedAt || profile?.draftStep || profile?.age ||
    profile?.maritalStatus || profile?.address?.district ||
    profile?.educationInfo?.highestEducation || profile?.personalInformation?.height ||
    profile?.occupational?.profession || profile?.expectedLifePartner?.age ||
    profile?.dynamicAnswers && Object.keys(profile.dynamicAnswers).length);
}
export function hasSubmittedBiodata(profile: any): boolean {
  return profile?.biodataStatus !== 'deleted' && (
    ['submitted', 'approved'].includes(profile?.biodataStatus) ||
    profile?.isPublishFromAdmin === true
  );
}
