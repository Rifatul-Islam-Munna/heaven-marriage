import {
  assertQuestionRules, newQuestionRuleErrors, sanitizeDynamicAnswers,
  usesSeparateAnswerStorage, answerForQuestion, BUILTINS, QuestionConfigService,
  type ProfileQuestion,
} from '../profile-questions/question-config.service';
import { profileUpdateSet, profileUpdatePreview, publicProfile } from './profile-rules';
import { applyBirthDate } from './birth-date';

describe('Biodata saves after admin Question Builder edits (no database)', () => {
  const first = 'q_' + 'c'.repeat(32);
  const second = 'q_' + 'd'.repeat(32);
  const sample = (id: string): ProfileQuestion => ({
    id, question: id, publicLabel: id, section: 2, gender: 'both',
    type: 'text', options: [], optionSource: '', enabled: true,
    required: false, showPublic: true, order: 1, locked: false,
  });

  it('permits unrelated updates with pre-existing rule conflicts', () => {
    const questions = [
      {...sample(first), rules: [{
        type: 'not_equal' as const, questionId: second, message: 'Answers must differ',
      }]}, sample(second),
    ];
    const before = {
      gender: 'female', dynamicAnswers: {[first]: 'same', [second]: 'same'},
      familyInfo: {mothersProfession: 'Teacher', fathersProfession: 'Doctor'},
    };
    const patch = {familyInfo: {mothersProfession: 'Engineer'}};
    const after = profileUpdatePreview(before, patch);
    expect(newQuestionRuleErrors(after, questions, before)).toHaveLength(0);
    expect(() => assertQuestionRules(after, questions, before)).not.toThrow();
    expect(after.familyInfo).toEqual({
      mothersProfession: 'Engineer', fathersProfession: 'Doctor',
    });
    expect(profileUpdateSet(patch)).toEqual({
      'familyInfo.mothersProfession': 'Engineer',
    });
    expect(() => assertQuestionRules(after, questions)).toThrow('Answers must differ');
    const newlyIntroduced = profileUpdatePreview(before, {
      dynamicAnswers: {[second]: 'different'},
    });
    expect(newQuestionRuleErrors(newlyIntroduced, questions, before)).toHaveLength(0);
    const newViolation = profileUpdatePreview(newlyIntroduced, {
      dynamicAnswers: {[second]: 'same'},
    });
    expect(newQuestionRuleErrors(newViolation, questions, newlyIntroduced)).toHaveLength(1);
  });

  it('keeps archived answers and multi-choice values migrated from old text', () => {
    const original = BUILTINS.find(q => q.path === 'familyInfo.brotherInformation');
    expect(original).toBeDefined();
    const edited: ProfileQuestion = {
      ...original!, type: 'multi_checkbox', answerStorage: 'dynamic',
      options: [{value: 'new', label: 'New choice'}], enabled: true,
      required: false,
    };
    const archived = 'q_' + 'f'.repeat(32);
    const existing = {[archived]: 'Past answer'};
    const source = {
      gender: 'female',
      familyInfo: {brotherInformation: 'Old, Removed'},
      dynamicAnswers: existing,
    };
    const saved = sanitizeDynamicAnswers({
      [edited.id]: ['Old', 'Removed', 'new'],
    }, existing, [edited], source.gender, source);
    expect(saved).toEqual({
      [archived]: 'Past answer',
      [edited.id]: ['Old', 'Removed', 'new'],
    });
    expect(() => sanitizeDynamicAnswers({
      [edited.id]: ['Unrelated fake choice'],
    }, existing, [edited], source.gender, source)).toThrow('Invalid choice');
  });

  it('edits renamed legacy questions by ID without erasing the original answer', () => {
    const id='old_'+'a'.repeat(24);
    const legacy:ProfileQuestion={...sample(id),legacyKey:'Old question. label',
      question:'New question label',type:'textarea'};
    expect(usesSeparateAnswerStorage(legacy)).toBe(true);
    const source={customFields: new Map([['Old question. label','Saved legacy answer']])};
    expect(answerForQuestion(source,legacy)).toBe('Saved legacy answer');
    const saved=sanitizeDynamicAnswers({[id]:'New response'},{},[legacy],'female',source);
    expect(saved).toEqual({[id]:'New response'});
    expect(answerForQuestion({...source,dynamicAnswers:saved},legacy)).toBe('New response');
  });

  it('does not block unrelated edits for legacy invalid stored birth dates', () => {
    const oldProfile={dateOfBirth:'2002/05/10', age:24};
    const changes:Record<string,any>={familyInfo:{brotherInformation:'Edited'}};
    expect(() => applyBirthDate(changes,oldProfile)).not.toThrow();
    expect(changes.age).toBeUndefined();
    expect(() => applyBirthDate({dateOfBirth:'2002/05/10'},oldProfile))
      .toThrow('Enter a valid birth date');
  });

  it('preserves public district/upazila names when they overlap private identity', async () => {
    const source = {
      gender: 'female',
      name: 'Jessore',
      fatherName: 'Private Father',
      phoneNumber: '01711111111',
      email: 'hidden@example.com',
      nationality: 'Bangladesh',
      address: {
        district: 'যশোর',
        upazila: 'Jessore Sadar',
        cityCorporation: 'Jessore City',
        area: 'Jessore Bazar',
        presentAddress: 'House 27, Jessore Sadar, যশোর',
        permanentAddress: 'Road 3, Jessore Sadar',
      },
    };
    const safe=publicProfile(source,false);
    expect(safe.address.upazila).toBe('Jessore Sadar');
    expect(safe.address.cityCorporation).toBe('Jessore City');
    expect(safe.address.area).toBe('Jessore Bazar');
    expect(safe.address.district).toBe('যশোর');
    expect(safe.name).toBeUndefined();
    expect(safe.address.presentAddress).toBeUndefined();
    expect(safe.address.permanentAddress).toBeUndefined();
    expect(JSON.stringify(safe)).not.toContain('House 27');
    expect(JSON.stringify(safe)).not.toContain('Road 3');
    expect(JSON.stringify(safe)).not.toContain('hidden@example.com');
    expect(publicProfile(source,true).address.permanentAddress).toBe(source.address.permanentAddress);

    const cityId='q_'+'a'.repeat(32), textId='q_'+'b'.repeat(32);
    const city:ProfileQuestion={
      ...sample(cityId),path:'address.upazila',type:'select',
      answerStorage:'dynamic',
    };
    const notes:ProfileQuestion={...sample(textId),path:undefined};
    const config = Object.create(QuestionConfigService.prototype) as QuestionConfigService;
    const answers = await config.publicAnswers({
      ...source,
      dynamicAnswers:{
        [cityId]:'Jessore Sadar',
        [textId]:'Call my phone 01711111111',
      },
    },false,{revision:2,sections:[],questions:[city,notes]});
    expect(answers[cityId]).toBe('Jessore Sadar');
    expect(answers[textId]).toBeUndefined();
    expect(JSON.stringify(answers)).not.toContain('[সংরক্ষিত]');
    expect(JSON.stringify(answers)).not.toContain('01711111111');
  });

  it('preserves map-backed archived answers', () => {
    const q = sample(first);
    const map = new Map([[second, 'Old archived answer']]);
    const result = sanitizeDynamicAnswers({
      [first]: 'New answer',
    }, map as unknown as Record<string, unknown>, [q], 'female');
    expect(result).toEqual({[first]: 'New answer', [second]: 'Old archived answer'});
  });
});
