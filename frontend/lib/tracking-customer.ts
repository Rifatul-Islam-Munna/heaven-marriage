import { countries } from '@/staticData/countries';

export type TrackingUser = {
  _id?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  residenceCountry?: string;
  address?: {
    presentAddress?: string;
    district?: string;
    upazila?: string;
    cityCorporation?: string;
  };
};

export type PurchaseReceipt = {
  order_id: string;
  event_id: string;
  user_id: string;
  status: 'paid';
  purpose: 'premium' | 'connections';
  ecommerce: {
    transaction_id: string;
    affiliation: string;
    value: number;
    tax: number;
    shipping: number;
    currency: 'BDT';
    items: {
      item_id: string;
      item_name: string;
      item_category: string;
      affiliation?: string;
      price: number;
      quantity: number;
      connection_credits?: number;
    }[];
  };
};

export const emptyCustomerContext = {
  external_id: null,
  customer_information: null,
  user_data: null,
};

function clean(value?: string) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function phoneDigits(phone?: string) {
  let digits = clean(phone).replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6)).replace(/\D/g, '');
  if (/^01[3-9]\d{8}$/.test(digits)) digits = '88' + digits;
  if (digits.startsWith('00')) digits = digits.slice(2);
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : '';
}

async function sha256(value: string) {
  if (!value || !globalThis.crypto?.subtle) return null;
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch { return null; }
}

export async function buildCustomerContext(user: TrackingUser | null) {
  if (!user?._id) return emptyCustomerContext;
  const parts = clean(user.name).split(' ').filter(Boolean);
  const firstName = parts.shift() || '';
  const lastName = parts.join(' ');
  const city = clean(user.address?.cityCorporation || user.address?.upazila || user.address?.district);
  const rawCountry = clean(user.residenceCountry);
  const country = countries.find((item) =>
    [item.code, item.en, item.bn].some((value) => value.toLowerCase() === rawCountry.toLowerCase()) ||
    (rawCountry === 'বাংলাদেশ' && item.code === 'BD'));
  const countryCode = country?.code || '';
  const [externalId, email, phone, first, last, cityHash, countryHash] = await Promise.all([
    sha256(user._id), sha256(clean(user.email).toLowerCase()), sha256(phoneDigits(user.phoneNumber)),
    sha256(firstName.toLowerCase()), sha256(lastName.toLowerCase()),
    sha256(city.toLowerCase().replace(/[0-9.\s\-()]/g, '')), sha256(countryCode.toLowerCase()),
  ]);
  return {
    external_id: externalId,
    customer_information: {
      first_name: firstName || null,
      last_name: lastName || null,
      phone: clean(user.phoneNumber) || null,
      address_1: clean(user.address?.presentAddress) || null,
      city: city || null,
      country: country?.en || rawCountry || null,
      country_code: countryCode || null,
    },
    // This is a GTM mapping payload, not a direct request to Meta or Google.
    user_data: externalId ? [{
      external_id: externalId, em: email, ph: phone, fn: first, ln: last,
      ct: cityHash, country: countryHash, country_code: countryHash,
    }] : null,
  };
}
