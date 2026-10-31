import { BadRequestException } from '@nestjs/common';
import { completion, publicProfile } from '../user/profile-rules';
import {
  BUILTINS, answerForQuestion, missingDynamicAnswers, sanitizeDynamicAnswers,
  usesSeparateAnswerStorage, validateQuestion,
} from './question-config.service';

describe('Admin controlled profile question rules', () => {
  it('keeps current male and female profile prompts as the default', () => {
    expect(BUILTINS.length).toBeGreaterThan(70);
    expect(BUILTINS.find(q=>q.path==='age')?.required).toBe(true);
    expect(BUILTINS.find(q=>q.path==='marriageInformationWomen.jobAfterMarriage')?.gender).toBe('female');
  });

  it.each(['age','gender','maritalStatus','personalInformation.height',
    'pledge.youGordianKnowsThis','pledge.allTheInformationTrue','name'])(
    'allows admin to disable, make optional, move and reword the old %s field', path => {
      const base = BUILTINS.find(q=>q.path===path)!;
      expect(base).toBeDefined();
      const edited=validateQuestion({...base, question:'Edited question',
        enabled:false,required:false,gender:'female',section:8});
      expect(edited.locked).toBe(false);
      expect(edited.enabled).toBe(false);
      expect(edited.required).toBe(false);
      expect(edited.gender).toBe('female');
      expect(edited.section).toBe(8);
      expect(edited.question).toBe('Edited question');
      expect(edited.path).toBe(path);
    },
  );

  it('lets the admin convert any old field to another type without corrupting its original typed value',()=>{
    const age=BUILTINS.find(q=>q.path==='age')!;
    const edited=validateQuestion({...age,type:'textarea',required:true});
    expect(usesSeparateAnswerStorage(edited)).toBe(true);
    const answer=sanitizeDynamicAnswers({[age.id]:'I prefer not to say'}, {},[edited],'male');
    const user={gender:'male',age:30,dynamicAnswers:answer};
    expect(user.age).toBe(30);
    expect(answerForQuestion(user,edited)).toBe('I prefer not to say');
    expect(completion(user,[edited]).percentage).toBe(100);
    expect(completion({gender:'male',age:30},[edited]).percentage).toBe(0);
  });

  it('leaves authentication credentials outside the schema and refuses forged field bindings',()=>{
    for(const path of ['email','phoneNumber','password'])
      expect(BUILTINS.some(q=>q.path===path)).toBe(false);
    const age=BUILTINS.find(q=>q.path==='age')!;
    expect(()=>validateQuestion({...age,path:'password'})).toThrow(BadRequestException);
    expect(()=>validateQuestion({...age,path:'role'})).toThrow(BadRequestException);
    expect(()=>validateQuestion({ ...age, id:'q_11112222333344445555666677778888',path:'email'}))
      .toThrow(BadRequestException);
    expect(validateQuestion({...age,showPublic:false}).showPublic).toBe(false);
    const name=BUILTINS.find(q=>q.path==='name')!;
    expect(validateQuestion({...name,showPublic:true}).showPublic).toBe(true);
    expect(publicProfile({name:'Secret name',gender:'female'}).name).toBeUndefined();
    expect(publicProfile({name:'Secret name',gender:'female'},true).name).toBe('Secret name');
  });

  it('does not block submission or completion for a removed mandatory question',()=>{
    const only=BUILTINS.filter(q=>['age','gender','pledge.youGordianKnowsThis'].includes(q.path||''))
      .map(q=>validateQuestion({...q,enabled:false,required:false}));
    expect(completion({},only)).toEqual({percentage:100,remaining:[],nextStep:-1});
    expect(completion({},only.map(q=>({...q,enabled:true,required:true}))).percentage).toBe(0);
  });

  it('preserves the required checkbox and multi-select rules for new questions',()=>{
    const q=validateQuestion({
      id:'q_aabbccddeeff11223344556677889900',question:'Testing',publicLabel:'Tester',
      section:2,gender:'female',type:'multi_checkbox',options:[{value:'a',label:'A'}],
      optionSource:'',required:true,enabled:true,showPublic:true,order:5,
    });
    expect(sanitizeDynamicAnswers({[q.id]:['a']},{},[q],'female')).toEqual({[q.id]:['a']});
    expect(()=>sanitizeDynamicAnswers({[q.id]:['a']},{},[q],'male')).toThrow();
    expect(missingDynamicAnswers({},[q],'female')).toEqual(['Testing']);
  });
});
