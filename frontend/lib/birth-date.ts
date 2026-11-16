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

/** Separate UI fields are only assembled after all three values form a real date. */
export type BirthDateParts = { day: string; month: string; year: string };

export function birthDateParts(value?: string | null): BirthDateParts {
  if (ageFromBirthDate(value) === undefined) return { day: "", month: "", year: "" };
  const [year, month, day] = value!.split("-");
  return { day, month, year };
}

export function daysInBirthMonth(month: string, year: string): number {
  if (!/^(0?[1-9]|1[0-2])$/.test(month)) return 31;
  const y = /^\d{4}$/.test(year) ? Number(year) : 2024; // Leap-year preview until a year is chosen.
  return new Date(Date.UTC(y, Number(month), 0)).getUTCDate();
}

export function completeBirthDate(parts: BirthDateParts, today = new Date()): string | undefined {
  const { day, month, year } = parts;
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) return undefined;
  const iso = `${year}-${month}-${day}`;
  return ageFromBirthDate(iso, today) !== undefined ? iso : undefined;
}

export function formatBirthDate(value?: string | null): string {
  if (ageFromBirthDate(value) === undefined) return "";
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("bn-BD", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}
