# GTM tracking

All app events require the updated cookie consent (`niqaha_tracking_consent_v3`).
Earlier consent versions do not authorize the expanded collection. The notice
discloses available account names, email, phone, and address for tracking.

## Events

| Event | Trigger | Method |
| --- | --- | --- |
| `page_view` | Public page navigation or accepting consent | — |
| `ViewContent` | Biodata profile loaded | — |
| `Search` | Search button or filter change | — |
| `Contact` | Contact link click | `call`, `whatsapp`, `messenger` |
| `Lead` | Successful contact form or new shortlist entry | `form`, `interest` |
| `CompleteRegistration` | Successful OTP signup or new Google account | `phone`, `email`, `google` |
| `sign_up` | Same successful registration; GA4 event name | `phone`, `email`, `google` |
| `login` | Successful existing-account login | `phone`, `email`, `google` |
| `purchase` | Verified paid premium/connection order after returning from bKash | — |
| `consent_revoked` | Declining/revoking consent | — |

Signup emits both `CompleteRegistration` and `sign_up` for compatibility. Use
`sign_up` for GA4 registration measurement and retain `CompleteRegistration` for
existing tags; do not count both as separate GA4 signups. New Google accounts emit
signup events; existing Google accounts emit `login`. Failed auth emits neither.

## Example: signed-in user searches

```js
{
  event: "Search",
  event_id: "<random UUID>",
  action_source: "website",
  page_location: "https://niqaha.com/biodata",
  page_path: "/biodata",
  page_title: "Niqaha.com",
  page_referrer: "",
  content_type: "biodata",
  user_id: "507f1f77bcf86cd799439011",
  login_status: "logged_in",
  user_type: "returning",
  user_details: {
    name: "Example User",
    phone_number: "01700000000"
  },
  external_id: "<SHA-256 account ID>",
  customer_information: {
    first_name: "Example",
    last_name: "User",
    phone: "01700000000",
    address_1: null,
    city: null,
    country: null,
    country_code: null
  },
  user_data: [{
    external_id: "<SHA-256 account ID>",
    em: null,
    ph: "<SHA-256 normalized phone>",
    fn: "<SHA-256 first name>",
    ln: "<SHA-256 last name>",
    ct: null,
    country: null,
    country_code: null
  }],
  order_id: null,
  ecommerce: null,
  method: null,
  contact_method: null,
  analytics_consent: "granted"
}
```

Auth events additionally set `method`. Existing registration tags still receive
`contact_method`; contact/lead events use `contact_method` as before. Every event
resets unused methods to `null` so GTM does not reuse stale values.

`user_type` describes account status: `new` after signup in the current tab session,
`returning` for an existing account, and `guest` when signed out. It does not claim
to identify returning anonymous visitors. New-account status survives a reload in
the same tab. Guests have null identity/customer fields. Consent-revocation events
clear identity instead of attaching personal data.

Identity comes from the authenticated account, not search input or the biodata
being viewed. The protected `/platform/tracking/user` endpoint projects only
tracking contact/address fields from that account. Initial events await identity
lookup; page views refresh it. Auth callbacks can use the verified auth response;
fields absent from that response remain null until a profile refresh.
Logout, account switching, and consent revocation clear the current GTM identity.
Private routes remain excluded except successful auth and purchase events, whose
URLs become `/private`. Biodata profile URLs become `/biodata/profile`.

## Customer information and matching hashes

Every consented app event carries available `customer_information`, `user_data`,
`external_id`, and `action_source: "website"`, in addition to the existing user
fields. Missing data stays null; names, emails, addresses, and other biodata fields
are not guessed. The first word of the account name becomes `first_name`; remaining
words become `last_name`. A one-word name has no last name and no `ln` hash.

Matching fields use SHA-256 and lowercase hexadecimal output:

- `external_id`: opaque internal account ID.
- `em`: trimmed, lowercase email; raw email is not added to the data layer.
- `ph`: phone digits including country calling code; Bangladeshi local numbers are
  normalized to `8801…` before hashing. Bengali digits are supported.
