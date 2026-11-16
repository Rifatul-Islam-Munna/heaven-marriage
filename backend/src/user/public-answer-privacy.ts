/**
 * Public biodata privacy guard used by both built-in fields and Question Builder
 * answers. Never splice a redaction token into a saved value: that corrupts
 * district names and multi-select labels. An unsafe scalar is omitted instead;
 * safe siblings in arrays and objects remain visible.
 */
const publicLocationPaths = new Set([
  'address.district', 'address.upazila', 'address.cityCorporation',
  'address.area', 'nationality', 'residenceCountry',
]);
const hiddenMarker = '[সংরক্ষিত]';
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /(?:\+?\d[\d\s()-]{8,}\d)/;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function publicAnswerSanitizer(profile: any) {
  const secrets = [
    profile.name, profile.fatherName, profile.motherName,
    profile.phoneNumber, profile.whatsapp, profile.guardianPhone,
    profile.email, profile.address?.presentAddress,
    profile.address?.permanentAddress,
  ].filter((secret): secret is string =>
    typeof secret === 'string' && secret.length >= 3);

  const privateAddresses = [
    profile.address?.presentAddress, profile.address?.permanentAddress,
  ].filter((value): value is string =>
    typeof value === 'string' && value.length > 0);

  const clean = (value: any, path = ''): any => {
    if (typeof value === 'string') {
      if (!value.trim() || value.includes(hiddenMarker) || emailPattern.test(value) ||
          (!isoDatePattern.test(value) && phonePattern.test(value))) return undefined;

      // An intentionally public, structured location may contain the same
      // word as a person's name. Do not delete a legitimate place name.
      if (publicLocationPaths.has(path)) {
        if (path === 'address.area' && privateAddresses.includes(value))
          return undefined;
        return value;
      }

      // Unknown and user-created questions have no safe schema constraints:
      // suppress the entire value if it contains any private identity/contact
      // detail. The full answer remains saved for the member and staff.
      if (secrets.some(secret => value.includes(secret))) return undefined;
      return value;
    }
    // Numeric custom answers can also contain a phone number. Short numeric
    // answers (age, weight, counts) are safe and remain intact.
    if (typeof value === 'number' && Number.isInteger(value) &&
        String(Math.abs(value)).length >= 10) return undefined;
    if (value instanceof Date || value?.toHexString) return value;
    if (Array.isArray(value)) {
      const kept = value.map(item => clean(item, path))
        .filter(item => item !== undefined && item !== null);
      return kept.length ? kept : undefined;
    }
    if (value instanceof Map) {
      return clean(Object.fromEntries(value), path);
    }
    if (value && typeof value === 'object') {
      const kept = Object.entries(value)
        .map(([key, item]) => [key, key === 'dateOfBirth'
          ? item : clean(item, path ? path + '.' + key : key)] as const)
        .filter(([, item]) => item !== undefined && item !== null);
      return Object.fromEntries(kept);
    }
    return value;
  };
  return clean;
}
