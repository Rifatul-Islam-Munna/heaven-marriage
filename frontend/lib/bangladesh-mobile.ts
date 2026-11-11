/**
 * Normalize Bangladeshi mobile input to its 11-digit local form (01XXXXXXXXX).
 * The UI never requires a country code, but accepts pasted +880/880 formats.
 */
export function normalizeBangladeshMobile(value: string): string | null {
  const cleaned = String(value || "")
    .replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)))
    .replace(/[\s()-]/g, "");

  let local = cleaned;
  if (/^\+8801[3-9]\d{8}$/.test(cleaned)) {
    local = "0" + cleaned.slice(4);
  } else if (/^8801[3-9]\d{8}$/.test(cleaned)) {
    local = "0" + cleaned.slice(3);
  } else if (/^1[3-9]\d{8}$/.test(cleaned)) {
    local = "0" + cleaned;
  }

  return /^01[3-9]\d{8}$/.test(local) ? local : null;
}
