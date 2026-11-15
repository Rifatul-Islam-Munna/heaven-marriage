const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const ts = require("typescript");
const { createHash, webcrypto } = require("node:crypto");

function compile(relativePath) {
  return ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
}
const code = compile("lib/google-tag-manager.ts");
const plain = (value) => JSON.parse(JSON.stringify(value));
function storage(values = new Map()) {
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}
function setup(options = {}) {
  let seq = 0;
  const local = options.local ?? storage();
  if (options.consent !== null) local.setItem("niqaha_tracking_consent_v3", options.consent ?? "granted");
  const state = { user: options.user ?? null, lookups: 0, lookup: null };
  const sandbox = {
    exports: {},
    require: (name) => {
      if (name === "./tracking-customer") return customerExports;
      assert.equal(name, "@/actions/auth");
      return { getTrackingUser: async () => {
        state.lookups++;
        return state.lookup ? state.lookup() : state.user;
      } };
    },
    window: { dataLayer: [], location: { search: "" } },
    location: { origin: "https://niqaha.com", pathname: "/biodata/123" },
    localStorage: local,
    sessionStorage: options.session ?? storage(),
    crypto: { randomUUID: () => String(++seq), subtle: webcrypto.subtle },
    TextEncoder,
  };
  const customerExports = {};
  vm.runInNewContext(compile("lib/tracking-customer.ts"), {
    exports: customerExports, crypto: sandbox.crypto, TextEncoder,
    require: () => ({ countries: [
      { code: "BD", en: "Bangladesh", bn: "Bangladesh" },
      { code: "GB", en: "United Kingdom", bn: "United Kingdom" },
    ] }),
  });
  vm.runInNewContext(code, sandbox);
  return { api: sandbox.exports, sandbox, state, events: sandbox.window.dataLayer, local, customer: customerExports };
}
const alice = { _id: "507f1f77bcf86cd799439011", name: "Example User", phoneNumber: "01700000000", password: "never-track-password" };
const bob = { _id: "507f191e810c19729de860ea", name: "Second User" };

function authCallback(relativePath, tracking, identifier = "01700000000") {
  let mutation;
  const noop = () => {};
  const sandbox = {
    exports: {},
    process: { env: { NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID: "test-client" } },
    window: tracking.sandbox.window,
    sessionStorage: tracking.sandbox.sessionStorage,
    URLSearchParams,
    require: (name) => {
      if (name === "react/jsx-runtime") return { jsx: noop, jsxs: noop };
      if (name === "react") return {
        useState: (initial) => [initial && typeof initial === "object" && "phoneNumber" in initial ? { ...initial, phoneNumber: identifier } : initial, noop],
        useRef: () => ({ current: null }), useEffect: noop,
      };
      if (name === "@tanstack/react-query") return {
        useMutation: (options) => { mutation = options; return { mutate: noop, isPending: false }; },
        useQueryClient: () => ({ clear: noop }),
      };
      if (name === "@/lib/google-tag-manager") return tracking.api;
      if (name === "next/navigation") return { useRouter: () => ({ push: noop, replace: noop, refresh: noop }) };
      if (name === "@/lib/useUser") return { useUser: () => ({ refetch: noop }) };
      if (name === "sonner") return { toast: { error: noop, success: noop } };
      return {};
    },
  };
  vm.runInNewContext(compile(relativePath), sandbox);
  sandbox.exports.default({});
  assert(mutation, "Component did not register its auth mutation");
  return mutation.onSuccess;
}

function mountPurchaseTracker(tracking, search, receipt) {
  const calls = [], tasks = [], listeners = new Map();
  let cleanup;
  const sandbox = {
    exports: {}, URLSearchParams,
    window: {
      location: { search },
      addEventListener: (name, listener) => listeners.set(name, listener),
      removeEventListener: (name) => listeners.delete(name),
    },
    require: (name) => {
      if (name === "react") return { useEffect: (effect) => { cleanup = effect(); } };
      if (name === "@/actions/auth") return { getTrackingPurchase: async (...args) => {
        calls.push(args);
        return typeof receipt === "function" ? receipt() : receipt;
      } };
      if (name === "./google-tag-manager") return { ...tracking.api, purchaseEvent: (value) => {
        const task = tracking.api.purchaseEvent(value);
        tasks.push(task);
        return task;
      } };
      throw new Error("Unexpected purchase tracker import: " + name);
    },
  };
  vm.runInNewContext(compile("lib/PurchaseTracker.tsx"), sandbox);
  sandbox.exports.default();
  return { calls, listeners, cleanup: () => cleanup?.(),
    settle: async () => { await new Promise(setImmediate); await Promise.all(tasks); } };
}

