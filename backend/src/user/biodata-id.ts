/** Accept the displayed biodata number as well as its zero-padded numeric ID. */
export function biodataIdFilter(value?: string) {
  const normalized = value?.trim().replace(/^#\s*/, "")
    .replace(/[০-৯]/g, digit => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
  const match = normalized?.match(/^(?:(NG|NB)\s*[-–—]?\s*)?(\d+)$/i);
  if (!match) return undefined;
  const digits = match[2].replace(/^0+(?=\d)/, "");
  return {
    userId: { $regex: `^0*${digits}$` },
    ...(match[1] ? { gender: match[1].toUpperCase() === 'NG' ? 'male' : 'female' } : {}),
  };
}