- `fn`, `ln`: lowercase first/last name derived from the account name.
- `ct`: lowercase city with numbers, spaces, periods, hyphens, and parentheses
  removed, following Meta's SDK normalization.
- `country`, `country_code`: lowercase ISO country code, e.g. `bd`, **not** the
  full word `bangladesh`. Unknown residence countries are not inferred from phone.

If browser Web Crypto is unavailable, hashes stay null. The raw customer object
is separate from the hash array. This custom GTM `user_data: [{…}]` shape needs
explicit destination mapping; it is not a direct Meta Conversions API request.
For a Meta server event, map its first element to the destination's supported
`user_data` fields and map lowercase `purchase` to Meta's `Purchase` event name.
Omit null fields and unsupported aliases; `country_code` is an internal GTM alias,
while Meta uses the `country` hash. Never send the raw customer object as GA4 event
parameters.

## Purchase example

Both premium and connection-package checkout use `purchase`:

```js
{
  event: "purchase",
  action_source: "website",
  order_id: "<verified order UUID>",
  event_id: "<same verified order UUID>",
  external_id: "<SHA-256 account ID>",
  ecommerce: {
    transaction_id: "<same verified order UUID>",
    affiliation: "Niqaha.com",
    value: 1250,
    tax: 0,
    shipping: 0,
    currency: "BDT",
    items: [{
      item_id: "premium",
      item_name: "Premium membership",
      item_category: "Premium",
      affiliation: "Niqaha.com",
      price: 1250,
      quantity: 1
    }]
  },
  customer_information: { /* available signed-in account details, as above */ },
  user_data: [{ /* normalized SHA-256 matching fields, as above */ }]
  // Common page/user/consent fields are also included.
}
```

The amount is illustrative; runtime value comes from the paid order, including
the premium service fee if charged. A connection package is one purchased item;
its included credit count appears as item `connection_credits`. Digital services
have no shipping charge or separate tax in the current order model.

Successful gateway callbacks forward `purpose` and an encoded `payment_id` to
the success page. `PurchaseTracker` requests `/platform/tracking/purchase` with
the authenticated token. The API requires the order to belong to that account
and have `status: paid`. Pending, failed, refunded, unknown, and other-account
orders cannot produce a receipt. Amounts and items do not come from URL params.

Purchases are suppressed on repeat renders and reloads using the order ID and a
consent-gated localStorage marker. Stable event/transaction IDs support destination
deduplication too; browser markers do not guarantee cross-device suppression or
tag delivery. Ecommerce is cleared before each purchase and on non-purchase
events. Consent accepted on the success page retries tracking without reload.

This browser event requires a return to the success page and consent. Closing the
checkout before returning, a blocked tag, or an offline/manual payment does not
automatically generate a browser conversion. No CAPI/server-side dispatch is added.

## GTM configuration still required

- Deploy the backend receipt/customer endpoints together with the frontend change.
- Add Custom Event triggers for `login`, `sign_up`, and `purchase` and corresponding
  GA4 tags. For purchase, enable **Send Ecommerce data → Data Layer**.
- Create Data Layer Variables for `user_id`, `login_status`, `user_type`, `method`,
  and any existing event parameters needed by your tags.
- Set `user_id` in the Google tag's **configuration settings** using the data layer
  variable. Do not register it as a custom dimension or ordinary event parameter.
- `user_details` and `customer_information` are separate, consented personal data.
  **Do not forward them or matching hashes to GA4 as ordinary event parameters,
  custom dimensions, or user properties.** Use only an appropriately configured destination for
  personal data. Google's user-provided-data matching feature requires its own
  supported setup; this code does not enable or configure it.
- Map only explicitly allowed fields. Do not serialize the entire data layer.

The code changes do not publish or change the live GTM container.

References: [Google's PII guidance](https://support.google.com/analytics/answer/6366371?hl=en),
[User-ID configuration](https://developers.google.com/analytics/devguides/collection/ga4/user-id),
[Google ecommerce setup](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce?client_type=gtm),
[Meta SDK normalization](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/normalize.py).
