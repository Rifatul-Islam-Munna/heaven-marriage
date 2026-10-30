const assert=require('node:assert/strict');
const {ConfigService}=require('@nestjs/config');
const {z}=require('zod');
const {GeminiService}=require('../dist/user/gemini.service');
(async()=>{
 const calls=[],original=global.fetch;
 global.fetch=async(url,init)=>{
  calls.push({url:String(url),body:JSON.parse(init.body)});
  return new Response(JSON.stringify({candidates:[{content:{role:'model',parts:[{text:JSON.stringify({advice:'পরীক্ষার উত্তর'})}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:5,totalTokenCount:15}}),{headers:{'content-type':'application/json'}});
 };
 try{
  const service=new GeminiService(new ConfigService({GEMINI_API_KEY:'synthetic-test-key',GEMINI_MODEL:'gemini-3.8-flash'}));
  const result=await service.generate('Explain this test question','Synthetic biodata question',z.object({advice:z.string()}));
  assert.equal(result.advice,'পরীক্ষার উত্তর');assert.equal(calls.length,1);
  assert(calls[0].url.includes('gemini-3.8-flash'));
  assert.equal(calls[0].body.generationConfig.responseMimeType,'application/json');
  global.fetch=async()=>new Response('{}',{status:503,headers:{'content-type':'application/json'}});
  await assert.rejects(()=>service.generate('Test','Synthetic',z.object({advice:z.string()})),e=>e.getStatus()===503);
  const disabled=new GeminiService(new ConfigService({GEMINI_API_KEY:'',GOOGLE_GENERATIVE_AI_API_KEY:''}));
  assert.equal(disabled.enabled(),false);
  await assert.rejects(()=>disabled.generate('Test','Synthetic',z.object({advice:z.string()})),e=>e.getStatus()===503);
  console.log('PASS Gemini AI SDK: native module loading, Google request schema, structured result, provider failure and disabled credentials. All provider HTTP calls were stubbed.');
 }finally{global.fetch=original;}
})().catch(error=>{console.error(error.message);process.exitCode=1});
