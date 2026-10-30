export function normalizeMessengerUrl(value: string): string {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : "https://" + text);
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return "";
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const allowed =
      host === "m.me"
        ? /^\/[A-Za-z0-9._-]+\/?$/.test(url.pathname)
        : host === "messenger.com"
          ? /^\/t\/[A-Za-z0-9._-]+\/?$/.test(url.pathname)
          : host === "facebook.com" &&
            /^\/messages\/t\/[A-Za-z0-9._-]+\/?$/.test(url.pathname);
    if (!allowed) return "";
    url.hostname = host;
    url.hash = "";
    for (const key of [...url.searchParams.keys()])
      if (key !== "ref") url.searchParams.delete(key);
    return url.toString();
  } catch {
    return "";
  }
}
