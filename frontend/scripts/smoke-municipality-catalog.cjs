const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const municipalities=require(path.join(base,'staticData/municipality-areas.json'));
const fallbacks=require(path.join(base,'staticData/municipality-fallback-upazilas.json'));
const {districts}=require(path.join(base,'staticData/districts.ts'));
const {upazilas}=require(path.join(base,'staticData/upazilas.ts'));
const normalized=(x)=>String(x).toLowerCase().replace(/[^a-z0-9]/g,'');
assert.equal(districts.length,64,'Expect all 64 Bangladesh districts');
assert.equal(municipalities.length,327,'Curated source entries changed; review mapping');
assert.equal(new Set(municipalities.map(v=>v.district)).size,64,
  'Municipalities must cover all districts');
const upazilaSet=new Set([...upazilas.map(u=>districts.find(d=>d.id===u.district_id)?.name+'|'+u.name),
 ...fallbacks.map(u=>u.district+'|'+u.name)]);
for(const m of municipalities){
 assert.equal(m.kind,'area');
 assert.ok(districts.some(d=>d.name===m.district),'Unknown district '+m.district);
 assert.ok(upazilaSet.has(m.district+'|'+m.upazila),
   'Invalid upazila '+m.district+' / '+m.upazila);
 assert.match(m.name,/Pourashava$/, 'Municipalities must not be presented as city corporations');
 assert.ok(m.label.includes('পৌরসভা'),'Municipality label needs correct administrative designation');
}
const keys=municipalities.map(m=>[m.district,m.upazila,m.name].map(normalized).join('|'));
assert.equal(new Set(keys).size,keys.length,'Repeated municipality entry');
assert.ok(!municipalities.some(m=>m.district==='Bogura'&&normalized(m.name)==='bogurapourashava'),
  'Former Bogura municipality should not be listed after city corporation gazette');
console.log('PASS: 327 municipalities mapped to correct district/upazila (with explicit fallback mappings) across 64 districts');
console.log('PASS: Each municipality is labeled Pourashava, not incorrectly City Corporation');
console.log('PASS: Duplicate data and former Bogura municipality excluded');
