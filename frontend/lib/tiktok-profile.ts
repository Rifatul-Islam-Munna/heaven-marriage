export const DEFAULT_NIQAHA_TIKTOK = "https://www.tiktok.com/@niqaha.com";

/** Only official HTTPS TikTok profile URLs; empty values intentionally disable the link. */
export function normalizeTikTokProfile(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !["www.tiktok.com", "tiktok.com"].includes(url.hostname) ||
      url.username || url.password || url.port ||
      !/^\/@[A-Za-z0-9._]{2,40}\/?$/.test(url.pathname)
    ) return null;
    return "https://www.tiktok.com" + url.pathname.replace(/\/$/, "");
  } catch {
    return null;
  }
}
