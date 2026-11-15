"use client";

import { getTrackingUser } from "@/actions/auth";
import { buildCustomerContext, emptyCustomerContext, type PurchaseReceipt, type TrackingUser } from "./tracking-customer";
export type { PurchaseReceipt, TrackingUser } from "./tracking-customer";

export type AuthMethod = "phone" | "email" | "google";
export type ConversionEvent = "ViewContent" | "Search" | "Contact" | "Lead" | "CompleteRegistration";
type TrackingEvent = ConversionEvent | "page_view" | "login" | "sign_up" | "purchase";
type SafePayload = {
  event_id?: string;
  method?: AuthMethod | "call" | "whatsapp" | "messenger" | "form" | "interest";
  purchase?: PurchaseReceipt;
};

const emitted = new Set<string>();
const newAccountKey = "niqaha_tracking_new_account";
let currentUser: TrackingUser | null | undefined;
let userRequest: Promise<void> | undefined;
let authRevision = 0;
let newAccountId: string | null = null;
let consentDenied = false;

export function hasTrackingConsent() {
  if (consentDenied) return false;
  try { return localStorage.getItem("niqaha_tracking_consent_v3") === "granted"; } catch { return false; }
}

export function updateTrackingConsent(value: "granted" | "denied") {
  consentDenied = value === "denied";
  try {
    localStorage.setItem("niqaha_tracking_consent_v3", value);
    return true;
  } catch {
    // A failed write must not leave an earlier grant active in this tab.
    consentDenied = true;
    return false;
  }
}

function setTrackingUser(user: TrackingUser, isNewUser: boolean) {
  if (!user._id) return false;
  authRevision += 1;
  currentUser = {
    _id: user._id, name: user.name, email: user.email, phoneNumber: user.phoneNumber,
    residenceCountry: user.residenceCountry,
    address: user.address ? {
      presentAddress: user.address.presentAddress, cityCorporation: user.address.cityCorporation,
      upazila: user.address.upazila, district: user.address.district,
    } : undefined,
  };
  newAccountId = isNewUser ? user._id : null;
  if (hasTrackingConsent()) {
    try {
      if (newAccountId) sessionStorage.setItem(newAccountKey, newAccountId);
      else sessionStorage.removeItem(newAccountKey);
    } catch { /* In-memory identity still works when storage is unavailable. */ }
  }
  return true;
}

async function resolveTrackingUser(refresh: boolean) {
  if (!refresh && currentUser !== undefined) return currentUser;
  if (!userRequest) {
    const revision = authRevision;
    userRequest = getTrackingUser().then((user) => {
      // A lookup started before login/logout must not overwrite the new identity.
      if (revision === authRevision) currentUser = user;
    }).catch(() => {
      // Skip events with unresolved identity; a later event can retry.
      if (revision === authRevision) currentUser = undefined;
    }).finally(() => { userRequest = undefined; });
  }
  await userRequest;
  return currentUser;
}

function userContext(user: TrackingUser | null) {
  let isNewUser = newAccountId === user?._id;
  try { isNewUser ||= sessionStorage.getItem(newAccountKey) === user?._id; } catch { /* Optional session metadata. */ }
  return {
    user_id: user?._id ?? null,
    login_status: user ? "logged_in" : "logged_out",
    user_type: user ? (isNewUser ? "new" : "returning") : "guest",
    // Keep personal details separate. Never map this object to GA4 event parameters.
    user_details: user ? {
      name: user.name || null,
      phone_number: user.phoneNumber || null,
    } : null,
  };
}

export function clearTrackingUser() {
  authRevision += 1;
  currentUser = null;
  newAccountId = null;
  try { sessionStorage.removeItem(newAccountKey); } catch { /* Storage may be unavailable. */ }
  const cleared = {
    ...userContext(null), ...emptyCustomerContext,
    action_source: "website", ecommerce: null, order_id: null, method: null, contact_method: null,
  };
  // Clearing values is also needed after consent revocation to remove stale GTM data.
  if (typeof window !== "undefined" && window.dataLayer) {
    try {
      window.dataLayer.push(cleared);
    } catch { /* Optional tracking must not interrupt logout. */ }
  }
  return cleared;
}

