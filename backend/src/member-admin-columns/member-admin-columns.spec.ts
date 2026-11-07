import {BadRequestException} from '@nestjs/common';
import {Types} from 'mongoose';
import {MemberAdminColumnsService,parseColumn,validMemberCell,HOT_COLUMN} from './member-admin-columns.service';
import {MemberAdminColumnsController} from './member-admin-columns.controller';
import {ROLES_KEY} from '../lib/roles.decorator';
import {UserType} from '../user/entities/user.entity';

describe('Admin-only dynamic member columns',()=>{
 it('restricts every column endpoint to administrator role',()=>{
   expect(Reflect.getMetadata(ROLES_KEY,MemberAdminColumnsController)).toEqual([UserType.ADMIN]);
 });
 it('provides Hot Data as a preset internal priority column',()=>{
   expect(HOT_COLUMN).toMatchObject({id:'hot-data',type:'choice',enabled:true,builtIn:true});
   expect(HOT_COLUMN.options).toContain('Hot');
 });
 it('validates custom field names, types, unique choices and safe values',()=>{
   expect(parseColumn({label:'Follow-up Date',type:'text'})).toMatchObject({
     label:'Follow-up Date',type:'text',options:[]});
   expect(parseColumn({label:'Lead Status',type:'choice',options:'Hot, Warm, Cold'}).options).toHaveLength(3);
   expect(()=>parseColumn({label:'x',type:'text'})).toThrow(BadRequestException);
   expect(()=>parseColumn({label:'bad',type:'dropdown'})).toThrow(BadRequestException);
   expect(()=>parseColumn({label:'A good field',type:'choice',options:['Hot','hot']})).toThrow(BadRequestException);
   expect(()=>validMemberCell(HOT_COLUMN,'Anything')).toThrow(BadRequestException);
   expect(validMemberCell(HOT_COLUMN,'Hot')).toBe('Hot');
   expect(validMemberCell({...HOT_COLUMN,type:'flag'},false)).toBe(false);
   expect(()=>validMemberCell({...HOT_COLUMN,type:'text'},'A'.repeat(251))).toThrow(BadRequestException);
 });
 it('stores values on admin-only collection, never on member public biodata fields',async()=>{
   const memberId=new Types.ObjectId().toString(),actor='admin123';
   const rows=new Map<string,any>();
   const columns:any={find:jest.fn(()=>({sort:jest.fn().mockReturnThis(),limit:jest.fn().mockReturnThis(),
     toArray:jest.fn().mockResolvedValue([])}))};
   const members:any={findOne:jest.fn().mockResolvedValue({_id:memberId})};
   const audit:any={insertOne:jest.fn().mockResolvedValue({insertedId:memberId})};
   const prefs:any={findOne:jest.fn().mockResolvedValue(null),
     updateOne:jest.fn().mockResolvedValue({matchedCount:1})};
   const values:any={
     updateOne:jest.fn(async(filter:any,update:any)=>{
       const key=String(filter._id);
       const old=rows.get(key)||{_id:filter._id,values:{}};
       old.values['hot-data']=update.$set['values.hot-data'];
       rows.set(key,old);return {matchedCount:1};
     }),
     find:jest.fn((filter:any)=>({toArray:jest.fn().mockResolvedValue(
       filter._id.$in.map((id:Types.ObjectId)=>rows.get(String(id))).filter(Boolean))})),
   };
   const db:any={collection:jest.fn((name:string)=>{
      if(name==='member_admin_columns')return columns;
      if(name==='member_admin_values')return values;
      if(name==='member_admin_column_settings')return prefs;
      if(name==='users')return members;
      if(name==='member_admin_column_audit')return audit;
      throw Error('Unexpected collection '+name);
   })};
   const service=new MemberAdminColumnsService(db,{
     get:jest.fn().mockResolvedValue({revision:1,sections:[],questions:[]}),
   } as any);
   expect((await service.list(memberId)).columns[0]).toEqual(HOT_COLUMN);
   expect(await service.setValue(actor,memberId,'hot-data','Hot')).toMatchObject({value:'Hot'});
   expect((await service.list(memberId)).values[memberId]['hot-data']).toBe('Hot');
   expect(members.findOne).toHaveBeenCalledWith(
     expect.objectContaining({role:'user',biodataStatus:{$ne:'deleted'}}),expect.anything());
   expect(values.updateOne).toHaveBeenCalledWith(
     expect.anything(),expect.objectContaining({$set:expect.objectContaining({'values.hot-data':'Hot'})}),
     {upsert:true});
   expect(audit.insertOne).toHaveBeenCalled();
   await expect(service.setValue(actor,memberId,'$where','Hot')).rejects.toThrow(BadRequestException);
 });
});