function receipt(purpose = "premium") {
  return { order_id: "invoice-1", event_id: "invoice-1", user_id: alice._id, status: "paid", purpose,
    ecommerce: { transaction_id: "invoice-1", affiliation: "Niqaha.com", value: 1250, tax: 0, shipping: 0, currency: "BDT",
      items: [{ item_id: purpose === "premium" ? "premium" : "package-1", item_name: "Example plan",
        item_category: purpose === "premium" ? "Premium" : "Connections", price: 1250, quantity: 1,
        ...(purpose === "connections" ? { connection_credits: 10 } : {}) }] } };
}

async function main() {
  const denied = setup({ consent: "denied", user: alice });
  await denied.api.registrationEvent(alice, "phone");
  await denied.api.pageViewEvent();
  await denied.api.searchEvent();
  assert.equal(denied.events.length, 0);
  assert.equal(denied.state.lookups, 0);
  assert.equal(denied.sandbox.sessionStorage.getItem("niqaha_tracking_new_account"), null);
  const legacy = setup({ consent: null });
  legacy.local.setItem("niqaha_tracking_consent", "granted");
  await legacy.api.searchEvent();
  assert.equal(legacy.events.length, 0, "Old consent must not authorize account details");
  for (const choice of ["granted", "denied"]) {
    const blockedStorage = setup({ user: alice });
    blockedStorage.local.setItem = () => { throw new Error("Storage blocked"); };
    assert.equal(blockedStorage.api.updateTrackingConsent(choice), false);
    await blockedStorage.api.searchEvent();
    assert.equal(blockedStorage.events.length, 0, "Failed consent writes must not reuse a prior grant");
    assert.equal(blockedStorage.state.lookups, 0);
  }

  const guest = setup();
  await guest.api.viewContentEvent({ name: "Viewed Profile", phoneNumber: "01811111111" }, "visit-1");
  await guest.api.viewContentEvent({}, "visit-1");
  assert.equal(guest.events.length, 1);
  assert.equal(guest.events[0].page_location, "https://niqaha.com/biodata/profile");
  assert.equal(guest.events[0].user_details, null);
  assert.equal(guest.events[0].user_id, null);
  assert.equal(guest.events[0].user_type, "guest");
  assert(!JSON.stringify(guest.events).includes("Viewed Profile"));
  assert(!JSON.stringify(guest.events).includes("01811111111"));

  const existing = setup({ user: alice });
  await existing.api.pageViewEvent();
  await existing.api.searchEvent();
  await existing.api.viewContentEvent({ name: "Wrong Person" });
  await existing.api.contactEvent("messenger");
  await existing.api.leadEvent("lead-success");
  for (const event of existing.events) {
    assert.equal(event.user_id, alice._id);
    assert.equal(event.login_status, "logged_in");
    assert.equal(event.user_type, "returning");
    assert.deepEqual(plain(event.user_details), { name: alice.name, phone_number: alice.phoneNumber });
    assert(!JSON.stringify(event).includes("password"));
    assert(!JSON.stringify(event).includes("Wrong Person"));
  }
  assert.equal(existing.events.find((e) => e.event === "Contact").contact_method, "messenger");

  existing.sandbox.location.pathname = "/profile/settings";
  const beforePrivate = existing.events.length;
  await existing.api.searchEvent();
  await existing.api.viewContentEvent({}, "private-visit");
  assert.equal(existing.events.length, beforePrivate);
  await existing.api.registrationEvent(alice, "email");
  await existing.api.registrationEvent(alice, "email");
  for (const eventName of ["CompleteRegistration", "sign_up"]) {
    const matches = existing.events.filter((e) => e.event === eventName);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].method, "email");
    assert.equal(matches[0].user_type, "new");
    assert.equal(matches[0].page_path, "/private");
  }
  const reloaded = setup({ user: alice, session: existing.sandbox.sessionStorage });
  await reloaded.api.pageViewEvent();
  assert.equal(reloaded.events[0].user_type, "new");
  await existing.api.loginEvent(alice, "phone");
  await existing.api.loginEvent(alice, "email");
  assert.equal(existing.events.filter((e) => e.event === "login").length, 2);
  assert.equal(existing.events.at(-1).user_type, "returning");
  assert.equal(existing.events.at(-1).contact_method, null);
  existing.sandbox.location.pathname = "/biodata/another-profile";
  await existing.api.viewContentEvent({}, "private-visit");
  assert.equal(existing.events.at(-1).event, "ViewContent");
  assert.equal(existing.events.at(-1).method, null);

  await existing.api.viewContentEvent({}, "same-profile");
  await existing.api.loginEvent(bob, "google");
  await existing.api.viewContentEvent({}, "same-profile");
  assert.equal(existing.events.filter((e) => e.event === "ViewContent" && e.user_id === bob._id).length, 1);
  assert.deepEqual(plain(existing.events.at(-1).user_details), { name: bob.name, phone_number: null });
  existing.api.clearTrackingUser();
  assert.equal(existing.events.at(-1).user_id, null);
  assert.equal(existing.events.at(-1).user_details, null);
  existing.state.user = null;
  await existing.api.searchEvent();
  assert.equal(existing.events.at(-1).login_status, "logged_out");
  assert.equal(existing.events.at(-1).user_details, null);

  const pending = setup({ user: alice });
  let complete;
  pending.state.lookup = () => new Promise((resolve) => { complete = resolve; });
  const pendingPage = pending.api.pageViewEvent();
  const pendingSearch = pending.api.searchEvent();
  assert.equal(pending.state.lookups, 1);
  pending.sandbox.location.pathname = "/contact";
  complete(alice);
  await Promise.all([pendingPage, pendingSearch]);
  assert.equal(pending.events.length, 2);
  assert(pending.events.every((e) => e.user_id === alice._id));
  assert(pending.events.every((e) => e.page_path === "/biodata/profile"));

  const switched = setup();
  switched.state.lookup = () => new Promise((resolve) => { complete = resolve; });
  const oldPage = switched.api.pageViewEvent();
  await switched.api.loginEvent(bob, "google");
  complete(alice);
  await oldPage;
  await switched.api.searchEvent();
  assert(switched.events.every((e) => e.user_id === bob._id));

  const revoked = setup();
  revoked.state.lookup = () => new Promise((resolve) => { complete = resolve; });
  const revokedPage = revoked.api.pageViewEvent();
  revoked.local.setItem("niqaha_tracking_consent_v3", "denied");
  revoked.api.clearTrackingUser();
  complete(alice);
  await revokedPage;
  assert(revoked.events.every((e) => !e.event && e.user_details === null));

  const failedLookup = setup({ user: alice });
  failedLookup.state.lookup = async () => { throw new Error("Offline"); };
  await failedLookup.api.searchEvent();
  assert.equal(failedLookup.events.length, 0);
  failedLookup.state.lookup = null;
  await failedLookup.api.searchEvent();
  assert.equal(failedLookup.events[0].user_id, alice._id);
  failedLookup.state.user = null;
  await failedLookup.api.pageViewEvent();
  assert.equal(failedLookup.events.at(-1).user_details, null, "Page navigation must refresh expired sessions");
  const unavailable = setup();
  unavailable.sandbox.window.dataLayer.push = () => { throw new Error("Tracking unavailable"); };
  await unavailable.api.loginEvent(alice, "phone");
  await unavailable.api.registrationEvent(alice, "email");
  unavailable.api.clearTrackingUser();
  const missingIdentity = setup();
  await missingIdentity.api.loginEvent({ name: "No account ID" }, "phone");
  await missingIdentity.api.registrationEvent({ name: "No account ID" }, "email");
  assert.equal(missingIdentity.events.length, 0);
  console.log("PASS tracking: consent, user details, guests, private URLs, deduplication, account changes, async races, and failures.");

  for (const identifier of ["01700000000", "example@example.test"]) {
    const tracking = setup();
    tracking.sandbox.location.pathname = "/login";
    const onSuccess = authCallback("components/custom/auth/SignIn.tsx", tracking, identifier);
    await onSuccess({ error: { message: "Invalid credentials" } });
    assert.equal(tracking.events.length, 0);
    await onSuccess({ data: { user: alice } });
    assert.equal(tracking.events[0].event, "login");
    assert.equal(tracking.events[0].method, identifier.includes("@") ? "email" : "phone");
    assert.equal(tracking.events[0].user_details.name, alice.name);
  }
  for (const isNewUser of [true, false]) {
    const tracking = setup();
    tracking.sandbox.location.pathname = "/login";
    const onSuccess = authCallback("components/custom/auth/GoogleLogin.tsx", tracking);
    await onSuccess({ error: { message: "Invalid Google token" } });
    assert.equal(tracking.events.length, 0);
    await onSuccess({ data: { user: alice, isNewUser } });
    assert.deepEqual(tracking.events.map((e) => e.event), isNewUser ? ["CompleteRegistration", "sign_up"] : ["login"]);
    assert(tracking.events.every((e) => e.method === "google"));
  }
  for (const method of ["phone", "email"]) {
    const tracking = setup();
    tracking.sandbox.location.pathname = "/otp";
    tracking.sandbox.sessionStorage.setItem("niqaha_registration_method", method);
    const onSuccess = authCallback("app/(auth)/otp/page.tsx", tracking);
    await onSuccess({ error: { message: "Invalid OTP" } });
    assert.equal(tracking.events.length, 0);
    await onSuccess({ data: { data: alice } });
    assert.deepEqual(tracking.events.map((e) => e.event), ["CompleteRegistration", "sign_up"]);
    assert(tracking.events.every((e) => e.method === method && e.user_type === "new"));
    assert.equal(tracking.sandbox.sessionStorage.getItem("niqaha_registration_method"), null);
  }
  console.log("PASS auth callbacks: phone/email login, existing/new Google accounts, OTP signup, and failed authentication.");

  const richUser = { ...alice, email: " Example@Example.Test ", residenceCountry: "Bangladesh",
    address: { presentAddress: "Example road", upazila: "Mymensingh Sadar" } };
  const customer = setup({ user: richUser });
  await customer.api.pageViewEvent();
  await customer.api.searchEvent();
  await customer.api.viewContentEvent({ name: "Someone Else", phoneNumber: "01811111111" });
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  for (const event of customer.events) {
    assert.equal(event.action_source, "website");
    assert.equal(event.external_id, hash(alice._id));
    assert.deepEqual(plain(event.customer_information), { first_name: "Example", last_name: "User", phone: alice.phoneNumber,
      address_1: "Example road", city: "Mymensingh Sadar", country: "Bangladesh", country_code: "BD" });
    assert.deepEqual(plain(event.user_data), [{ external_id: hash(alice._id), em: hash("example@example.test"),
      ph: hash("8801700000000"), fn: hash("example"), ln: hash("user"), ct: hash("mymensinghsadar"),
      country: hash("bd"), country_code: hash("bd") }]);
    assert(!JSON.stringify(event).includes("Someone Else"));
    assert(!JSON.stringify(event).includes("password"));
  }
  const singleName = await customer.customer.buildCustomerContext({ ...alice, name: "Rahim" });
  assert.equal(singleName.customer_information.last_name, null);
  assert.equal(singleName.user_data[0].ln, null);
  assert.equal(singleName.customer_information.country_code, null, "Phone country must not invent a residence country");
  const localized = await customer.customer.buildCustomerContext({ ...alice, phoneNumber: "০১৭১২৩৪৫৬৭৮",
    residenceCountry: "BD", address: { upazila: "Zone 1. - (North)" } });
  assert.equal(localized.user_data[0].ph, hash("8801712345678"));
  assert.equal(localized.user_data[0].ct, hash("zonenorth"));
  const missingCrypto = setup({ user: alice });
  missingCrypto.sandbox.crypto.subtle = undefined;
  await missingCrypto.api.searchEvent();
  assert.equal(missingCrypto.events[0].user_data, null);
  assert.equal(missingCrypto.events[0].customer_information.first_name, "Example");
  customer.api.clearTrackingUser();
  assert.equal(customer.events.at(-1).customer_information, null);
  assert.equal(customer.events.at(-1).user_data, null);
  assert.equal(customer.events.at(-1).external_id, null);
  console.log("PASS customer matching: normalized real SHA-256 hashes, own-account details, missing surnames/countries, and cleared identity.");

  for (const purpose of ["premium", "connections"]) {
    const purchase = setup({ user: richUser });
    purchase.sandbox.location.pathname = "/payment/successfull";
    const order = receipt(purpose);
    order.ecommerce.unlisted = "never-spread";
    order.ecommerce.items[0].unlisted = "never-spread";
    await Promise.all([purchase.api.purchaseEvent(order), purchase.api.purchaseEvent(order)]);
    const events = purchase.events.filter((event) => event.event === "purchase");
    assert.equal(events.length, 1, "Concurrent events must deduplicate after async hashing");
    assert.equal(events[0].event_id, order.order_id);
    assert.equal(events[0].page_path, "/private");
    assert.equal(events[0].ecommerce.value, 1250);
    assert.equal(events[0].ecommerce.items[0].quantity, 1);
    assert.equal(events[0].user_data[0].em, hash("example@example.test"));
    assert.equal(purchase.events[0].ecommerce, null, "Clear previous ecommerce before pushing purchase");
    assert(!JSON.stringify(events[0]).includes("never-spread"));
    const reloaded = setup({ user: richUser, local: purchase.local });
    await reloaded.api.purchaseEvent(order);
    assert.equal(reloaded.events.length, 0, "Reloads must not repeat a purchase");
    purchase.sandbox.location.pathname = "/contact";
    await purchase.api.pageViewEvent();
    assert.equal(purchase.events.at(-1).ecommerce, null);
    assert.equal(purchase.events.at(-1).order_id, null);
  }
  const invalidPurchase = setup({ user: alice });
  for (const patch of [{ status: "pending" }, { status: "failed" }, { status: "refunded" },
    { user_id: bob._id }, { event_id: "wrong-id" }, { ecommerce: { ...receipt().ecommerce, value: 5 } }]) {
    await invalidPurchase.api.purchaseEvent({ ...receipt(), ...patch });
  }
  assert.equal(invalidPurchase.events.length, 0);
  const deniedPurchase = setup({ user: alice, consent: "denied" });
  await deniedPurchase.api.purchaseEvent(receipt());
  assert.equal(deniedPurchase.events.length, 0);
  const mounted = setup({ user: richUser });
  const tracker = mountPurchaseTracker(mounted, "?purpose=premium&payment_id=opaque%2F1", receipt());
  await tracker.settle();
  assert.deepEqual(tracker.calls, [["opaque/1", "premium"]]);
  assert.equal(mounted.events.filter((event) => event.event === "purchase").length, 1);
  tracker.cleanup();
  assert.equal(tracker.listeners.size, 0);
  const late = setup({ user: alice, consent: "denied" });
  const lateTracker = mountPurchaseTracker(late, "?purpose=connections&payment_id=pay-2", receipt("connections"));
  await lateTracker.settle();
  assert.equal(lateTracker.calls.length, 0);
  late.api.updateTrackingConsent("granted");
  await lateTracker.listeners.get("niqaha:tracking-consent-granted")();
  assert.equal(late.events.filter((event) => event.event === "purchase").length, 1);
  const noReference = mountPurchaseTracker(setup(), "?purpose=premium", receipt());
  await noReference.settle();
  assert.equal(noReference.calls.length, 0);
  let finishReceipt;
  const unmounted = setup({ user: alice });
  const abandoned = mountPurchaseTracker(unmounted, "?purpose=premium&payment_id=pay-3",
    () => new Promise((resolve) => { finishReceipt = resolve; }));
  abandoned.cleanup();
  finishReceipt(receipt());
  await abandoned.settle();
  assert.equal(unmounted.events.length, 0);
  console.log("PASS purchases: both plans, paid owner checks, stable IDs, reload/concurrent deduplication, late consent, and unmount cleanup.");

  let sessionToken = "test-access-token";
  let trackingProfile = { _id: alice._id, name: alice.name, phoneNumber: alice.phoneNumber };
  const server = {
    exports: {},
    process: { env: { BASE_URL: "https://api.example.test" } },
    AbortSignal,
    fetch: async (url, options) => {
      assert.equal(url, "https://api.example.test/platform/tracking/user");
      assert.equal(options.headers.access_token, sessionToken);
      assert.equal(options.cache, "no-store");
      return { ok: true, status: 200, json: async () => trackingProfile };
    },
    require: (name) => name === "next/headers" ? {
      cookies: async () => ({ get: (key) => key === "access_token" && sessionToken ? { value: sessionToken } : undefined }),
    } : {},
  };
  vm.runInNewContext(compile("actions/auth.ts"), server);
  assert.deepEqual(plain(await server.exports.getTrackingUser()), { _id: alice._id, name: alice.name, phoneNumber: alice.phoneNumber });
  sessionToken = null;
  assert.equal(await server.exports.getTrackingUser(), null);
  console.log("PASS server identity: authenticated API lookup, no-store fetch, and signed-out sessions.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
