// Run real form handlers against the profile store without a build or server.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const modules = new Map();
const compile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
function load(file) {
  const full = path.resolve(root, file);
  if (modules.has(full)) return modules.get(full).exports;
  if (full.endsWith('.json')) return JSON.parse(fs.readFileSync(full, 'utf8'));
  const mod = { exports: {} };
  modules.set(full, mod);
  vm.runInThisContext('(function(require,module,exports){' + compile(fs.readFileSync(full, 'utf8')) + '\n})', { filename: full })(name => {
    if (!name.startsWith('@/') && !name.startsWith('.')) return require(name);
    const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(full), name);
    return load([base, base + '.ts', base + '.json'].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()));
  }, mod, mod.exports);
  return mod.exports;
}
const rules = load('lib/profile-questions.ts');
const { useProfileStore } = load('zustan/useProfileStore.ts');
const { ageFromBirthDate } = load('lib/birth-date.ts');
const schema = rules.defaultQuestions;
const byPath = field => schema.questions.find(q => q.path === field);
const formFile = path.join(root, 'components/custom/updateProfile/ProfileUpdateForm.tsx');
const source = fs.readFileSync(formFile, 'utf8');
const ast = ts.createSourceFile(formFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node)) declarations.set(node.name.getText(ast), node);
  if (ts.isFunctionDeclaration(node) && node.name) declarations.set(node.name.text, node);
  ts.forEachChild(node, visit);
}
visit(ast);
const evaluate = (code, context = {}) => vm.runInNewContext(compile(code), {
  ...rules, ageFromBirthDate, useProfileStore, ...context,
});
const isAnswered = evaluate('(' + declarations.get('isAnswered').getText(ast) + ')');
const questionFlow = evaluate('(' + declarations.get('questionFlow').getText(ast) + ')');
function fixture(address) {
  useProfileStore.getState().initializeForm({ gender: 'male', residenceCountry: 'Bangladesh', address });
}
function setter(filename) {
  const text = fs.readFileSync(path.join(root, 'components/custom/updateProfile', filename), 'utf8');
  const tree = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  function find(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'setAnswer') handler = node.initializer;
    ts.forEachChild(node, find);
  }
  find(tree);
  return (q, answer) => evaluate('(' + handler.getText(tree) + ')', {
    ...useProfileStore.getState(), profile: useProfileStore.getState().formData,
    formData: useProfileStore.getState().formData, schema,
    NUMERIC_PATHS: [], passedQuestions: { current: new Set() },
  })(q, answer);
}
function resolveQuestion(activeQuestionId, currentStep, passed = []) {
  const formData = useProfileStore.getState().formData;
  const flow = questionFlow(schema, formData);
  const levels = schema.sections.map(section => ({ section, questions: flow.filter(q => q.section === section.id) }))
    .filter(level => level.questions.length);
  const start = source.indexOf('  const answered =');
  const end = source.indexOf('  const questionRoot =', start);
  return evaluate('(() => {' + source.slice(start, end) + '\nreturn { question, qi, levelIndex }; })()', {
    isAnswered, flow, levels, formData, currentStep, activeQuestionId,
    passedQuestions: { current: new Set(passed) },
  });
}
function openAddress(startAt) {
  const formData = useProfileStore.getState().formData;
  const flow = questionFlow(schema, formData);
  const levels = schema.sections.map(section => ({ section, questions: flow.filter(q => q.section === section.id) }))
    .filter(level => level.questions.length);
  let active, view;
  const goLevel = evaluate('(' + declarations.get('goLevel').initializer.getText(ast) + ')', {
    levels, formData, answered: q => isAnswered(q, rules.readQuestionAnswer(formData, q)),
    passedQuestions: { current: new Set() },
    setCurrentStep: useProfileStore.getState().setCurrentStep,
    setActiveQuestionId: id => { active = id; }, setView: next => { view = next; },
    window: { scrollTo() {} },
  });
  goLevel(levels.findIndex(level => level.section.id === 1), startAt);
  return { active, view };
}
async function advance(question, { skipped = false, save = async () => {} } = {}) {
  let active, view = 'play', saves = 0, errors = 0;
  const passedQuestions = { current: new Set() };
  const formData = useProfileStore.getState().formData;
  const next = evaluate('(' + declarations.get('next').initializer.getText(ast) + ')', {
    question, view, schema, saved: { current: formData },
    answered: (q, profile) => isAnswered(q, rules.readQuestionAnswer(profile, q)),
    advancePending: { current: false }, autoAdvanceTimer: { current: null },
    queueSave: async () => { saves++; await save(); }, questionFlow, passedQuestions,
    setActiveQuestionId: id => { active = id; }, setView: next => { view = next; },
    setCurrentStep: useProfileStore.getState().setCurrentStep,
    setIsAdvancing() {}, setStreak() {}, setCheer() {}, setShake() {}, CHEERS: ['OK'],
    toast: { error() { errors++; } }, window: { scrollTo() {} },
  });
  await next(skipped);
  return { active, view, saves, errors };
}
(async () => {
  const savedAddress = { district: 'Dhaka', upazila: 'Savar', cityCorporation: '', area: 'Custom rural ward', presentAddress: 'Saved street' };
  fixture(savedAddress);
  assert.equal(resolveQuestion('no-longer-visible-question', 1).question?.path, 'address.permanentAddress',
    'A stale active question must resume at an unanswered field, never the saved district');
  assert.equal(resolveQuestion(byPath('address.area').id, 1).question?.path, 'address.area',
    'Explicitly editing a saved answer must keep that question selected');
  fixture({ ...savedAddress, permanentAddress: 'Saved village', extraInfo: 'Saved details' });
  assert.equal(openAddress().view, 'review', 'A fully answered address section must open review');
  assert.equal(openAddress(0).active, byPath('address.district').id, 'Review must still support explicit edits');
  for (const filename of ['ProfileUpdateForm.tsx', 'DynamicQuestionStep.tsx']) {
    const choose = setter(filename);
    for (const parent of ['district', 'upazila']) {
      fixture(savedAddress);
      choose(byPath('address.' + parent), savedAddress[parent]);
      assert.equal(useProfileStore.getState().formData.address.area, savedAddress.area,
        filename + ': reselecting the saved ' + parent + ' must preserve the area');
    }
    fixture({ ...savedAddress, upazila: '', cityCorporation: 'Dhaka North City Corporation', area: 'Gulshan' });
    choose(byPath('address.cityCorporation'), 'Dhaka North City Corporation');
    assert.equal(useProfileStore.getState().formData.address.area, 'Gulshan', filename + ': reselecting city must preserve area');
    choose(byPath('address.cityCorporation'), 'Dhaka South City Corporation');
    assert.equal(useProfileStore.getState().formData.address.area, '', filename + ': changing city invalidates old area');
    fixture(savedAddress);
    choose(byPath('address.district'), 'Feni');
    assert.equal(useProfileStore.getState().formData.address.upazila, '');
    assert.equal(useProfileStore.getState().formData.address.area, '');
    assert.equal(useProfileStore.getState().formData.address.presentAddress, 'Saved street');
  }
  fixture({ district: 'Dhaka', upazila: 'Savar', area: 'Custom rural ward' });
  const area = questionFlow(schema, useProfileStore.getState().formData).find(q => q.path === 'address.area');
  const result = await advance(area);
  assert.notEqual(result.active, area.id, 'An answered area must advance to a different question');
  assert.equal(result.saves, 1);
  assert.equal(result.errors, 0);
  fixture({ district: 'Dhaka', cityCorporation: 'Dhaka North City Corporation', area: 'Gulshan' });
  const city = questionFlow(schema, useProfileStore.getState().formData).find(q => q.path === 'address.cityCorporation');
  const switched = await advance(city, { save: async () => {
    fixture({ ...savedAddress, permanentAddress: 'Saved village', extraInfo: 'Saved details', area: '' });
  } });
  assert.equal(switched.active, byPath('address.area').id,
    'A question hidden during a save must continue to pending questions, not finish');
  assert.equal(switched.view, 'play');
  fixture({ district: 'Dhaka', upazila: 'Savar', area: '' });
  const blocked = await advance({ ...area, required: true }, { skipped: true });
  assert.equal(blocked.saves, 0, 'Required blank area must never be skipped');
  assert.equal(blocked.errors, 1);
  console.log('PASS: saved address preservation, stale-question resume, required validation and area navigation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