export function safePage(path: string) {
  const clean = path.split(/[?#]/)[0];
  if (clean.startsWith("/biodata/")) return "/biodata/profile";
  if (["/", "/about", "/contact", "/faq", "/guidelines", "/pricing", "/biodata", "/signup", "/login", "/premium", "/policies/terms", "/policies/refund", "/policies/privacy"].includes(clean)) return clean;
  return "/private";
}

export async function trackEvent(event: TrackingEvent, payload: SafePayload = {}, dedupeKey?: string) {
  if (typeof window === "undefined" || !hasTrackingConsent()) return;
  const pagePath = safePage(location.pathname);
  const pageLocation = location.origin + pagePath;
  if (pagePath === "/private" && !["CompleteRegistration", "login", "sign_up", "purchase"].includes(event)) return;

  const purchase = event === "purchase" ? payload.purchase : undefined;
  if (event === "purchase" && !validPurchase(purchase)) return;

  const revision = authRevision;
  const user = await resolveTrackingUser(event === "page_view");
  if (user === undefined || revision !== authRevision || !hasTrackingConsent()) return;
  if (purchase && user?._id !== purchase.user_id) return;
  const customer = await buildCustomerContext(user);
  // Hashing is asynchronous, so recheck auth/consent before pushing any details.
  if (revision !== authRevision || !hasTrackingConsent()) return;
  const key = dedupeKey ? `${event}:${user?._id ?? "guest"}:${dedupeKey}` : undefined;
  if (key && emitted.has(key)) return;
  const purchaseKey = purchase ? `niqaha_tracking_purchase:${user?._id}:${purchase.order_id}` : null;
  try { if (purchaseKey && localStorage.getItem(purchaseKey)) return; } catch { /* In-memory deduplication remains active. */ }
  const isAuthEvent = ["CompleteRegistration", "login", "sign_up"].includes(event);

  // Never spread arbitrary event payloads or details of the biodata being viewed.
  try {
    window.dataLayer = window.dataLayer || [];
    if (purchase) window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event,
      event_id: purchase?.event_id || payload.event_id || crypto.randomUUID(),
      action_source: "website",
      page_location: pageLocation,
      page_path: pagePath,
      page_title: "Niqaha.com",
      page_referrer: "",
      content_type: purchase?.purpose || "biodata",
      ...userContext(user),
      ...customer,
      order_id: purchase?.order_id ?? null,
      ecommerce: purchase ? {
        transaction_id: purchase.ecommerce.transaction_id,
        affiliation: purchase.ecommerce.affiliation,
        value: purchase.ecommerce.value, tax: purchase.ecommerce.tax,
        shipping: purchase.ecommerce.shipping, currency: purchase.ecommerce.currency,
        items: purchase.ecommerce.items.map((item) => ({
          item_id: item.item_id, item_name: item.item_name, item_category: item.item_category,
          affiliation: item.affiliation || purchase.ecommerce.affiliation,
          price: item.price, quantity: item.quantity,
          ...(item.connection_credits ? { connection_credits: item.connection_credits } : {}),
        })),
      } : null,
      method: isAuthEvent ? payload.method ?? null : null,
      contact_method: event !== "login" && event !== "sign_up" ? payload.method ?? null : null,
      analytics_consent: "granted",
    });
    if (key) emitted.add(key);
    if (purchaseKey) {
      try { localStorage.setItem(purchaseKey, "1"); } catch { /* Stable event/transaction IDs also support destination deduplication. */ }
    }
  } catch { /* Optional tracking must not interrupt a successful login/signup. */ }
}

function validPurchase(receipt?: PurchaseReceipt) {
  if (!receipt || receipt.status !== "paid" || !receipt.order_id || !receipt.user_id ||
    receipt.event_id !== receipt.order_id || !["premium", "connections"].includes(receipt.purpose)) return false;
  const e = receipt.ecommerce;
  return !!e && e.transaction_id === receipt.order_id && e.currency === "BDT" &&
    Number.isFinite(e.value) && e.value > 0 && Number.isFinite(e.tax) && e.tax >= 0 &&
    Number.isFinite(e.shipping) && e.shipping >= 0 && Array.isArray(e.items) &&
    e.items.length > 0 && e.items.length <= 200 && e.items.every((item) =>
      !!item.item_id && !!item.item_name && Number.isFinite(item.price) && item.price >= 0 &&
      Number.isInteger(item.quantity) && item.quantity > 0) &&
    Math.abs(e.items.reduce((total, item) => total + item.price * item.quantity, 0) - e.value) < 0.01;
}

export const purchaseEvent = (receipt: PurchaseReceipt) =>
  trackEvent("purchase", { purchase: receipt }, receipt?.order_id);

export const pageViewEvent = (_payload?: unknown) => trackEvent("page_view");
export const viewContentEvent = (_payload?: unknown, key?: string) => trackEvent("ViewContent", {}, key);
export const searchEvent = () => trackEvent("Search");
export const contactEvent = (method: SafePayload["method"]) => trackEvent("Contact", { method });
export const leadEvent = (key: string, method: SafePayload["method"] = "form") => trackEvent("Lead", { method }, key);
export async function loginEvent(user: TrackingUser, method: AuthMethod) {
  if (!setTrackingUser(user, false)) return;
  return trackEvent("login", { method });
}
export async function registrationEvent(user: TrackingUser, method: AuthMethod) {
  if (!setTrackingUser(user, true)) return;
  await trackEvent("CompleteRegistration", { method }, user._id);
  await trackEvent("sign_up", { method }, user._id);
}
