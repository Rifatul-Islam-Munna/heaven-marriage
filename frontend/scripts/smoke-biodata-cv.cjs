// Isolated CV regressions: no app build, server, account or real clipboard.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const modules = new Map();
function load(file) {
  const full = path.resolve(root, file);
  if (modules.has(full)) return modules.get(full).exports;
  if (full.endsWith('.json')) return JSON.parse(fs.readFileSync(full, 'utf8'));
  const mod = { exports: {} };
  modules.set(full, mod);
  const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: full })(name => {
    if (!name.startsWith('@/') && !name.startsWith('.')) return require(name);
    const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(full), name);
    return load([base, base + '.ts', base + '.json'].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()));
  }, mod, mod.exports);
  return mod.exports;
}
const { defaultQuestions } = load('lib/profile-questions.ts');
const { buildBiodataWhatsappText, buildBiodataWhatsappShareUrlForNumber,
  copyBiodataWhatsappText } = load('lib/biodata-whatsapp-share.ts');
const original = defaultQuestions.questions.find(q => q.path === 'maritalStatus');
const partner = defaultQuestions.questions.find(q => q.path === 'expectedLifePartner.maritalStatus');
const edited = { ...original, question: 'পাত্রের বৈবাহিক অবস্থা', type: 'multi_checkbox',
  answerStorage: 'dynamic', options: [{ value: 'one-wife', label: 'বিবাহিত (একজন স্ত্রী রয়েছেন)' }] };
const changedPartner = { ...partner, question: 'পাত্রীর বৈবাহিক অবস্থা', type: 'multi_checkbox',
  answerStorage: 'dynamic', options: [{ value: 'partner-choice', label: 'প্রত্যাশিত উত্তর' }] };
const custom = { ...edited, id: 'q_' + 'a'.repeat(32), path: undefined,
  question: 'নতুন প্রশ্ন', publicLabel: 'নতুন প্রশ্ন', section: 8, type: 'checkbox', options: [] };
const legacy = { ...custom, id: 'old_' + 'b'.repeat(24), legacyKey: 'পুরোনো প্রশ্ন',
  question: 'পরিবর্তিত প্রশ্ন', publicLabel: 'পুরোনো প্রশ্ন', type: 'text' };
const schema = { ...defaultQuestions, revision: 99, questions: [
  ...defaultQuestions.questions.filter(q => ![original.id, partner.id].includes(q.id)),
  edited, changedPartner, custom, legacy,
] };
const user = { userId: '001319', gender: 'male', name: 'Example', maritalStatus: 'single',
  phoneNumber: '01711111111', whatsapp: '01811111111', guardianPhone: '01911111111',
  email: 'private@example.com', password: 'private-password',
  familyInfo: { fathersProfession: 'Teacher' },
  profileQuestionSchema: schema, customFields: { 'পুরোনো প্রশ্ন': 'পুরোনো উত্তর' },
  dynamicAnswers: { [edited.id]: ['one-wife'], [partner.id]: ['partner-choice'], [custom.id]: false } };
