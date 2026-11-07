import {completion,applicableRequiredQuestions} from './profile-rules';
import type {QuestionSchema} from '../profile-questions/question-config.service';

export type ProfileCompletionSnapshot={
  completionPercentage:number;
  completionRequiredCount:number;
  completionAnsweredCount:number;
  completionSchemaRevision:number;
};

/**
 * Versioned persisted cache only: live required-question answers and the
 * current Question Builder revision always determine the authoritative %.
 * Registration-only members start at 0% until a profile gender exists.
 */
export function buildProfileCompletionSnapshot(user:any,schema:QuestionSchema):ProfileCompletionSnapshot {
  if(!user?.gender){
    return {
      completionPercentage:0,
      completionRequiredCount:0,
      completionAnsweredCount:0,
      completionSchemaRevision:schema.revision,
    };
  }
  const required=applicableRequiredQuestions(user,schema.questions);
  const result=completion(user,schema.questions);
  return {
    completionPercentage:result.percentage,
    completionRequiredCount:required.length,
    completionAnsweredCount:Math.max(0,required.length-result.remaining.length),
    completionSchemaRevision:schema.revision,
  };
}
/** Authoritative profile response for both member and administrator screens. */
export function describeProfileCompletion(user:any,schema:QuestionSchema){
  const snapshot=buildProfileCompletionSnapshot(user,schema);
  const measured=completion(user,schema.questions);
  return {
    snapshot,
    completion:{
      ...measured,
      percentage:snapshot.completionPercentage,
      requiredCount:snapshot.completionRequiredCount,
      answeredCount:snapshot.completionAnsweredCount,
      schemaRevision:snapshot.completionSchemaRevision,
    },
  };
}

export function needsProfileCompletionSync(member:any,snapshot:ProfileCompletionSnapshot){
  return member.completionSchemaRevision!==snapshot.completionSchemaRevision ||
    member.completionPercentage!==snapshot.completionPercentage ||
    member.completionRequiredCount!==snapshot.completionRequiredCount ||
    member.completionAnsweredCount!==snapshot.completionAnsweredCount;
}
