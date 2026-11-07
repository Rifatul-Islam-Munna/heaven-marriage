import {SupportService} from './support.service';

describe('AI training preview',()=>{
 const makeService=()=>{
   const knowledge=[
     {id:'example-1',category:'contact',question:'How do I contact your office?',
      answer:'Call our general service desk during office hours.',
      keywords:['office','contact','phone'],enabled:true},
   ];
   const collection=(name:string)=>{
     if(name==='platform_settings')return {findOne:jest.fn().mockResolvedValue({premium:{visible:false}})};
     const rows=name==='support_knowledge'?knowledge:[];
     return {find:jest.fn(()=>({
       sort:jest.fn().mockReturnThis(),
       limit:jest.fn().mockReturnThis(),
       toArray:jest.fn().mockResolvedValue(rows),
     }))};
   };
   const db={collection:jest.fn(collection)};
   const quota={consume:jest.fn().mockResolvedValue({remaining:9})};
   const gemini={enabled:jest.fn().mockReturnValue(false)};
   return {service:new SupportService(db as any,quota as any,gemini as any),quota};
 };
 it('previews a published training answer without consuming visitor quota',async()=>{
   const {service,quota}=makeService();
   const response=await service.preview('How do I contact your office?');
   expect(response.answer).toContain('Call our general service desk');
   expect(response.remaining).toBe(10);
   expect(quota.consume).not.toHaveBeenCalled();
 });
 it('public chat still consumes a visitor quota and excludes unrelated topics',async()=>{
   const {service,quota}=makeService();
   const response=await service.reply('How do I contact your office?','visitor','network');
   expect(quota.consume).toHaveBeenCalledWith('visitor','network');
   expect(response.remaining).toBe(9);
   const unrelated=await service.preview('Can you write me a football match prediction?');
   expect(unrelated.answer).toContain('Niqaha.com');
 });
 it('requires a real question even in training preview',async()=>{
   const {service}=makeService();
   await expect(service.preview('hi')).rejects.toThrow('Question must contain');
 });
});
