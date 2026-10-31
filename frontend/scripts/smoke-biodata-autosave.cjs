const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../lib/biodata-draft.ts"), "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleRef = { exports: {} };
new Function("module", "exports", js)(moduleRef, moduleRef.exports);
const { diffBiodataDraft, applyBiodataDraft, hasBiodataChanges } = moduleRef.exports;

const saved = {
  name: "Profile owner",
  motherName: "First mother name",
  numberOfConnections: 12,
  role: "user",
  email: "user@example.test",
  familyInfo: { fathersProfession: "Teacher", mothersProfession: "Homemaker", brotherCount: 3 },
  address: { district: "Dhaka", upazila: "Savar" },
  dynamicAnswers: { "q_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa": "Earlier question" },
};
const updated = {
  ...saved,
  motherName: "Corrected mother name",
  email: "changed@example.test",
  role: "admin",
  numberOfConnections: 9900,
  familyInfo: { ...saved.familyInfo, mothersProfession: "Doctor" },
  address: { ...saved.address, district: "Sylhet" },
  dynamicAnswers: { ...saved.dynamicAnswers, "q_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb": "Added answer" },
};
const changes = diffBiodataDraft(saved, updated);
assert.deepEqual(changes, {
  motherName: "Corrected mother name",
  familyInfo: { mothersProfession: "Doctor" },
  address: { district: "Sylhet" },
  dynamicAnswers: { "q_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb": "Added answer" },
});
assert(!Object.hasOwn(changes, "email"));
assert(!Object.hasOwn(changes, "role"));
assert(!Object.hasOwn(changes, "numberOfConnections"));
const merged = applyBiodataDraft(saved, changes);
assert.equal(merged.familyInfo.fathersProfession, "Teacher");
assert.equal(merged.familyInfo.brotherCount, 3);
assert.equal(merged.address.upazila, "Savar");
assert.equal(merged.dynamicAnswers["q_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"], "Earlier question");
assert.equal(merged.motherName, "Corrected mother name");
assert(!hasBiodataChanges(diffBiodataDraft(merged, updated)));
assert(!hasBiodataChanges(diffBiodataDraft(saved, saved)));
const formSource = fs.readFileSync(path.join(__dirname, "../components/custom/updateProfile/ProfileUpdateForm.tsx"), "utf8");
const sidebarSource = fs.readFileSync(path.join(__dirname, "../app/profile/ProfileShell.tsx"), "utf8");
assert(!formSource.includes("সংরক্ষণ হয়নি, সংযোগ ফিরলে হবে"), "Misleading network warning must not return");
assert(formSource.includes("আবার চেষ্টা করুন"), "Save failure needs an actionable retry");
assert(formSource.includes("connectionBalance") && formSource.includes("numberOfConnections"), "Real connection count must be used");
assert(!formSource.includes("bn(points)"), "Gamification score must not look like connection credits");
assert(sidebarSource.includes('url: "/profile/my-profile"'), "Manual biodata must be in sidebar");
assert(sidebarSource.includes('url: "/profile/ai-profile"'), "AI biodata must be in sidebar");
console.log("Biodata autosave and sidebar checks passed: partial saves, retry, genuine connection count, and both edit links.");
