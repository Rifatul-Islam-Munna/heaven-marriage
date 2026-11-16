// Isolated regressions: real answer readers, store, and React-rendered inputs.
// No app build, server, account, or production database required.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
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
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: full })(name => {
    if (name === '@/api-hooks/react-query-wrapper') return { useQueryWrapper: () => ({}) };
    if (!name.startsWith('@/') && !name.startsWith('.')) return require(name);
    const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(full), name);
    return load([base, base + '.ts', base + '.tsx', base + '.json'].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()));
  }, mod, mod.exports);
  return mod.exports;
}
const { defaultQuestions, readQuestionAnswer, questionUsesSeparateStorage, questionAnswerFitsInput,
  questionOptionsWithSavedAnswer } = load('lib/profile-questions.ts');
const { QuestionInput } = load('components/custom/updateProfile/DynamicQuestionStep.tsx');
const { useProfileStore } = load('zustan/useProfileStore.ts');
const original = defaultQuestions.questions.find(q => q.path === 'familyInfo.brotherCount');
const renamed = { ...original, question: 'Updated siblings question', publicLabel: 'Siblings', section: 8 };
assert.equal(readQuestionAnswer({ familyInfo: { brotherCount: 3 } }, renamed), 3);
const changed = { ...renamed, type: 'text', answerStorage: 'dynamic' };
assert(questionUsesSeparateStorage(changed));
assert.equal(readQuestionAnswer({ familyInfo: { brotherCount: 3 } }, changed), 3);
for (const answer of ['', false, 0, []]) {
  assert.deepEqual(readQuestionAnswer({ familyInfo: { brotherCount: 3 }, dynamicAnswers: { [changed.id]: answer } }, changed), answer);
}
const reverted = { ...changed, type: original.type };
assert(questionUsesSeparateStorage(reverted));
assert.equal(readQuestionAnswer({ familyInfo: { brotherCount: 3 }, dynamicAnswers: { [reverted.id]: 4 } }, reverted), 4);
const legacy = { ...changed, id: 'old_' + 'a'.repeat(24), path: undefined, legacyKey: 'Original prompt' };
assert.equal(readQuestionAnswer({ customFields: { 'Original prompt': 'Saved details' } }, legacy), 'Saved details');

const render = (q, value) => renderToStaticMarkup(React.createElement(QuestionInput, { q, value, onChange() {} }));
assert(render(changed, 3).includes('value="3"'));
assert(render(legacy, 'Saved details').includes('value="Saved details"'));
for (const type of ['checkbox', 'multi_checkbox', 'number', 'date']) {
  const html = render({ ...changed, type, options: [{ value: 'new', label: 'New choice' }] }, 'Previous detailed answer');
  assert(html.includes('Previous detailed answer'), type + ' must show historical text');
  assert(html.includes('data-saved-question-answer='), type + ' must label historical answer');
}
const multiple = { ...changed, type: 'multi_checkbox', options: [{ value: 'new', label: 'New choice' }] };
const multipleHtml = render(multiple, ['removed']);
assert(multipleHtml.includes('removed (saved answer)'));
assert(multipleHtml.includes('data-state="checked"'));
assert(render({ ...changed, type: 'select', options: [] }, 'Old option').includes('Old option (saved answer)'));
assert(questionAnswerFitsInput(false, { ...changed, type: 'checkbox' }));
assert(questionAnswerFitsInput(0, { ...changed, type: 'number' }));
for (const value of [' 3 ', '0x10', '+3']) {
  assert(!questionAnswerFitsInput(value, { ...changed, type: 'number' }));
  assert(render({ ...changed, type: 'number' }, value).includes('data-saved-question-answer='));
}
assert(!questionAnswerFitsInput('2024-02-31', { ...changed, type: 'date' }));
assert.deepEqual(questionOptionsWithSavedAnswer(multiple, multiple.options, ['removed', 'removed'])
  .map(option => option.value), ['new', 'removed']);

// Execute the real admin setter against the profile store, then render its saved value.
const source = fs.readFileSync(path.join(root, 'components/custom/updateProfile/DynamicQuestionStep.tsx'), 'utf8');
const ast = ts.createSourceFile('DynamicQuestionStep.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let setter;
function findSetter(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'setAnswer') setter = node.initializer;
  ts.forEachChild(node, findSetter);
}
findSetter(ast);
const setAnswerJs = ts.transpileModule('(' + setter.getText(ast) + ')(question, answer);', {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
useProfileStore.getState().initializeForm({ gender: 'male', familyInfo: { brotherCount: 3 } });
assert(render(changed, readQuestionAnswer(useProfileStore.getState().formData, changed)).includes('value="3"'));
vm.runInNewContext(setAnswerJs, { ...useProfileStore.getState(), questionUsesSeparateStorage,
  question: changed, answer: 'Four siblings' });
let profile = useProfileStore.getState().getFormData();
assert.equal(profile.familyInfo.brotherCount, 3);
assert.equal(profile.dynamicAnswers[changed.id], 'Four siblings');
useProfileStore.getState().initializeForm(profile);
assert.equal(readQuestionAnswer(useProfileStore.getState().formData, reverted), 'Four siblings');
vm.runInNewContext(setAnswerJs, { ...useProfileStore.getState(), questionUsesSeparateStorage,
  question: reverted, answer: 4 });
profile = useProfileStore.getState().getFormData();
assert.equal(readQuestionAnswer(profile, reverted), 4);
assert.equal(profile.familyInfo.brotherCount, 3);
useProfileStore.getState().resetForm();
console.log('PASS: renamed/retyped/reverted answers, original custom keys, historical inputs/options and admin save/reload');
