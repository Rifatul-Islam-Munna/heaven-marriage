import { publicProfile } from './profile-rules';
import { publicAnswerSanitizer } from './public-answer-privacy';
import {
  QuestionConfigService, type ProfileQuestion,
} from '../profile-questions/question-config.service';

describe('Global public biodata privacy for dynamic question types', () => {
  const secretName = 'Private Person';
  const secretPhone = '01711111111';
  const user = {
    name: secretName, fatherName: 'Private Father',
    email: 'secret@private.example', phoneNumber: secretPhone,
    whatsapp: '01911111111', guardianPhone: '01811111111',
    gender: 'female', nationality: 'Bangladesh',
    address: {
      district: 'যশোর', upazila: 'Jessore Sadar',
      cityCorporation: 'Jessore City', area: 'Jessore Bazar',
      presentAddress: 'House 27, Jessore Sadar, যশোর',
      permanentAddress: 'Road 3, Jessore Sadar',
    },
    personalInformation: {
      extraInfoHobby: 'Reading books',
      islamicScholarsName: 'Read about Private Father',
    },
    educationInfo: { highestEducation: 'Masters', highestEducationGroup: 'Private Person teaches here' },
  };
  const field = (suffix: string, type: ProfileQuestion['type']): ProfileQuestion => ({
    id: 'q_' + suffix.repeat(32), type,
    question: 'Custom question ' + suffix,
    publicLabel: 'Question ' + suffix, section: 8,
    gender: 'both', options: [], optionSource: '', required: false,
    enabled: true, showPublic: true, order: 1, locked: false,
  });

  it('preserves all safe built-in fields and removes unsafe scalar values without markers', () => {
    const result = publicProfile(user);
    expect(result.address).toMatchObject({
      district: 'যশোর', upazila: 'Jessore Sadar', cityCorporation: 'Jessore City',
      area: 'Jessore Bazar',
    });
    expect(result.personalInformation.extraInfoHobby).toBe('Reading books');
    expect(result.personalInformation.islamicScholarsName).toBeUndefined();
    expect(result.educationInfo.highestEducationGroup).toBeUndefined();
    expect(result.name).toBeUndefined();
    expect(result.address.presentAddress).toBeUndefined();
    expect(result.address.permanentAddress).toBeUndefined();
    const serialized = JSON.stringify(result);
    for (const forbidden of [
      '[সংরক্ষিত]', secretName, secretPhone, 'Private Father',
      'secret@private.example', 'House 27', 'Road 3',
    ]) expect(serialized).not.toContain(forbidden);
    expect(publicProfile(user, true).address.permanentAddress).toBe(user.address.permanentAddress);
  });

  it('handles arbitrary nested scalars, boolean/number values and arrays without corrupting safe siblings', () => {
    const clean = publicAnswerSanitizer(user);
    const original = {
      text: 'Readable answer',
      name: 'My contact is Private Person',
      phone: '01711111111',
      email: 'secret@private.example',
      old: '[সংরক্ষিত]Sadar',
      multiple: ['A', 'Private Father', 'B', '01911111111', '[সংরক্ষিত]Other'],
      nested: { yes: true, no: false, count: 0, safe: 'C', unsafe: 'Road 3, Jessore Sadar' },
    };
    const value = clean(original);
    expect(value).toEqual({
      text: 'Readable answer', multiple: ['A', 'B'],
      nested: { yes: true, no: false, count: 0, safe: 'C' },
    });
    expect(original.multiple).toHaveLength(5); // no changes to saved answers
    expect(JSON.stringify(value)).not.toContain('[সংরক্ষিত]');
  });

  it('filters custom text, textarea, dropdown, numeric and multi-checkbox answers identically', async () => {
    const text = field('a', 'text');
    const textarea = field('b', 'textarea');
    const multi = field('c', 'multi_checkbox');
    const select = field('d', 'dropdown');
    const safeMulti = field('e', 'multi_checkbox');
    const numeric = field('f', 'number');
    const checkbox = field('1', 'checkbox');
    const marked = field('2', 'text');
    const date = field('3', 'date');
    const phoneAsNumber = field('4', 'number');
    const schema = { revision: 2, sections: [], questions: [
      text, textarea, multi, select, safeMulti, numeric, checkbox, marked,
      date, phoneAsNumber,
    ] };
    const dynamicAnswers = {
      [text.id]: 'Hello ' + secretName,
      [textarea.id]: 'Call me on ' + secretPhone,
      [multi.id]: ['Safe A', 'Private Father', 'Safe B', 'secret@private.example'],
      [select.id]: 'Jessore Sadar',
      [safeMulti.id]: ['One', 'Two'],
      [numeric.id]: 5,
      [checkbox.id]: false,
      [marked.id]: '[সংরক্ষিত]Sadar',
      [date.id]: '1998-03-15',
      [phoneAsNumber.id]: 17111111111,
    };
    const config = Object.create(QuestionConfigService.prototype) as QuestionConfigService;
    const visible = await config.publicAnswers({ ...user, dynamicAnswers }, false, schema);
    expect(visible).toEqual({
      [multi.id]: ['Safe A', 'Safe B'],
      [select.id]: 'Jessore Sadar',
      [safeMulti.id]: ['One', 'Two'],
      [numeric.id]: 5,
      [checkbox.id]: false,
      [date.id]: '1998-03-15',
    });
    expect(JSON.stringify(visible)).not.toContain('[সংরক্ষিত]');
    const unlocked = await config.publicAnswers({ ...user, dynamicAnswers }, true, schema);
    expect(unlocked[text.id]).toBe(dynamicAnswers[text.id]);
    expect(unlocked[multi.id]).toEqual(dynamicAnswers[multi.id]);
  });

  it('never leaks full detailed addresses through redesigned custom questions', async () => {
    const notes = field('9', 'text');
    const multi = field('8', 'multi_checkbox');
    const config = Object.create(QuestionConfigService.prototype) as QuestionConfigService;
    const visible = await config.publicAnswers({
      ...user, dynamicAnswers: {
        [notes.id]: user.address.presentAddress,
        [multi.id]: ['Dhaka', user.address.permanentAddress, 'Sylhet'],
      },
    }, false, { revision: 3, sections: [], questions: [notes, multi] });
    expect(visible[notes.id]).toBeUndefined();
    expect(visible[multi.id]).toEqual(['Dhaka', 'Sylhet']);
    expect(JSON.stringify(visible)).not.toContain('Road 3');
  });
});
