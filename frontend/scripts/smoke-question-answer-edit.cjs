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
  questionOptionsWithSavedAnswer, savedMultiValues, questionDisplayValue, newQuestionRuleErrors } = load('lib/profile-questions.ts');
const { currentPublicLabel } = load('lib/biodata-public-label.ts');
const { savedBiodataAddress } = load('lib/biodata-address.ts');
const { visiblePublicAnswer } = load('lib/biodata-visible-answer.ts');
assert.equal(visiblePublicAnswer('[সংরক্ষিত]Sadar'), undefined);
assert.deepEqual(visiblePublicAnswer(['Safe one','[সংরক্ষিত]Private','Safe two']),
  ['Safe one','Safe two']);
assert.deepEqual(visiblePublicAnswer({city:'Jessore',private:'[সংরক্ষিত]Sadar'}),
  {city:'Jessore'});
assert.equal(visiblePublicAnswer(false), false);
assert.equal(visiblePublicAnswer(0), 0);
console.log('PASS: Legacy redaction fragments omitted for all public field types');
const permanentQuestion = { ...defaultQuestions.questions.find(q => q.path === 'address.district'),
  id:'q_' + 'c'.repeat(32),path:'address.permanentAddress',
  question:'স্থায়ী ঠিকানা',publicLabel:'স্থায়ী ঠিকানা',section:1,
  gender:'both',enabled:true,showPublic:true };
const addressProfile = {
  gender:'female',
  publicQuestionSchema:{revision:1,sections:[],questions:[permanentQuestion]},
  publicAnswers:{[permanentQuestion.id]:'[সংরক্ষিত]Sadar, যশোর'},
};
assert.equal(savedBiodataAddress(addressProfile,'permanentAddress'),'');
assert.equal(savedBiodataAddress({
  ...addressProfile,
  publicAnswers:{[permanentQuestion.id]:'Jessore Sadar, যশোর'},
},'permanentAddress'),'Jessore Sadar, যশোর');
console.log('PASS: Redacted street-address fragments are not displayed as public permanent addresses');
const { QuestionInput } = load('components/custom/updateProfile/DynamicQuestionStep.tsx');
const { birthDateParts, completeBirthDate, daysInBirthMonth } = load('lib/birth-date.ts');
const { default: BirthDateSelect } = load('components/custom/updateProfile/BirthDateSelect.tsx');

const fixedToday = new Date('2026-11-16T12:00:00Z');
assert.deepEqual(birthDateParts('2000-02-29'), {day:'29',month:'02',year:'2000'});
assert.deepEqual(birthDateParts('invalid'), {day:'',month:'',year:''});
assert.equal(daysInBirthMonth('02','2000'),29);
assert.equal(daysInBirthMonth('02','1900'),28);
assert.equal(daysInBirthMonth('04','2000'),30);
assert.equal(completeBirthDate({day:'29',month:'02',year:'2000'},fixedToday),'2000-02-29');
assert.equal(completeBirthDate({day:'29',month:'02',year:'2001'},fixedToday),undefined);
assert.equal(completeBirthDate({day:'31',month:'04',year:'2000'},fixedToday),undefined);
assert.equal(completeBirthDate({day:'01',month:'12',year:'2026'},fixedToday),undefined);
assert.equal(completeBirthDate({day:'15',month:'11',year:''},fixedToday),undefined);
const dateMarkup = renderToStaticMarkup(React.createElement(BirthDateSelect,{
  id:'dob',value:'2000-02-29',required:true,onChange() {},
}));
assert(dateMarkup.includes('data-birth-date-select'));
assert(dateMarkup.indexOf('id="dob-day"') < dateMarkup.indexOf('id="dob-month"'));
assert(dateMarkup.indexOf('id="dob-month"') < dateMarkup.indexOf('id="dob-year"'));
assert(dateMarkup.includes('জন্মতারিখ'));
assert(dateMarkup.includes('selected=""'), 'Previously saved date must preselect its dropdown values');
const emptyDateMarkup=renderToStaticMarkup(React.createElement(BirthDateSelect,{
  id:'dob-new',value:'',onChange() {},
}));
assert(emptyDateMarkup.includes('প্রথমে দিন, তারপর মাস ও বছর'));
console.log('PASS: Day → Month → Year dropdown, saved date hydration, leap years and invalid dates');
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
assert(questionUsesSeparateStorage(legacy), 'Legacy edits must use a stable answer ID');
assert.equal(currentPublicLabel({ ...legacy, question:'Updated prompt',publicLabel:'Original prompt' },
  'Original prompt'),'Updated prompt');

