import { ageFromBirthDate, applyBirthDate } from './birth-date';
import { completion, publicProfile } from './profile-rules';
import { BUILTINS } from '../profile-questions/question-config.service';

describe('Saved birth dates', () => {
  const today = new Date(2026, 10, 13, 12);
  it('calculates completed years across the birthday', () => {
    expect(ageFromBirthDate('2000-11-14', today)).toBe(25);
    expect(ageFromBirthDate('2000-11-13', today)).toBe(26);
    expect(ageFromBirthDate('2000-11-12', today)).toBe(26);
    expect(ageFromBirthDate('2000-02-29', today)).toBe(26);
  });
  it.each(['2001-02-29', '2000-13-01', '2000-04-31', '13/11/2000', '2999-01-01', '', null])(
    'rejects invalid or future date %s', value => expect(ageFromBirthDate(value, today)).toBeUndefined(),
  );
  it('stores age from the entered date instead of trusting a supplied age', () => {
    const payload = { dateOfBirth: '2000-05-15', age: 99 };
    applyBirthDate(payload);
    expect(payload.age).toBe(ageFromBirthDate(payload.dateOfBirth));
  });
  it('preserves legacy age without inventing a birthday', () => {
    const payload = { age: 30 };
    applyBirthDate(payload);
    expect(payload).toEqual({ age: 30 });
  });
  it('prevents clearing a saved birthday but permits correcting it', () => {
    const current = { dateOfBirth: '2000-05-15' };
    expect(() => applyBirthDate({ dateOfBirth: '' }, current)).toThrow('cannot be removed');
    expect(() => applyBirthDate({ dateOfBirth: null }, current)).toThrow('cannot be removed');
    const correction = { dateOfBirth: '2001-05-15' };
    applyBirthDate(correction, current);
    expect(correction).toMatchObject({ age: ageFromBirthDate(correction.dateOfBirth) });
  });
  it('counts a birth date as required and does not mistake it for a phone number', () => {
    const questions = BUILTINS.filter(q => q.path === 'dateOfBirth');
    expect(completion({}, questions).percentage).toBe(0);
    expect(completion({ dateOfBirth: '2000-05-15' }, questions).percentage).toBe(100);
    expect(publicProfile({ dateOfBirth: '2000-05-15' }).dateOfBirth).toBe('2000-05-15');
  });
  it('shows saved full addresses after identity unlock without exposing them before unlock', () => {
    const user = { address: { district: 'Dhaka', presentAddress: 'Current street', permanentAddress: 'Permanent village' } };
    expect(publicProfile(user).address.presentAddress).toBeUndefined();
    expect(publicProfile(user, true).address).toMatchObject(user.address);
  });
});
