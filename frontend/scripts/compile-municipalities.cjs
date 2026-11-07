// Dataset source: iqbalhasandev/bangladesh-geo-json v1.0.0 (MIT).
// Verify name mappings against the current application's district/upazila IDs.
const fs=require('node:fs');
const {districts}=require('../staticData/districts.ts');
const {upazilas}=require('../staticData/upazilas.ts');
const data=require('../staticData/municipality-source.json');
const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^bogra/,'bogura').replace(/^comilla/,'cumilla').replace(/^chattagram/,'chattogram').replace(/^chittagong/,'chattogram').replace(/^jessore/,'jashore').replace(/^barisal/,'barishal').replace(/^mymensing/,'mymensing');
const exceptions={
 bogra:'Bogura',comilla:'Cumilla',chattagram:'Chattogram',chittagong:'Chattogram',
 jessore:'Jashore',barisal:'Barishal',feni:'Feni',narail:'Narail',coxsbazar:"Cox's Bazar",
 brahmanbaria:'Brahmanbaria',meherpur:'Meherpur',bandarban:'Bandarban',
 khagrachhari:'Khagrachari',sirajganj:'Sirajgonj',chapainawabganj:'Nawabganj',
 jhalakathi:'Jhalokati',moulvibazar:'Maulvibazar',
};
function distance(a,b){
 const dp=Array.from({length:a.length+1},(_,i)=>Array.from({length:b.length+1},(_,j)=>i===0?j:j===0?i:0));
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)
   dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+Number(a[i-1]!==b[j-1]));
 return dp[a.length][b.length];
}
const mismatch=[],rows=[],districtLog=new Set(),fuzzy=[],fallback=[];
for(const division of data)for(const district of division.districts){
 const dk=normalize(district.name);
 const d=districts.find(x=>normalize(x.name)===dk)||districts.find(x=>x.name===exceptions[dk]);
 if(!d){districtLog.add(district.name);continue;}
 const local=upazilas.filter(x=>x.district_id===d.id);
 for(const up of district.upazilas)for(const municipality of up.pourashavas||[]){
   // Bogura municipality was dissolved when Bogura City Corporation was gazetted, May 2026.
   if(d.name==='Bogura'&&normalize(municipality.name)==='bogura')continue;
   const n=normalize(up.name);
   let mapped=local.find(x=>normalize(x.name)===n);
   if(!mapped){
     const oldSadar=n.replace('sadar','');
     mapped=local.find(x=>normalize(x.name)===oldSadar)||local.find(x=>normalize(x.name).replace('sadar','')===oldSadar);
   }
   if(!mapped){
     const localCandidates=local.map(row=>({row,score:distance(n,normalize(row.name))})).sort((a,b)=>a.score-b.score);
     const first=localCandidates[0],second=localCandidates[1];
     if(first&&first.score<=3&&(!second||second.score-first.score>=2)){
       mapped=first.row;fuzzy.push({source:up.name,mapped:mapped.name,score:first.score});
     }
   }
   if(!mapped){
      mismatch.push({district:d.name,upazila:up.name,pourashava:municipality.name});
      fallback.push({kind:'upazila',name:up.name,label:up.bn_name,district:d.name});
   }
   rows.push({kind:'area',name:municipality.name+' Pourashava',label:municipality.bn_name+' পৌরসভা',district:d.name,upazila:mapped?.name||up.name});
 }
}
const unique=[...new Map(rows.map(r=>[[r.district,r.upazila,r.name].join('|').toLowerCase(),r])).values()];
fs.writeFileSync('staticData/municipality-areas.json',JSON.stringify(unique,null,2)+'\n');
fs.writeFileSync('staticData/municipality-fallback-upazilas.json',JSON.stringify(
 [...new Map(fallback.map(row=>[[row.district,row.name].join('|'),row])).values()],null,2)+'\n');
fs.writeFileSync('staticData/municipality-unmapped.json',JSON.stringify({missingDistricts:[...districtLog],unmatched:mismatch},null,2)+'\n');
console.log('matched',unique.length,'unmatched',mismatch.length,'fuzzy',fuzzy.length,'districts unmatched',[...districtLog]);
console.log('fuzzy names',fuzzy.slice(0,60));
console.log('sample unmatched',mismatch.slice(0,23));