const render = (q, value) => renderToStaticMarkup(React.createElement(QuestionInput, { q, value, onChange() {} }));
assert(render(changed, 3).includes('value="3"'));
assert(render(legacy, 'Saved details').includes('value="Saved details"'));
// Legacy text answers retyped as number/date remain editable instead of read-only.
for (const type of ['number', 'date']) {
  const html = render({ ...changed, type }, 'Previous detailed answer');
  assert(html.includes('data-saved-question-answer='), type + ' must flag an incompatible historic answer');
  assert(html.includes('value="Previous detailed answer"'), type + ' must expose the historic answer in an editable input');
}
const mapProfile = { dynamicAnswers: new Map([[changed.id, 'Map-backed answer']]) };
assert.equal(readQuestionAnswer(mapProfile, changed), 'Map-backed answer');
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
assert.deepEqual(savedMultiValues('Old, Removed'), ['Old','Removed']);
assert.deepEqual(questionOptionsWithSavedAnswer(multiple,multiple.options,'Old, Removed')
  .map(option=>option.value),['new','Old','Removed']);
assert.equal(questionDisplayValue(['new','removed'], multiple), 'New choice, removed');
assert(render(multiple,'Old, Removed').includes('data-state="checked"'));
const ageQuestion=defaultQuestions.questions.find(q=>q.path==='age');
assert.equal(currentPublicLabel({ ...ageQuestion, publicLabel:'পাত্রের বয়স' }, 'বয়স','female'), 'পাত্রীর বয়স');
assert.equal(currentPublicLabel({ ...original,question:'Updated question',publicLabel:original.publicLabel },
  'Old question','male'),'Updated question');
const conflicting = [
  {...changed,id:'q_'+'c'.repeat(32),rules:[{type:'not_equal',questionId:'q_'+'d'.repeat(32)}]},
  {...changed,id:'q_'+'d'.repeat(32)},
];
const oldConflict={gender:'male',dynamicAnswers:{
  [conflicting[0].id]:'same',[conflicting[1].id]:'same',
}};
assert.equal(newQuestionRuleErrors(oldConflict,conflicting,oldConflict).length,0);
assert.equal(newQuestionRuleErrors(oldConflict,conflicting,{
  gender:'male',dynamicAnswers:{[conflicting[0].id]:'same',[conflicting[1].id]:'different'},
}).length,1);

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
useProfileStore.getState().initializeForm({
  gender:'male',customFields:{'Original prompt':'Old legacy answer'},
});
vm.runInNewContext(setAnswerJs, {
  ...useProfileStore.getState(),questionUsesSeparateStorage,
  question:legacy,answer:'Edited legacy answer',
});
const legacyProfile=useProfileStore.getState().getFormData();
assert.equal(legacyProfile.customFields['Original prompt'],'Old legacy answer');
assert.equal(legacyProfile.dynamicAnswers[legacy.id],'Edited legacy answer');
assert.equal(readQuestionAnswer(legacyProfile,legacy),'Edited legacy answer');
useProfileStore.getState().resetForm();

// The admin completion cards must count exactly the same saved questions as the editable form.
const { getAdminBiodataProgress } = load('lib/admin-biodata-progress.ts');
const sampleSchema = { sections: [{ id: 8, title: 'Additional' }], questions: [
  { ...legacy, section: 8, enabled: true, locked: false, required: true, gender: 'both' },
  { ...changed, section: 8, enabled: true, locked: true, required: false, gender: 'both' },
]};
const adminOverview = getAdminBiodataProgress(sampleSchema, {
  gender: 'male', customFields: { 'Original prompt': 'Old saved answer' },
  familyInfo: { brotherCount: 3 },
});
assert.equal(adminOverview[0].answered, 1);
assert.equal(adminOverview[0].total, 1);
assert.deepEqual(adminOverview[0].answeredLabels, [legacy.question]);
assert(render({ ...changed, type: 'checkbox' }, undefined).includes('aria-pressed="false"'));
// A newly loaded member with only gender saved must NOT inherit default "No"
// checkbox answers or an unchosen default country from the blank form.
useProfileStore.getState().initializeForm({ gender: 'female' });
const minimallySaved = useProfileStore.getState().getFormData();
assert.equal(minimallySaved.familyInfo, undefined);
assert.equal(minimallySaved.pledge, undefined);
assert.equal(minimallySaved.residenceCountry, undefined);
const basicOnly = getAdminBiodataProgress({
  sections: [{ id: 0, title: 'Basic' }],
  questions: defaultQuestions.questions.filter(q => q.section === 0),
}, minimallySaved);
assert.equal(basicOnly[0].answered, 1);
useProfileStore.getState().resetForm();
console.log('PASS: renamed/retyped answers, legacy fields, historic selections, true admin progress and save/reload');
