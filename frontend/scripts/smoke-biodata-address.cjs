// Isolated rendering check; no server, build, real account or clipboard required.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const modules = new Map();
let profile;
const noop = () => {};
const hiddenDialog = () => null;
const mocks = {
  'next/navigation': { useRouter: () => ({ push: noop, back: noop }) },
  'next/image': { default: props => React.createElement('img', { src: props.src, alt: props.alt }) },
  'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
  '@tanstack/react-query': { useQueryClient: () => ({}), useMutation: () => ({ mutateAsync: noop }) },
  '@/api-hooks/api-hooks': {},
  '@/api-hooks/react-query-wrapper': { useQueryWrapper: key => ({ data: key[0] === 'get-user' ? profile : {}, refetch: noop }) },
  '@/api-hooks/use-api-mutation': { useCommonMutationApi: () => ({ mutate: noop }) },
  '@/lib/useUser': { useUser: () => ({ user: null }) },
  '@/actions/auth': {},
  '@/lib/google-tag-manager': {},
  '@/components/ui/alert-dialog': { AlertDialog: hiddenDialog },
  '@/components/ui/dialog': { Dialog: hiddenDialog },
};
function load(file) {
  const full = path.resolve(root, file);
  if (modules.has(full)) return modules.get(full).exports;
  if (full.endsWith('.json')) return JSON.parse(fs.readFileSync(full, 'utf8'));
  const mod = { exports: {} };
  modules.set(full, mod);
  const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: full })(name => {
    if (mocks[name]) return { __esModule: true, ...mocks[name] };
    if (!name.startsWith('@/') && !name.startsWith('.')) return require(name);
    const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(full), name);
    return load([base, base + '.ts', base + '.tsx', base + '.json'].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()));
  }, mod, mod.exports);
  return mod.exports;
}
const { defaultQuestions } = load('lib/profile-questions.ts');
const { default: ProfileView } = load('components/custom/biodata/ProfileView.tsx');
const { buildBiodataWhatsappText } = load('lib/biodata-whatsapp-share.ts');
const current = '1/1, Khan villa, Medical Road, west jurain, Dhaka.';
const permanent = 'Village - Goidda, Ward no- 05, post office- Bhederganj, Upazila- Bhederganj, District- Shariatpur.';
const custom = (id, label, order) => ({ id, legacyKey: label, question: label, publicLabel: label,
  section: 1, gender: 'both', type: 'textarea', options: [], enabled: true, required: false, showPublic: true, order, locked: false });
const presentQuestion = custom('old_' + '1'.repeat(24), 'বর্তমান ঠিকানা', 500);
const permanentQuestion = custom('old_' + '2'.repeat(24), 'স্থায়ী ঠিকানা', 600);
profile = { _id: 'test', userId: '001303', gender: 'female', identityUnlocked: true,
  residenceCountry: 'Bangladesh', dateOfBirth: '2000-05-15',
  address: { area: 'Motijheel', cityCorporation: 'Dhaka South City Corporation', district: 'Dhaka' },
  publicQuestionSchema: { ...defaultQuestions, questions: [...defaultQuestions.questions, presentQuestion, permanentQuestion] },
  publicAnswers: { [presentQuestion.id]: current, [permanentQuestion.id]: permanent },
};
function addressSection() {
  const html = renderToStaticMarkup(React.createElement(ProfileView, { id: 'test' }));
  return html.match(/<section[^>]*id="address"[\s\S]*?<\/section>/)[0];
}
let html = addressSection();
assert.equal((html.match(/<dt[^>]*>বর্তমান ঠিকানা<\/dt>/g) || []).length, 1);
assert.equal((html.match(/<dt[^>]*>স্থায়ী ঠিকানা<\/dt>/g) || []).length, 1);
assert.ok(html.includes(current));
assert.ok(html.includes(permanent));
assert.ok(!html.includes('Motijheel, Dhaka South City Corporation, ঢাকা, Bangladesh'));
const copied = buildBiodataWhatsappText(profile, 'https://example.com');
assert.ok(copied.includes('*বর্তমান অবস্থানঃ* ' + current));
assert.ok(copied.includes('*স্থায়ী ঠিকানাঃ* ' + permanent));
assert.ok(copied.includes('*জন্ম তারিখঃ* ১৫ মে, ২০০০'));
assert.ok(!copied.includes('জন্ম সনঃ'));
assert.ok(renderToStaticMarkup(React.createElement(ProfileView, { id: 'test' })).includes('১৫ মে, ২০০০'));
const { buildBiodataWhatsappShareUrlForNumber } = load('lib/biodata-whatsapp-share.ts');
const withContact = buildBiodataWhatsappText({ ...profile, phoneNumber: '01700000000' }, 'https://example.com', { includeContactNumber: true });
assert.ok(withContact.includes('*জন্ম তারিখঃ* ১৫ মে, ২০০০'));
assert.ok(withContact.includes('01700000000'));
const shareUrl = new URL(buildBiodataWhatsappShareUrlForNumber(profile, 'https://example.com', '01700000000'));
assert.ok(shareUrl.searchParams.get('text').includes('*জন্ম তারিখঃ* ১৫ মে, ২০০০'));
delete profile.publicAnswers[presentQuestion.id];
html = addressSection();
assert.ok(html.includes('Motijheel, Dhaka South City Corporation, ঢাকা, Bangladesh'));
assert.ok(html.includes(permanent));
delete profile.publicAnswers[permanentQuestion.id];
assert.ok(!addressSection().includes('স্থায়ী ঠিকানা'));
profile.publicQuestionSchema.questions = profile.publicQuestionSchema.questions.map(q =>
  q.path === 'address.presentAddress' ? { ...q, showPublic: false } : q);
