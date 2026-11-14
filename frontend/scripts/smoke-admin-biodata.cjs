// Exercise the actual TypeScript progress logic with the locally installed TS compiler.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ts=require('typescript');
require.extensions['.ts']=(mod,filename)=>{
  const source=fs.readFileSync(filename,'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  mod._compile(output,filename);
};
const {defaultQuestions}=require('../lib/profile-questions.ts');
const {getAdminBiodataProgress,adminAnswerIsComplete}=require('../lib/admin-biodata-progress.ts');
const addressPaths=['address.district','address.upazila','address.cityCorporation','address.area'];
const chosen=addressPaths.map(path=>defaultQuestions.questions.find(q=>q.path===path));
assert(chosen.every(Boolean),'Required address fields should exist in default questions');
const schema={revision:0,sections:[{id:1,title:'Address'}],questions:chosen};
const state={gender:'male',residenceCountry:'Bangladesh',
  address:{district:'Dhaka',upazila:'',cityCorporation:'',area:''}};
const before=getAdminBiodataProgress(schema,state)[0];
assert.equal(before.answered,1);
assert(before.requiredMissing>0,'Upazila still required before city corporation selected');
const after=getAdminBiodataProgress(schema,{...state,address:{
  ...state.address,cityCorporation:'Dhaka North City Corporation',area:'Gulshan',
}})[0];
assert.equal(after.requiredMissing,0,'City corporation must be an alternative to upazila');
assert.equal(after.answered,after.total,'District+city+area should be complete');
assert(getAdminBiodataProgress(schema,{...state,residenceCountry:'Canada'}).length===0,
  'Foreign residents should not need Bangladesh address fields');
assert.equal(adminAnswerIsComplete({...chosen[0],type:'checkbox',required:false},false),true);
assert.equal(adminAnswerIsComplete({...chosen[0],type:'checkbox',required:true},false),false);
const component=fs.readFileSync(path.join(__dirname,'../components/edit-profile/Profile-Update-Admin.tsx'),'utf8');
assert(!component.includes('window.scrollTo({ top: 0'), 'Section navigation must not scroll to page top');
assert(component.includes('scrollIntoView'), 'Section navigation must scroll to the editor card');
assert(component.includes('Account & security'), 'Account controls must be separated from biodata');
// Execute the real profile-refresh effect with the actual store: refresh after
// Next/Previous must keep the section; another member must start fresh.
const {useProfileStore}=require('../zustan/useProfileStore.ts');
const {diffBiodataDraft,hasBiodataChanges}=require('../lib/biodata-draft.ts');
const vm=require('node:vm');
const ast=ts.createSourceFile('Profile-Update-Admin.tsx',component,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let refreshEffect;
function findRefreshEffect(node){
  if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&
    node.arguments[0]?.getText(ast).includes('initializeForm(data')) refreshEffect=node.arguments[0];
  ts.forEachChild(node,findRefreshEffect);
}
findRefreshEffect(ast);
assert(refreshEffect,'Admin profile refresh effect should exist');
const effectJs=ts.transpileModule('('+refreshEffect.getText(ast)+')();',{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;
const member={_id:'member-one',gender:'female',dateOfBirth:'2000-05-15'};
const context={data:member,id:member._id,useProfileStore,diffBiodataDraft,hasBiodataChanges,
  initialBiodataRef:{current:null},loadedMemberRef:{current:''},
  initializeForm:useProfileStore.getState().initializeForm,setContactEmail:()=>{},setContactPhone:()=>{}};
const refresh=()=>vm.runInNewContext(effectJs,context);
useProfileStore.getState().resetForm();
refresh();
assert.equal(useProfileStore.getState().currentStep,0);
for(const step of [1,2,3,2]){
  useProfileStore.getState().setCurrentStep(step);
  context.data={...member,phoneNumber:'01700000000'};
  refresh();
  assert.equal(useProfileStore.getState().currentStep,step,'Same-member refresh must keep selected section');
}
useProfileStore.getState().updateField('dateOfBirth','2001-06-16');
refresh();
assert.equal(useProfileStore.getState().formData.dateOfBirth,'2001-06-16','Refresh must keep unsaved edits');
assert.equal(useProfileStore.getState().currentStep,2);
// Saving clears the dirty baseline, then triggers another refresh.
context.initialBiodataRef.current=useProfileStore.getState().getFormData();
context.data={...member,dateOfBirth:'2001-06-16'};
refresh();
assert.equal(useProfileStore.getState().currentStep,2,'Save refresh must keep selected section');
useProfileStore.getState().updateField('name','Unsaved draft');
context.data={_id:'member-two',gender:'male',name:'Another member'};
context.id='member-two';
refresh();
assert.equal(useProfileStore.getState().currentStep,0,'Another member must start at the first section');
assert.equal(useProfileStore.getState().formData.name,'Another member');
useProfileStore.getState().resetForm();
console.log('PASS: section completion, city alternative, account separation, refresh/save navigation and unsaved drafts');
