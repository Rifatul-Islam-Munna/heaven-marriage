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
console.log('PASS: section completion, city corporation alternative, account separation and section navigation');
