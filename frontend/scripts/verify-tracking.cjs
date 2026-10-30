const fs = require("fs"),
  path = require("path"),
  vm = require("vm"),
  assert = require("node:assert/strict");
const ts = require("typescript");
const source = fs.readFileSync(
  path.join(__dirname, "../lib/google-tag-manager.ts"),
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
let consent = "denied",
  seq = 0;
const sandbox = {
  exports: {},
  window: { dataLayer: [] },
  location: { origin: "https://niqaha.com", pathname: "/biodata/123" },
  localStorage: { getItem: () => consent },
  crypto: { randomUUID: () => String(++seq) },
  Set,
};
vm.runInNewContext(code, sandbox);
const api = sandbox.exports;
api.viewContentEvent({ name: "Secret", age: 28, phoneNumber: "01700000000" });
assert.equal(sandbox.window.dataLayer.length, 0);
consent = "granted";
api.viewContentEvent(
  { name: "Secret", age: 28, phoneNumber: "01700000000" },
  "visit-1",
);
api.viewContentEvent({ name: "Secret" }, "visit-1");
assert.equal(sandbox.window.dataLayer.length, 1);
assert.equal(sandbox.window.dataLayer[0].event, "ViewContent");
assert.equal(
  sandbox.window.dataLayer[0].page_location,
  "https://niqaha.com/biodata/profile",
);
assert(!JSON.stringify(sandbox.window.dataLayer).includes("Secret"));
assert(!JSON.stringify(sandbox.window.dataLayer).includes("01700000000"));
api.searchEvent();
assert.equal(sandbox.window.dataLayer[1].event, "Search");
sandbox.location.pathname = "/profile/settings";
api.searchEvent();
assert.equal(sandbox.window.dataLayer.length, 2);
api.registrationEvent("account-1", "email");
api.registrationEvent("account-1", "email");
assert.equal(
  sandbox.window.dataLayer.filter((x) => x.event === "CompleteRegistration")
    .length,
  1,
);
console.log(
  "PASS tracking: consent gate, event deduplication, private routes, safe URLs, payload allowlist, registration deduplication.",
);

sandbox.location.pathname="/";
api.contactEvent("messenger");api.leadEvent("lead-success");
for(const name of ["ViewContent","Search","Contact","Lead","CompleteRegistration"])assert(sandbox.window.dataLayer.some(e=>e.event===name),"Missing "+name);
assert.equal(sandbox.window.dataLayer.filter(e=>e.event==="Contact"&&e.contact_method==="messenger").length,1);
console.log("PASS all five requested event names and Messenger Contact signal.");
