import {BadRequestException} from '@nestjs/common';
import {Types} from 'mongoose';
import {BUILTINS,type ProfileQuestion} from '../profile-questions/question-config.service';
import {MemberAdminColumnsService,formatMemberBiodataValue} from './member-admin-columns.service';

const dynamicId='q_'+'a'.repeat(32);
const dynamic:ProfileQuestion={
 id:dynamicId,question:'What kind of work?',publicLabel:'পেশার বিস্তারিত',section:2,
 gender:'both',type:'text',options:[],optionSource:'',required:false,
 enabled:true,showPublic:false,order:1,locked:false,
};

function harness(){
 const firstId=new Types.ObjectId(),secondId=new Types.ObjectId();
 const questions=[
   {...BUILTINS.find(q=>q.path==='maritalStatus')!},
   dynamic,
   {...BUILTINS.find(q=>q.path==='password')!},
   {...BUILTINS.find(q=>q.path==='age')!,enabled:false},
 ];
 const schema={revision:11,sections:[{id:2,title:'ব্যক্তিগত তথ্য'}],questions};
 let selected:string[]=[];
 let layout:any=null;
 const members:any={find:jest.fn((query:any,options:any)=>({
   toArray:jest.fn().mockResolvedValue([
     {_id:firstId,gender:'male',maritalStatus:'single',
       dynamicAnswers:{[dynamicId]:'Teacher'},password:'server-secret'},
     {_id:secondId,gender:'female',maritalStatus:'married',
       dynamicAnswers:{[dynamicId]:'Doctor'},password:'another-secret'},
   ]),
 }))};
 const preferences:any={
   findOne:jest.fn(async()=>({questionIds:selected,...(layout!==null?{layout}:{})})),
   updateOne:jest.fn(async(_:any,change:any)=>{
     if(change.$set.questionIds!==undefined)selected=[...change.$set.questionIds];
     if(change.$set.layout!==undefined)layout=change.$set.layout;
     return {matchedCount:1};
   }),
 };
 const columnStore:any={find:jest.fn(()=>({
   sort:jest.fn().mockReturnThis(),limit:jest.fn().mockReturnThis(),
   toArray:jest.fn().mockResolvedValue([]),
 }))};
 const values:any={find:jest.fn(()=>({toArray:jest.fn().mockResolvedValue([])}))};
 const audit:any={insertOne:jest.fn().mockResolvedValue({})};
 const db:any={collection:jest.fn((name:string)=>{
   if(name==='member_admin_column_settings')return preferences;
   if(name==='member_admin_columns')return columnStore;
   if(name==='member_admin_values')return values;
   if(name==='member_admin_column_audit')return audit;
   if(name==='users')return members;
   throw Error('Unknown collection '+name);
 })};
 const service=new MemberAdminColumnsService(db,{get:jest.fn().mockResolvedValue(schema)} as any);
 return {service,questions,firstId,secondId,members,preferences,audit};
}
describe('Admin picks existing biodata questions as table columns',()=>{
 it('offers real and dynamic schema fields without account credentials',async()=>{
   const {service,questions}=harness();
   const list=await service.list();
   expect(list.availableFields.map(q=>q.id)).toContain(dynamicId);
   expect(list.availableFields.map(q=>q.id)).toContain(questions[0].id);
   expect(list.availableFields.map(q=>q.id)).not.toContain(questions[2].id);
   expect(list.availableFields.map(q=>q.id)).not.toContain(questions[3].id);
   expect(list.profileColumns).toEqual([]);
 });
 it('saves selected field order and displays actual answer values for each member',async()=>{
   const {service,questions,firstId,secondId,members,preferences,audit}=harness();
   await expect(service.saveProfileFields('admin',{questionIds:[dynamicId,questions[0].id]}))
     .resolves.toMatchObject({questionIds:[dynamicId,questions[0].id]});
   const list=await service.list(firstId+','+secondId);
   expect(list.profileColumns.map(field=>field.id)).toEqual([dynamicId,questions[0].id]);
   expect(list.profileValues[String(firstId)][dynamicId]).toBe('Teacher');
   expect(list.profileValues[String(secondId)][dynamicId]).toBe('Doctor');
   expect(list.profileValues[String(firstId)][questions[0].id]).toBe('single');
   expect(members.find).toHaveBeenCalledWith(expect.objectContaining({role:'user'}),
     expect.objectContaining({projection:expect.not.objectContaining({password:1})}));
   expect(preferences.updateOne).toHaveBeenCalled();
   expect(audit.insertOne).toHaveBeenCalled();
 });
 it('blocks unknown, private, repeated and excessive field selections',async()=>{
   const {service,questions}=harness();
   for(const questionIds of [
     [questions[2].id],['fake'],[dynamicId,dynamicId],
     Array.from({length:9},(_,i)=>'q_'+String(i).repeat(32)),
   ]){
     await expect(service.saveProfileFields('admin',{questionIds}))
       .rejects.toThrow(BadRequestException);
   }
 });
 it('supports custom headings, grouping multiple existing fields, ordering, and removing columns',async()=>{
   const {service,questions,firstId,secondId}=harness();
   const one={id:'profile-'+ '1'.repeat(32),label:'আমার তথ্য',questionIds:[questions[0].id,dynamicId]};
   const two={id:'profile-'+ '2'.repeat(32),label:'পেশা',questionIds:[dynamicId]};
   expect(await service.saveProfileLayout('admin',{columns:[one,two]}))
     .toMatchObject({profileColumns:[one,two]});
   let current=await service.list(firstId+','+secondId);
   expect(current.profileColumns).toEqual([one,two]);
   expect(current.profileValues[String(firstId)][dynamicId]).toBe('Teacher');
   expect(current.profileValues[String(secondId)][questions[0].id]).toBe('married');
   await service.saveProfileLayout('admin',{columns:[{...one,label:'একসঙ্গে তথ্য'}]});
   current=await service.list();
   expect(current.profileColumns).toEqual([{...one,label:'একসঙ্গে তথ্য'}]);
   await service.saveProfileLayout('admin',{columns:[]});
   expect((await service.list()).profileColumns).toEqual([]);
 });
 it('rejects unsafe, protected or repeated grouped fields',async()=>{
   const {service,questions}=harness();
   const id='profile-'+ 'a'.repeat(32);
   for(const columns of [
     [{id,label:'a',questionIds:[dynamicId]}],
     [{id,label:'Valid',questionIds:[questions[2].id]}],
     [{id,label:'Valid',questionIds:[dynamicId,dynamicId]}],
     [{id,label:'Valid',questionIds:[]}],
     [{id:'bad',label:'Valid',questionIds:[dynamicId]}],
     [{id,label:'Valid',questionIds:Array(7).fill(dynamicId)}],
     [{id,label:'Valid',questionIds:[dynamicId]},{id,label:'Repeated',questionIds:[dynamicId]}],
   ]){
     await expect(service.saveProfileLayout('admin',{columns})).rejects.toThrow(BadRequestException);
   }
 });
 it('formats checkboxes and multi-select answers safely',()=>{
   expect(formatMemberBiodataValue(true,dynamic)).toBe('হ্যাঁ');
   expect(formatMemberBiodataValue(['a','b'],dynamic)).toBe('a, b');
   expect(formatMemberBiodataValue({secret:'unwanted'},dynamic)).toBe('');
 });
});
