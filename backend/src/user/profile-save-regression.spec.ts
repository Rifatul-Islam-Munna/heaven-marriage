import {
  assertQuestionRules, newQuestionRuleErrors, sanitizeDynamicAnswers,
  usesSeparateAnswerStorage, answerForQuestion, BUILTINS, type ProfileQuestion,
} from '../profile-questions/question-config.service';
import { profileUpdateSet, profileUpdatePreview } from './profile-rules';
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

  it('preserves map-backed archived answers', () => {
    const q = sample(first);
    const map = new Map([[second, 'Old archived answer']]);
    const result = sanitizeDynamicAnswers({
      [first]: 'New answer',
    }, map as unknown as Record<string, unknown>, [q], 'female');
    expect(result).toEqual({[first]: 'New answer', [second]: 'Old archived answer'});
  });
});
