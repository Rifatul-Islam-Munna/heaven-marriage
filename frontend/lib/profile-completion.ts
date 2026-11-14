import {readQuestionAnswer,type ProfileQuestion,type ProfileQuestionSchema} from './profile-questions';
import {ageFromBirthDate} from './birth-date';

export type BiodataRequiredProgress={
  percentage:number;
  requiredCount:number;
  answeredCount:number;
  remaining:ProfileQuestion[];
};

/**
 * Live visual preview for unsaved answers. Mirrors backend
 * applicableRequiredQuestions() / completion() in profile-rules.ts.
 * After saving, the backend is the authority for the final percentage.
 */
export function previewBiodataCompletion(
  profile:Record<string,any>,
  schema:ProfileQuestionSchema,
):BiodataRequiredProgress{
  // A newly registered account must not appear as 100%-complete just because
  // the dynamic form has not established the member's gender yet.
  if(!profile?.gender)return {percentage:0,requiredCount:0,answeredCount:0,remaining:[]};
  const required=schema.questions.filter(q=>{
    if(!q.enabled||!q.required||(q.gender!=='both'&&q.gender!==profile.gender))return false;
    if(q.path?.startsWith('address.')&&
      ['district','upazila','cityCorporation','area'].includes(q.path.split('.')[1])){
      if(profile.residenceCountry&&profile.residenceCountry!=='Bangladesh')return false;
      if(q.path==='address.upazila'&&profile.address?.cityCorporation)return false;
      if(q.path==='address.cityCorporation'&&profile.address?.upazila)return false;
    }
    return true;
  });
  const remaining=required.filter(q=>{
    const value=readQuestionAnswer(profile,q);
    if(q.path==='dateOfBirth')return ageFromBirthDate(value as string)===undefined;
    return value===undefined||value===null||value===''||
      (Array.isArray(value)&&value.length===0)||
      (q.type==='checkbox'&&value!==true)||
      (q.type==='number'&&value===0);
  });
  const answeredCount=required.length-remaining.length;
  return {
    percentage:required.length?Math.round(answeredCount/required.length*100):100,
    requiredCount:required.length,
    answeredCount,
    remaining,
  };
}
