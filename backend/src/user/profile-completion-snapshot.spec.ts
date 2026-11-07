import {buildProfileCompletionSnapshot,needsProfileCompletionSync} from './profile-completion-snapshot';
import {BUILTINS,type ProfileQuestion,type QuestionSchema} from '../profile-questions/question-config.service';

function question(id:string,patch:Partial<ProfileQuestion>={}):ProfileQuestion{
 return {
   id,question:'Field '+id,publicLabel:'Field '+id,section:2,
   gender:'both',type:'text',options:[],optionSource:'',required:true,enabled:true,
   showPublic:false,order:10,locked:false,...patch,
 };
}
const one='q_'+'a'.repeat(32);
const two='q_'+'b'.repeat(32);
const three='q_'+'c'.repeat(32);
const schema=(revision:number,questions:ProfileQuestion[]):QuestionSchema=>({
 revision,questions,sections:[],
});
describe('Versioned dynamic profile completion',()=>{
 it('counts only current required and enabled questions for the member gender',()=>{
   const questions=[
     question(one),question(two),question(three,{gender:'female'}),
     question('q_'+'d'.repeat(32),{required:false}),
     question('q_'+'e'.repeat(32),{enabled:false}),
   ];
   const male={gender:'male',dynamicAnswers:{[one]:'answered',[two]:''}};
   expect(buildProfileCompletionSnapshot(male,schema(3,questions))).toEqual({
     completionPercentage:50,completionRequiredCount:2,
     completionAnsweredCount:1,completionSchemaRevision:3,
   });
   const female={...male,gender:'female'};
   expect(buildProfileCompletionSnapshot(female,schema(3,questions))).toMatchObject({
     completionPercentage:33,completionRequiredCount:3,completionAnsweredCount:1,
   });
 });
 it('changes when question builder required or enabled flags change, without changing stored answers',()=>{
   const member={gender:'male',dynamicAnswers:{[one]:'A'}};
   const old=buildProfileCompletionSnapshot(member,schema(7,[question(one),question(two)]));
   const next=buildProfileCompletionSnapshot(member,schema(8,[question(one),question(two,{required:false})]));
   expect(old).toMatchObject({completionPercentage:50,completionRequiredCount:2,completionAnsweredCount:1});
   expect(next).toMatchObject({completionPercentage:100,completionRequiredCount:1,completionAnsweredCount:1});
   expect(needsProfileCompletionSync(old,next)).toBe(true);
   expect(needsProfileCompletionSync(next,next)).toBe(false);
 });
 it('returns zero progress before a member starts biodata even when an account name exists',()=>{
   expect(buildProfileCompletionSnapshot({name:'Just registered'},schema(4,[question(one)]) )).toEqual({
     completionPercentage:0,completionRequiredCount:0,completionAnsweredCount:0,
     completionSchemaRevision:4,
   });
 });
 it('excludes upazila requirement when a city corporation is chosen',()=>{
   const member={gender:'female',residenceCountry:'Bangladesh',
     address:{cityCorporation:'Dhaka North City Corporation'}};
   const upazila=BUILTINS.find(q=>q.path==='address.upazila')!;
   const city=BUILTINS.find(q=>q.path==='address.cityCorporation')!;
   const questions=[{...upazila,required:true,enabled:true,gender:'both' as const},
     {...city,required:true,enabled:true,gender:'both' as const}];
   expect(buildProfileCompletionSnapshot(member,schema(9,questions))).toMatchObject({
     completionRequiredCount:1,completionAnsweredCount:1,completionPercentage:100,
   });
 });
 it('marks old and missing snapshots for persistence after question revisions',()=>{
   const computed=buildProfileCompletionSnapshot({gender:'male',dynamicAnswers:{}},schema(11,[question(one)]));
   expect(needsProfileCompletionSync({completionPercentage:0},computed)).toBe(true);
   expect(needsProfileCompletionSync({...computed,completionSchemaRevision:10},computed)).toBe(true);
 });
});
