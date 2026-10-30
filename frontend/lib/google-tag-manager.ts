"use client";

export type ConversionEvent = "ViewContent" | "Search" | "Contact" | "Lead" | "CompleteRegistration";
type SafePayload = { event_id?: string; method?: "phone" | "email" | "google" | "call" | "whatsapp" | "messenger" | "form" | "interest"; page_type?: string };

const emitted = new Set<string>();
export function hasTrackingConsent() {
  try { return localStorage.getItem("niqaha_tracking_consent") === "granted"; } catch { return false; }
}
export function safePage(path: string) {
  const clean = path.split(/[?#]/)[0];
  if (clean.startsWith("/biodata/")) return "/biodata/profile";
  if (["/", "/about", "/contact", "/faq", "/guidelines", "/pricing", "/biodata", "/signup", "/login", "/premium", "/policies/terms", "/policies/refund", "/policies/privacy"].includes(clean)) return clean;
  return "/private";
}
export function trackEvent(event: ConversionEvent | "page_view", payload: SafePayload = {}, dedupeKey?: string) {
  if (typeof window === "undefined" || !hasTrackingConsent()) return;
  const key = dedupeKey ? event + ":" + dedupeKey : undefined;
  if (key && emitted.has(key)) return;
  if (key) emitted.add(key);
  if(safePage(location.pathname)==="/private" && event!=="CompleteRegistration")return;
  // Explicit allowlist: never spread biodata, identifiers, titles, URLs, or search values.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event, event_id: payload.event_id || crypto.randomUUID(),
    page_location: location.origin + safePage(location.pathname),
    page_path: safePage(location.pathname), page_title: "Niqaha.com",
    page_referrer: "", content_type: "biodata",
    ...(payload.method ? { contact_method: payload.method } : {}),
    analytics_consent: "granted",
  });
}
export const pageViewEvent = (_payload?: unknown) => trackEvent("page_view");
export const viewContentEvent = (_payload?: unknown, key?: string) => trackEvent("ViewContent", {}, key);
export const searchEvent = () => trackEvent("Search");
export const contactEvent = (method: SafePayload["method"]) => trackEvent("Contact", { method });
export const leadEvent = (key: string, method: SafePayload["method"] = "form") => trackEvent("Lead", { method }, key);
export const registrationEvent = (key: string, method: SafePayload["method"]) => trackEvent("CompleteRegistration", { method }, key);
