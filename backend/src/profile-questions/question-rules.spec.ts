import {BadRequestException} from '@nestjs/common';
import {BUILTINS,assertQuestionRules,questionRuleErrors,validateQuestion,type ProfileQuestion} from './question-config.service';

const first='q_'+'a'.repeat(32),second='q_'+'b'.repeat(32);
const field=(id:string,patch:Partial<ProfileQuestion>={}):ProfileQuestion=>({
  id,question:id===first?'First answer':'Second answer',publicLabel:'Answer',section:1,gender:'both',
  type:'text',options:[],optionSource:'',enabled:true,required:false,showPublic:false,order:1,locked:false,...patch,
});
const questions=[field(first,{rules:[{type:'not_equal',questionId:second,message:'Answers must differ'}]}),field(second)];
describe('Rules comparing two answers',()=>{
  it('rejects exact duplicates and accepts different answers',()=>{
    expect(questionRuleErrors({dynamicAnswers:{[first]:'same',[second]:'same'}},questions))
      .toEqual([{questionId:first,otherQuestionId:second,message:'Answers must differ'}]);
    expect(()=>assertQuestionRules({dynamicAnswers:{[first]:'same',[second]:'same'}},questions)).toThrow(BadRequestException);
    expect(questionRuleErrors({dynamicAnswers:{[first]:'one',[second]:'two'}},questions)).toEqual([]);
  });
  it.each([undefined,null,''] as unknown[])('ignores blank answers: %s',blank=>{
    expect(questionRuleErrors({dynamicAnswers:{[first]:blank,[second]:blank}},questions)).toEqual([]);
  });
  it('uses strict equality, including zero and false',()=>{
    for(const value of [0,false])expect(questionRuleErrors({dynamicAnswers:{[first]:value,[second]:value}},questions)).toHaveLength(1);
    for(const [left,right] of [[1,'1'],[false,'false'],['Same','same'],['same','same ']])
      expect(questionRuleErrors({dynamicAnswers:{[first]:left,[second]:right}},questions)).toEqual([]);
  });
  it('reads built-in and legacy answers through their stable storage fields',()=>{
    const present=BUILTINS.find(q=>q.path==='address.presentAddress')!;
    const permanent=BUILTINS.find(q=>q.path==='address.permanentAddress')!;
    const schema=[{...present,rules:[{type:'not_equal' as const,questionId:permanent.id}]},permanent];
    expect(questionRuleErrors({address:{presentAddress:'Dhaka',permanentAddress:'Dhaka'}},schema)).toHaveLength(1);
    const legacy=field('old_'+'c'.repeat(24),{legacyKey:'Old wording'});
    expect(questionRuleErrors({customFields:{'Old wording':'same'},dynamicAnswers:{[first]:'same'}},
      [field(first,{rules:[{type:'not_equal',questionId:legacy.id}]}),legacy])).toHaveLength(1);
  });
  it('skips archived and gender-inapplicable fields',()=>{
    const user={gender:'male',dynamicAnswers:{[first]:'same',[second]:'same'}};
    expect(questionRuleErrors(user,[questions[0],{...questions[1],enabled:false}])).toEqual([]);
    expect(questionRuleErrors(user,[questions[0],{...questions[1],gender:'female'}])).toEqual([]);
  });
  it('rejects malformed, duplicate, self and multiple-choice rules',()=>{
    for(const rules of [
      [{type:'not_equal',questionId:first}], [{type:'eval',questionId:second}],
      [{type:'not_equal',questionId:'missing'}],
      [{type:'not_equal',questionId:second},{type:'not_equal',questionId:second}],
    ])expect(()=>validateQuestion({...questions[0],rules})).toThrow(BadRequestException);
    expect(()=>validateQuestion({...questions[0],type:'multi_checkbox'})).toThrow(BadRequestException);
  });
  it('preserves rules while changing question wording',()=>{
    expect(validateQuestion({...questions[0],question:'Renamed question'}).rules).toEqual(questions[0].rules);
  });
});
