import {createHmac} from 'node:crypto';
import {findSupportDocuments,supportSiteFacts} from './support-retrieval';
import {SupportQuotaService,DAILY_SUPPORT_LIMIT,validSupportIdentity} from './support-quota.service';

describe('Niqaha support retrieval and visitor limit',()=>{
 it('recognizes Bangla office questions and English premium questions without unrelated answers',()=>{
  const hours=findSupportDocuments('আমি শুক্রবার কখন অফিসে কল করতে পারবো?',[]);
  expect(hours.relevant).toBe(true);
  expect(hours.documents.some(x=>x.id==='contact')).toBe(true);
  const premium=findSupportDocuments('What are the premium assisted connection services?',[]);
  expect(premium.relevant).toBe(true);
  expect(premium.documents.some(x=>x.id==='premium')).toBe(true);
  expect(findSupportDocuments('Who won the cricket match yesterday?',[]).relevant).toBe(false);
  expect(findSupportDocuments('How do I cook biryani?',[]).relevant).toBe(false);
 });
 it('accepts a matching server signature and rejects spoofed signatures',()=>{
  const secret='test-key-valid-12345678901234567890123456789';
  const id='V'.repeat(32),ip='X'.repeat(64),stamp=String(Date.now());
  const signature=createHmac('sha256',secret).update(id+'\n'+ip+'\n'+stamp).digest('hex');
  expect(validSupportIdentity(id,ip,stamp,signature,secret)).toBe(true);
  expect(validSupportIdentity(id,ip,stamp,'a'.repeat(64),secret)).toBe(false);
  expect(validSupportIdentity(id,ip,String(Date.now()-120000),signature,secret)).toBe(false);
 });
 it('counts 10 questions over a rolling 24-hour window per visitor and network',async()=>{
  const saved=process.env.SUPPORT_BOT_SECRET;
  process.env.SUPPORT_BOT_SECRET='K'.repeat(48);
  const store=new Map<string,any>();
  const coll={
   createIndex:jest.fn().mockResolvedValue('expiresAt_1'),
   findOne:jest.fn(async(filter:any)=>store.get(filter._id)||null),
   insertOne:jest.fn(async(row:any)=>{
     if(store.has(row._id))throw {code:11000};
     store.set(row._id,{...row});return {insertedId:row._id};
   }),
   updateOne:jest.fn(async(filter:any,update:any)=>{
     const row=store.get(filter._id);
     if(!row||row.rev!==filter.rev)return {modifiedCount:0};
     store.set(filter._id,{...row,...update.$set,rev:row.rev+1});
     return {modifiedCount:1};
   }),
  };
  try{
    const quota=new SupportQuotaService({collection:()=>coll} as any);
    await quota.onModuleInit();
    for(let i=0;i<DAILY_SUPPORT_LIMIT;i++)
      expect((await quota.consume('visitor-1','network-1')).remaining).toBe(9-i);
    await expect(quota.consume('visitor-1','network-1')).rejects.toMatchObject({status:429});
    await expect(quota.consume('visitor-2','network-1')).rejects.toMatchObject({status:429});
    expect(store.size).toBe(2);
  }finally{
    if(saved===undefined)delete process.env.SUPPORT_BOT_SECRET;
    else process.env.SUPPORT_BOT_SECRET=saved;
  }
 });
});
