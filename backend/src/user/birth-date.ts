import { BadRequestException } from '@nestjs/common';

export function ageFromBirthDate(value: unknown, today = new Date()): number | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day) return undefined;
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--;
  return age >= 0 && age <= 120 && birth.getTime() <= today.getTime() ? age : undefined;
}

/** Keep legacy ages until a real date is supplied; never invent a birthday. */
export function applyBirthDate(payload: Record<string, any>, current: Record<string, any> = {}) {
  const supplied = Object.hasOwn(payload, 'dateOfBirth');
  if (supplied && !payload.dateOfBirth && current.dateOfBirth)
    throw new BadRequestException('Saved birth date cannot be removed');
  const value = supplied ? payload.dateOfBirth : current.dateOfBirth;
  if (!value) return;
  const age = ageFromBirthDate(value);
  if (age === undefined) throw new BadRequestException('Enter a valid birth date in YYYY-MM-DD format');
  payload.age = age;
}
