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
const { buildBiodataWhatsappText, copyBiodataWhatsappText } = load('lib/biodata-whatsapp-share.ts');
const original = defaultQuestions.questions.find(q => q.path === 'maritalStatus');
const edited = { ...original, type: 'multi_checkbox', answerStorage: 'dynamic', options: [
  { value: 'one-wife', label: 'বিবাহিত (একজন স্ত্রী রয়েছেন)' },
  { value: 'divorced-children', label: 'ডিভোর্সড (সন্তান আছে)' },
] };
const schema = { ...defaultQuestions, questions: defaultQuestions.questions.map(q => q.id === original.id ? edited : q) };
const user = { userId: '001319', name: 'Example', maritalStatus: 'Unmarried',
  phoneNumber: '01711111111', whatsapp: '01811111111', guardianPhone: '01911111111',
  profileQuestionSchema: schema };
const origin = 'https://example.com';
let clipboard;
Object.defineProperty(globalThis, 'navigator', { configurable: true,
  value: { clipboard: { writeText: async value => { clipboard = value; } } } });
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
  assert.equal(buttons.length, 7, 'Keep the original action buttons only');
  const copyButtons = buttons.filter(button => button.props.title?.includes('শর্ট CV'));
  assert.equal(copyButtons.length, 2);
  copyButtons.forEach(button => button.props.onClick());
  assert.deepEqual(calls.splice(0).map(call => Array.from(call).slice(1)), [[], [true]]);
  const html = require('react-dom/server').renderToStaticMarkup(controls);
  assert.ok(!html.includes('লং CV'));
}
(async () => {
  for (const [gender, label, choice] of [
    ['male', 'পাত্রের বৈবাহিক অবস্থাঃ', 'one-wife'],
    ['female', 'পাত্রীর বৈবাহিক অবস্থাঃ', 'divorced-children'],
  ]) {
    const profile = { ...user, gender, dynamicAnswers: { [edited.id]: [choice] } };
    const status = edited.options.find(option => option.value === choice).label;
    for (const includeContactNumber of [false, true]) {
      const options = { includeContactNumber };
      const result = await copyBiodataWhatsappText(profile, origin, options);
      assert.equal(result.copied, true);
      assert.equal(clipboard.split(`*${label}* ${status}`).length - 1, 1);
      assert.ok(!clipboard.includes('অবিবাহিত'), 'Use the saved edited answer');
      for (const number of [user.phoneNumber, user.whatsapp, user.guardianPhone])
        assert.equal(clipboard.includes(number), includeContactNumber);
      const cleared = { ...profile, dynamicAnswers: { [edited.id]: [] } };
      assert.ok(!buildBiodataWhatsappText(cleared, origin, options).includes(`*${label}*`));
      const legacy = { ...profile, dynamicAnswers: {}, maritalStatus: 'Unmarried' };
      assert.ok(buildBiodataWhatsappText(legacy, origin, options).includes(`*${label}* অবিবাহিত`));
      // "Show publicly" does not hide saved answers from this explicit admin copy.
      const hiddenSchema = { ...schema, questions: schema.questions.map(q =>
        q.id === edited.id ? { ...q, showPublic: false } : q) };
      assert.ok(buildBiodataWhatsappText({ ...profile, profileQuestionSchema: hiddenSchema }, origin, options)
        .includes(`*${label}* ${status}`));
      const publicProfile = { ...profile, profileQuestionSchema: undefined, dynamicAnswers: undefined,
        publicQuestionSchema: schema, publicAnswers: { [edited.id]: [choice] } };
      assert.ok(buildBiodataWhatsappText(publicProfile, origin, options).includes(`*${label}* ${status}`));
      assert.ok(!buildBiodataWhatsappText({ ...publicProfile, publicQuestionSchema: hiddenSchema }, origin, options)
        .includes(`*${label}*`));
    }
  }
  console.log('PASS: both existing copy buttons, both genders, saved marital status, original contact options; no extra buttons');
})().catch(error => { console.error(error); process.exitCode = 1; });
