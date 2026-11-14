export function ageFromBirthDate(value?: string | null, today = new Date()): number | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day) return undefined;
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--;
  return age >= 0 && age <= 120 && birth.getTime() <= today.getTime() ? age : undefined;
}

export function latestBirthDate(today = new Date()): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function formatBirthDate(value?: string | null): string {
  if (ageFromBirthDate(value) === undefined) return "";
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("bn-BD", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}
