import { ValidateBy, buildMessage, ValidationOptions } from 'class-validator';

/** Count whitespace-separated Unicode words, not characters; same rule as the admin UI. */
export function countWords(value: unknown): number {
  if (typeof value !== 'string') return 0;
  const text = value.trim();
  return text ? text.split(/\s+/u).length : 0;
}
export function MaxWords(maximum: number, options?: ValidationOptions) {
  return ValidateBy({
    name: 'maxWords',
    constraints: [maximum],
    validator: {
      validate: (value: unknown) => typeof value === 'string' && countWords(value) <= maximum,
      defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must contain no more than $constraint1 words', options),
    },
  }, options);
}
