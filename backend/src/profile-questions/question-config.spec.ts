import { BadRequestException } from '@nestjs/common';
import { completion, publicProfile } from '../user/profile-rules';
import {
  BUILTINS, answerForQuestion, missingDynamicAnswers, sanitizeDynamicAnswers,
  usesSeparateAnswerStorage, validateQuestion, isProtectedLocationQuestion,
  QuestionConfigService,PROTECTED_LOCATION_PATHS,
} from './question-config.service';

describe('Admin controlled profile question rules', () => {
  const locations=[
    'nationality','residenceCountry','address.district','address.upazila',
    'address.cityCorporation','address.area',
  ];
  it('keeps all core country, city and area questions active and backed by the searchable catalogue',()=>{
    expect([...PROTECTED_LOCATION_PATHS]).toEqual(locations);
    for(const path of locations){
      const q=BUILTINS.find(item=>item.path===path);
      expect(q).toBeDefined();
      expect(isProtectedLocationQuestion(q)).toBe(true);
      expect(q!.enabled).toBe(true);
      expect(q!.type).toBe('select');
      expect(q!.gender).toBe('both');
      expect(q!.optionSource).toBeTruthy();
      expect(q!.options).toEqual([]);
    }
  });
  it.each(locations)('rejects attempts to disable, replace, or limit the %s location input',path=>{
    const q=BUILTINS.find(item=>item.path===path)!;
    for(const patch of [
      {enabled:false},{type:'textarea'},{gender:'female'},{gender:'male'},
      {optionSource:''},{options:[{label:'Only one place',value:'only-one'}]},
      {path:'somewhere.else'},
    ])expect(()=>validateQuestion({...q,...patch})).toThrow(BadRequestException);
    const editable=validateQuestion({...q,question:'Updated location wording',required:!q.required});
    expect(editable.question).toBe('Updated location wording');
    expect(editable.required).toBe(!q.required);
    expect(editable.enabled).toBe(true);
    expect(editable.optionSource).toBe(q.optionSource);
  });
  it('refuses an admin schema update that omits any protected location field',async()=>{
    const current={revision:17,sections:[],questions:BUILTINS.filter(isProtectedLocationQuestion)};
    const service=new QuestionConfigService({} as any);
    jest.spyOn(service,'get').mockResolvedValue(current);
    for(const field of current.questions){
      await expect(service.save('administrator',{
        revision:17,questions:current.questions.filter(q=>q.id!==field.id),
      })).rejects.toThrow(BadRequestException);
    }
  });
  it('repairs older saved configurations that hid a protected location field',async()=>{
    const protectedField=BUILTINS.find(q=>q.path==='address.cityCorporation')!;
    const broken={...protectedField,enabled:false,type:'textarea',gender:'female',optionSource:''};
    const mockDb:any={collection:jest.fn((name:string)=>{
      if(name==='profile_question_config')return {findOne:jest.fn().mockResolvedValue({
        revision:8,questions:[broken],
      })};
      if(name==='customquestions')return {find:jest.fn(()=>({
        project:jest.fn(()=>({toArray:jest.fn().mockResolvedValue([])})),
      }))};
      throw Error('Unexpected collection '+name);
    })};
    const result=await new QuestionConfigService(mockDb).get();
    expect(result.revision).toBe(8);
    expect(result.questions.find(q=>q.path==='address.cityCorporation'))
      .toMatchObject({enabled:true,gender:'both',type:'select',optionSource:'cityCorporations'});
  });

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