assert.ok(!addressSection().includes('<dt class="text-[14px] font-medium leading-6 text-gray-600" dir="auto">বর্তমান ঠিকানা'));
const admin = { ...profile, publicQuestionSchema: undefined, publicAnswers: undefined,
  customFields: { 'বর্তমান ঠিকানা': current, 'স্থায়ী ঠিকানা': permanent } };
const adminCopy = buildBiodataWhatsappText(admin, 'https://example.com');
assert.ok(adminCopy.includes(current));
assert.ok(adminCopy.includes(permanent));
for (const dateOfBirth of [undefined, '', '2001-02-29', '2999-01-01']) {
  assert.ok(!buildBiodataWhatsappText({ age: 26, dateOfBirth }, '').includes('জন্ম তারিখঃ'));
}
const { questionDisplayValue } = load('lib/profile-questions.ts');
const birthQuestion = defaultQuestions.questions.find(q => q.path === 'dateOfBirth');
assert.equal(questionDisplayValue('2000-05-15', birthQuestion), '১৫ মে, ২০০০');
assert.equal(questionDisplayValue('2000-02-29', birthQuestion), '২৯ ফেব্রুয়ারি, ২০০০');
assert.equal(questionDisplayValue('2001-02-29', birthQuestion), '');
const { DynamicQuestionStep, QuestionInput } = load('components/custom/updateProfile/DynamicQuestionStep.tsx');
const form = renderToStaticMarkup(React.createElement(DynamicQuestionStep, { schema: defaultQuestions, step: 0 }));
assert.ok(form.includes('type="date"'));
const dateInput = renderToStaticMarkup(React.createElement(QuestionInput, {
  q: defaultQuestions.questions.find(q => q.path === 'dateOfBirth'), value: '2000-05-15', onChange: noop,
}));
assert.ok(dateInput.includes('value="2000-05-15"'));
assert.ok(!form.includes('id="question-' + defaultQuestions.questions.find(q => q.path === 'age').id + '"'));
const { questionRuleErrors } = load('lib/profile-questions.ts');
const { QuestionEditor, questionIssues } = load('components/custom/dashboard/QuestionEditor.tsx');
const rules = [{ type: 'not_equal', questionId: permanentQuestion.id, message: 'Use different answers' }];
const ruledQuestion = { ...presentQuestion, rules };
const ruleQuestions = [ruledQuestion, permanentQuestion];
const sameAnswers = { customFields: { [presentQuestion.legacyKey]: 'same', [permanentQuestion.legacyKey]: 'same' } };
assert.equal(questionRuleErrors(sameAnswers, ruleQuestions)[0].message, 'Use different answers');
sameAnswers.customFields[permanentQuestion.legacyKey] = 'different';
assert.equal(questionRuleErrors(sameAnswers, ruleQuestions).length, 0);
sameAnswers.customFields[permanentQuestion.legacyKey] = '';
assert.equal(questionRuleErrors(sameAnswers, ruleQuestions).length, 0);
assert.equal(questionIssues(ruledQuestion, ruleQuestions).filter(issue => issue.blocking).length, 0);
assert.ok(questionIssues({ ...ruledQuestion, rules: [{ type: 'not_equal', questionId: '' }] }, ruleQuestions).some(issue => issue.blocking));
const editor = renderToStaticMarkup(React.createElement(QuestionEditor, {
  question: ruledQuestion, questions: ruleQuestions, sections: defaultQuestions.sections, issues: [],
  onChange: noop, onMove: noop, onSectionChange: noop, onDuplicate: noop, onToggleArchive: noop, onDelete: noop, onRevert: noop,
}));
assert.ok(editor.includes('Answer rules'));
assert.ok(editor.includes('Must differ from'));
assert.ok(editor.includes('value="' + permanentQuestion.id + '"'));
assert.ok(!editor.includes('<option value="' + presentQuestion.id + '"'));
assert.ok(editor.includes('Use different answers'));
const invalidInput = renderToStaticMarkup(React.createElement(QuestionInput, {
  q: ruledQuestion, value: 'same', onChange: noop, error: 'Use different answers',
}));
assert.ok(invalidInput.includes('aria-invalid="true"'));
assert.ok(invalidInput.includes('role="alert"'));
console.log('PASS: single address rows, saved dates, rule editor, strict answer validation and inline errors');