const origin = 'https://example.com';
for (const format of ['short', 'long']) {
  const options = { format };
  const copied = buildBiodataWhatsappText(user, origin, options);
  assert.ok(copied.includes('*পাত্রের বৈবাহিক অবস্থাঃ* বিবাহিত (একজন স্ত্রী রয়েছেন)'));
  assert.ok(copied.includes('*পাত্রীর বৈবাহিক অবস্থাঃ* প্রত্যাশিত উত্তর'));
  assert.ok(!copied.includes('অবিবাহিত'), 'Old fixed marital answer must not reappear');
  assert.ok(copied.includes('*নতুন প্রশ্নঃ* না'), 'False is a saved answer');
  assert.ok(copied.includes('*পরিবর্তিত প্রশ্নঃ* পুরোনো উত্তর'));
  assert.ok(copied.includes('/biodata/001319'));
  for (const secret of [user.phoneNumber, user.whatsapp, user.guardianPhone, user.email, user.password])
    assert.ok(!copied.includes(secret));
  const contacts = buildBiodataWhatsappText(user, origin, { format, includeContactNumber: true });
  for (const number of [user.phoneNumber, user.whatsapp, user.guardianPhone])
    assert.equal(contacts.split(number).length - 1, 1, 'Each contact appears once');
  const publicProfile = { ...user, profileQuestionSchema: undefined, customFields: undefined,
    dynamicAnswers: undefined, publicQuestionSchema: schema,
    publicAnswers: { [edited.id]: ['one-wife'], [partner.id]: ['partner-choice'], [custom.id]: false } };
  assert.ok(buildBiodataWhatsappText(publicProfile, origin, options).includes('বিবাহিত (একজন স্ত্রী রয়েছেন)'));
  const cleared = { ...user, dynamicAnswers: { ...user.dynamicAnswers, [edited.id]: [] } };
  assert.ok(!buildBiodataWhatsappText(cleared, origin, options).includes('*পাত্রের বৈবাহিক অবস্থাঃ*'));
  const hidden = { ...user, profileQuestionSchema: { ...schema, questions: schema.questions.map(q =>
    [edited.id, custom.id].includes(q.id) ? { ...q, showPublic: false } :
      q.id === legacy.id ? { ...q, enabled: false } : q) } };
  const hiddenCopy = buildBiodataWhatsappText(hidden, origin, options);
  for (const label of ['*পাত্রের বৈবাহিক অবস্থাঃ*', '*নতুন প্রশ্নঃ*', '*পরিবর্তিত প্রশ্নঃ*'])
    assert.ok(!hiddenCopy.includes(label));
  const selected = { ...original, options: [{ value: 'single', label: 'পরিবর্তিত অপশন' }] };
  const changedOptions = { ...user, profileQuestionSchema: { ...schema,
    questions: schema.questions.map(q => q.id === original.id ? selected : q) } };
  assert.ok(buildBiodataWhatsappText(changedOptions, origin, options).includes('পরিবর্তিত অপশন'));
}
const short = buildBiodataWhatsappText(user, origin);
const long = buildBiodataWhatsappText(user, origin, { format: 'long' });
assert.ok(!short.includes('Teacher'));
assert.ok(long.includes('*পারিবারিক তথ্য*'));
assert.ok(long.includes('Teacher'));
const url = new URL(buildBiodataWhatsappShareUrlForNumber(user, origin, '01722222222', { format: 'long' }));
assert.equal(url.searchParams.get('text'), long);
// Exercise the actual desktop/mobile copy controls without starting Next.js.
const adminSource = fs.readFileSync(path.join(root, 'components/custom/dashboard/AdminUsersTable.tsx'), 'utf8');
const adminAst = ts.createSourceFile('AdminUsersTable.tsx', adminSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let actions;
function findActions(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(adminAst) === 'actions') actions = node.initializer;
  ts.forEachChild(node, findActions);
}
findActions(adminAst);
assert.ok(actions);
const actionCode = ts.transpileModule('module.exports = (' + actions.getText(adminAst) + ');', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const calls = [];
const actionModule = { exports: {} };
vm.runInNewContext(actionCode, { module: actionModule, exports: actionModule.exports, require, ...require('lucide-react'),
  cn: (...values) => values.join(' '), copyingUserId: null,
  copyProfile: (...args) => calls.push(args),
});
for (const compact of [false, true]) {
  const controls = actionModule.exports({ ...user, _id: 'member-id' }, compact);
  const buttons = require('react').Children.toArray(controls.props.children);
  const longButtons = buttons.filter(button => button.props.title?.includes('লং CV'));
  assert.equal(longButtons.length, 2);
  longButtons.forEach(button => button.props.onClick());
  assert.deepEqual(calls.splice(0).map(call => Array.from(call).slice(1)), [['long'], ['long', true]]);
  const html = require('react-dom/server').renderToStaticMarkup(controls);
  assert.ok(html.includes('লং CV + ফোন'));
}
let clipboard;
Object.defineProperty(globalThis, 'navigator', { configurable: true,
  value: { clipboard: { writeText: async value => { clipboard = value; } } } });
copyBiodataWhatsappText(user, origin, { format: 'long' }).then(result => {
  assert.equal(result.copied, true);
  assert.equal(clipboard, long);
  console.log('PASS: edited multi-choice answers, current labels/options, short/long CV, contacts, public answers and clipboard');
}).catch(error => { console.error(error); process.exitCode = 1; });
