// Keep the user editor's instant preview aligned with backend's dynamic completion.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ts=require('typescript');
require.extensions['.ts']=(mod,filename)=>{
  const source=fs.readFileSync(filename,'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{
    module:ts.ModuleKind.CommonJS,esModuleInterop:true,
  }}).outputText;
  mod._compile(output,filename);
};
const {previewBiodataCompletion}=require('../lib/profile-completion.ts');
const {defaultQuestions}=require('../lib/profile-questions.ts');
const create=(id,options={})=>({
  id,question:'Question '+id,publicLabel:'Question '+id,section:2,
  gender:'both',type:'text',options:[],optionSource:'',
  required:true,enabled:true,showPublic:false,order:10,locked:false,...options,
});
const q1='q_'+'a'.repeat(32),q2='q_'+'b'.repeat(32),q3='q_'+'c'.repeat(32);
const questions=[
  create(q1),create(q2),create(q3,{gender:'female'}),
  create('q_'+'d'.repeat(32),{required:false}),
  create('q_'+'e'.repeat(32),{enabled:false}),
];
const schema=revision=>({revision,questions,sections:[]});
const male={gender:'male',dynamicAnswers:{[q1]:'done'}};
assert.deepEqual(previewBiodataCompletion(male,schema(1)),{
  percentage:50,requiredCount:2,answeredCount:1,remaining:[questions[1]],
});
const woman=previewBiodataCompletion({...male,gender:'female'},schema(1));
assert.equal(woman.percentage,33);assert.equal(woman.requiredCount,3);
assert.equal(woman.answeredCount,1);
assert.equal(previewBiodataCompletion({name:'signup only'},schema(1)).percentage,0);
console.log('PASS: Required-only, gender-specific and signup-only completion.');

const qAddress=defaultQuestions.questions.find(q=>q.path==='address.upazila');
const qCity=defaultQuestions.questions.find(q=>q.path==='address.cityCorporation');
assert.ok(qAddress&&qCity);
const addressSchema={revision:3,sections:[],questions:[
 {...qAddress,enabled:true,required:true},
 {...qCity,enabled:true,required:true},
]};
const progress=previewBiodataCompletion({gender:'female',residenceCountry:'Bangladesh',
  address:{district:'Dhaka',cityCorporation:'Dhaka North City Corporation'}},addressSchema);
assert.equal(progress.percentage,100);
assert.equal(progress.requiredCount,1);
assert.equal(previewBiodataCompletion({gender:'female',residenceCountry:'Canada'},addressSchema).requiredCount,0);
console.log('PASS: City Corporation alternative and foreign-residence exceptions.');

const check=create('q_'+'f'.repeat(32),{type:'checkbox'});
assert.equal(previewBiodataCompletion({gender:'male',dynamicAnswers:{[check.id]:false}},
  {revision:4,sections:[],questions:[check]}).percentage,0);
const optional={...check,required:false};
assert.equal(previewBiodataCompletion({gender:'male',dynamicAnswers:{[check.id]:false}},
  {revision:5,sections:[],questions:[optional]}).percentage,100);
const changed=previewBiodataCompletion(male,{revision:6,sections:[],questions:questions.slice(0,2).map((q,i)=>i===1?{...q,required:false}:q)});
assert.equal(changed.percentage,100);
console.log('PASS: Checkbox, optional fields and live question requirement revisions.');
