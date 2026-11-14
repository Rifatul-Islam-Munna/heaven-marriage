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
const {useProfileStore}=load('zustan/useProfileStore.ts');
// Server rendering otherwise uses Zustand's initial snapshot instead of this fixture.
mocks['@/zustan/useProfileStore']={useProfileStore:Object.assign(
  selector=>selector(useProfileStore.getState()),{getState:useProfileStore.getState},
)};
const { DynamicQuestionStep, QuestionInput } = load('components/custom/updateProfile/DynamicQuestionStep.tsx');
const {getMissingQuestions}=load('lib/profile-questions.ts');
const {profileQuestionOptions}=load('lib/profile-question-options.ts');
const upazilaQuestion=defaultQuestions.questions.find(q=>q.path==='address.upazila');
const cityQuestion=defaultQuestions.questions.find(q=>q.path==='address.cityCorporation');
const noCityForm=renderToStaticMarkup(React.createElement(QuestionInput,{
  q:cityQuestion,value:'',onChange:noop,profile:{address:{district:'Munshiganj',upazila:'Lohajang'}},
}));
assert.ok(!noCityForm.includes('আগের ঠিকানা বা parent নির্বাচন করুন।'));
assert.ok(!noCityForm.includes('আগে জেলা নির্বাচন করুন।'),'Selected district must not trigger a missing-parent hint');
assert.ok(!noCityForm.includes('উপজেলা নির্বাচন করুন।'),'Chosen Upazila must not trigger an empty-city hint');
const missingDistrictForm=renderToStaticMarkup(React.createElement(QuestionInput,{
  q:cityQuestion,value:'',onChange:noop,profile:{address:{}},
}));
assert.ok(missingDistrictForm.includes('আগে জেলা নির্বাচন করুন।'));
const locationSchema={...defaultQuestions,questions:[upazilaQuestion,cityQuestion].map(q=>({...q,required:true}))};
for(const address of [
  {district:'Dhaka',cityCorporation:'Dhaka North City Corporation'},
  {district:'Dhaka',upazila:'Savar'},
]){
  const member={gender:'male',residenceCountry:'Bangladesh',address};
  useProfileStore.getState().initializeForm(member);
  const addressForm=renderToStaticMarkup(React.createElement(DynamicQuestionStep,{schema:locationSchema,step:1}));
  assert.ok(addressForm.includes('id="question-'+upazilaQuestion.id+'"'),'Saved city must not hide Upazila');
  assert.ok(addressForm.includes('id="question-'+cityQuestion.id+'"'),'Saved Upazila must not hide City Corporation');
  assert.ok(addressForm.includes('উপজেলা নির্বাচন করুন'),'Upazila needs an explicit label');
  assert.equal(getMissingQuestions(member,locationSchema,1).length,0,'Either choice must satisfy required address');
}
const customLocations=[
  {kind:'upazila',name:'New Upazila',label:'নতুন উপজেলা',district:'Dhaka',enabled:true},
  {kind:'upazila',name:'Other District Upazila',label:'Other',district:'Feni',enabled:true},
  {kind:'upazila',name:'Hidden Upazila',label:'Hidden',district:'Dhaka',enabled:false},
  {kind:'cityCorporation',name:'New City Corporation',label:'নতুন সিটি কর্পোরেশন',district:'Dhaka',enabled:true},
  {kind:'area',name:'New Rural Ward',label:'Ward',district:'Dhaka',upazila:'New Upazila',enabled:true},
  {kind:'area',name:'New City Ward',label:'Ward',district:'Dhaka',cityCorporation:'New City Corporation',enabled:true},
];
const ruralProfile={address:{district:'Dhaka',upazila:'New Upazila'}};
const ruralOptions=profileQuestionOptions(upazilaQuestion,'male',ruralProfile,customLocations);
assert.ok(ruralOptions.some(option=>option.value==='New Upazila'&&option.label==='নতুন উপজেলা'));
assert.ok(!ruralOptions.some(option=>['Other District Upazila','Hidden Upazila'].includes(option.value)));
assert.ok(profileQuestionOptions(cityQuestion,'male',ruralProfile,customLocations).some(option=>option.value==='New City Corporation'));
const areaQuestion=defaultQuestions.questions.find(q=>q.path==='address.area');
assert.deepEqual(profileQuestionOptions(areaQuestion,'male',ruralProfile,customLocations).map(option=>option.value),['New Rural Ward']);
assert.deepEqual(profileQuestionOptions(areaQuestion,'male',{address:{district:'Dhaka',cityCorporation:'New City Corporation'}},customLocations).map(option=>option.value),['New City Ward']);
const {questionUsesSeparateStorage}=load('lib/profile-questions.ts');
for(const filename of ['DynamicQuestionStep.tsx','ProfileUpdateForm.tsx']){
  const source=fs.readFileSync(path.join(root,'components/custom/updateProfile',filename),'utf8');
  const ast=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let setter;
  function findSetter(node){
    if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='setAnswer')setter=node.initializer;
    ts.forEachChild(node,findSetter);
  }
  findSetter(ast);
  assert.ok(setter,filename+' must expose its answer handler');
  const setterJs=ts.transpileModule('('+setter.getText(ast)+')',{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText;
  const choose=(q,answer)=>{
    const state=useProfileStore.getState();
    const handler=vm.runInNewContext(setterJs,{
      ...state,profile:state.formData,questionUsesSeparateStorage,NUMERIC_PATHS:[],
    });
    handler(q,answer);
  };
  useProfileStore.getState().initializeForm({gender:'male',address:{district:'Dhaka',
    cityCorporation:'Dhaka North City Corporation',area:'Gulshan',presentAddress:'Keep saved address'}});
  choose(upazilaQuestion,'Savar');
  assert.deepEqual(useProfileStore.getState().formData.address,{district:'Dhaka',
    upazila:'Savar',cityCorporation:'',area:'',presentAddress:'Keep saved address'},filename+': switching to Upazila clears city and dependent area');
  useProfileStore.getState().updateNestedField('address','area','Rural Ward');
  choose(cityQuestion,'');
  assert.equal(useProfileStore.getState().formData.address.upazila,'Savar',filename+': clearing unused city keeps Upazila');
  assert.equal(useProfileStore.getState().formData.address.area,'Rural Ward');
  choose(cityQuestion,'Dhaka South City Corporation');
  assert.equal(useProfileStore.getState().formData.address.upazila,'');
  assert.equal(useProfileStore.getState().formData.address.area,'');
  useProfileStore.getState().updateNestedField('address','area','Motijheel');
  choose(upazilaQuestion,'');
  assert.equal(useProfileStore.getState().formData.address.cityCorporation,'Dhaka South City Corporation');
  assert.equal(useProfileStore.getState().formData.address.area,'Motijheel');
  choose(defaultQuestions.questions.find(q=>q.path==='address.district'),'Feni');
  assert.equal(useProfileStore.getState().formData.address.cityCorporation,'');
  assert.equal(useProfileStore.getState().formData.address.upazila,'');
  assert.equal(useProfileStore.getState().formData.address.area,'');
}
useProfileStore.getState().resetForm();
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
