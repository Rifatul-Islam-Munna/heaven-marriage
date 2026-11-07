import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {InjectConnection} from '@nestjs/mongoose';
import {Connection,Types} from 'mongoose';
import {randomUUID} from 'node:crypto';
import {QuestionConfigService,answerForQuestion,usesSeparateAnswerStorage,type ProfileQuestion} from '../profile-questions/question-config.service';

export type MemberColumnType='text'|'choice'|'flag';
export type MemberColumn={
 id:string;label:string;type:MemberColumnType;options:string[];
 enabled:boolean;builtIn:boolean;
};
export const HOT_COLUMN:MemberColumn={
 id:'hot-data',label:'Hot Data',type:'choice',
 options:['Hot','Follow-up','Normal'],enabled:true,builtIn:true,
};
export const MAX_MEMBER_COLUMNS=12;
export const MAX_PROFILE_LAYOUT_COLUMNS=12;
export const MAX_PROFILE_COLUMN_FIELDS=6;
const MAX_PROFILE_FIELDS=8;
export type ProfileTableColumn={id:string;label:string;questionIds:string[]};
export function parseProfileTableLayout(input:unknown,allowedIds:Set<string>):ProfileTableColumn[]{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new BadRequestException('Invalid column layout');
 const columns=(input as Record<string,unknown>).columns;
 if(!Array.isArray(columns)||columns.length>MAX_PROFILE_LAYOUT_COLUMNS)
   throw new BadRequestException('Choose up to 12 columns');
 const used=new Set<string>();
 return columns.map((raw:unknown)=>{
   if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new BadRequestException('Invalid column');
   const col=raw as Record<string,unknown>;
   const id=col.id;
   const label=typeof col.label==='string'?col.label.trim():'';
   const selected=col.questionIds;
   if(typeof id!=='string'||!/^(profile-[a-f0-9]{32}|q_[a-f0-9]{32}|builtin_[a-f0-9]+|old_[a-f0-9]{24})$/.test(id)||
      used.has(id))throw new BadRequestException('Invalid or repeated column ID');
   used.add(id);
   if(label.length<2||label.length>55||/[<>\u0000-\u001f]/u.test(label))
     throw new BadRequestException('Column heading must be 2–55 characters');
   if(!Array.isArray(selected)||!selected.length||selected.length>MAX_PROFILE_COLUMN_FIELDS||
      selected.some(v=>typeof v!=='string'||!allowedIds.has(v))||
      new Set(selected).size!==selected.length)
     throw new BadRequestException('Each column needs 1–6 valid biodata fields');
   return {id,label,questionIds:selected as string[]};
 });
}

const EXCLUDED_AUTH_PATHS=new Set(['password','email','phoneNumber','authVersion','otp']);
export type MemberProfileField={id:string;label:string;section:string;type:string};
export function formatMemberBiodataValue(value:unknown,question:ProfileQuestion):string {
 if(value===null||value===undefined||value==='')return '';
 if(typeof value==='boolean')return value?'হ্যাঁ':'না';
 if(Array.isArray(value))return value.map(item=>formatMemberBiodataValue(item,{...question,type:'text'})).join(', ').slice(0,220);
 if(typeof value!=='string'&&typeof value!=='number')return '';
 const text=String(value);
 const option=question.options.find(o=>o.value===text);
 return (option?.label||text).slice(0,220);
}

export function parseColumn(input:unknown){
 if(!input||typeof input!=='object'||Array.isArray(input))
   throw new BadRequestException('Invalid column');
 const obj=input as Record<string,unknown>;
 const label=typeof obj.label==='string'?obj.label.trim():'';
 const type=obj.type as MemberColumnType;
 if(label.length<2||label.length>40||/[<>\u0000-\u001f]/u.test(label))
   throw new BadRequestException('Column name must be 2–40 characters');
 if(!['text','choice','flag'].includes(type))
   throw new BadRequestException('Choose Text, Dropdown or Yes/No');
 if(typeof obj.enabled!=='undefined' && typeof obj.enabled!=='boolean')
   throw new BadRequestException('Enabled must be true or false');
 const options=type==='choice'
   ?(Array.isArray(obj.options)?obj.options:typeof obj.options==='string'?
       obj.options.split(','):[])
   :[];
 if(type==='choice'&&(!Array.isArray(options)||options.length<2||options.length>12))
   throw new BadRequestException('Dropdown needs 2–12 options');
 const cleanOptions=options.map((v:unknown)=>typeof v==='string'?v.trim():'');
 if(cleanOptions.some((v:string)=>v.length<1||v.length>40||/[<>\u0000-\u001f]/u.test(v))||
     new Set(cleanOptions.map((v:string)=>v.toLowerCase())).size!==cleanOptions.length)
   throw new BadRequestException('Options must be unique text values under 40 characters');
 return {label,type,options:cleanOptions,enabled:obj.enabled!==false};
}
export function validMemberCell(column:MemberColumn,raw:unknown):string|boolean|null{
 if(raw===null||raw===undefined||raw==='')return null;
 if(column.type==='flag'){
   if(typeof raw!=='boolean')throw new BadRequestException('Yes/No value must be boolean');
   return raw;
 }
 if(typeof raw!=='string')throw new BadRequestException('Value must be text');
 const value=raw.trim();
 if(value.length>250||/[\u0000-\u001f]/u.test(value))
   throw new BadRequestException('Value must not exceed 250 characters');
 if(column.type==='choice'&&!column.options.includes(value))
   throw new BadRequestException('Select a configured dropdown option');
 return value||null;
}
@Injectable()
export class MemberAdminColumnsService {
 constructor(@InjectConnection()private readonly db:Connection,
   private readonly questions:QuestionConfigService){}
 private columns(){return this.db.collection('member_admin_columns');}
 private entries(){return this.db.collection('member_admin_values');}
 private settings(){return this.db.collection('member_admin_column_settings');}
 private async selectableProfileQuestions(){
   const schema=await this.questions.get();
   const questions=schema.questions.filter(q=>q.enabled&&
     !EXCLUDED_AUTH_PATHS.has(q.path||'') &&
     (q.path||q.id.startsWith('q_')||q.id.startsWith('old_')));
   const availableFields:MemberProfileField[]=questions.map(q=>({
     id:q.id,label:q.publicLabel||q.question,
     section:schema.sections.find(s=>s.id===q.section)?.title||'Biodata',
     type:q.type,
   }));
   return {schema,questions,availableFields};
 }
 async saveProfileLayout(actor:string,input:unknown){
   const {questions}=await this.selectableProfileQuestions();
   const layout=parseProfileTableLayout(input,new Set(questions.map(q=>q.id)));
   await this.settings().updateOne({_id:'profile' as any},{$set:{
     layout,updatedAt:new Date(),updatedBy:actor,
   }},{upsert:true});
   await this.log(actor,'profile-layout.update','profile');
   return {message:'Profile table layout saved',profileColumns:layout};
 }
 async saveProfileFields(actor:string,input:unknown){
   if(!input||typeof input!=='object'||Array.isArray(input))
     throw new BadRequestException('Select biodata fields to display');
   const selected=(input as Record<string,unknown>).questionIds;
   if(!Array.isArray(selected)||selected.length>MAX_PROFILE_FIELDS||
      selected.some(id=>typeof id!=='string')||new Set(selected).size!==selected.length)
     throw new BadRequestException('Choose at most eight unique biodata fields');
   const {questions}=await this.selectableProfileQuestions();
   const ids=new Set(questions.map(q=>q.id));
   if(selected.some(id=>!ids.has(id as string)))
     throw new BadRequestException('Unknown, unavailable or protected profile field');
   await this.settings().updateOne({_id:'profile' as any},{$set:{
     questionIds:selected,updatedAt:new Date(),updatedBy:actor,
   }},{upsert:true});
   await this.log(actor,'profile-columns.update','profile');
   return {message:'Visible biodata columns updated',questionIds:selected};
 }
 private async getColumns():Promise<MemberColumn[]>{
   const saved=await this.columns().find({}).sort({createdAt:1}).limit(MAX_MEMBER_COLUMNS).toArray();
   return [HOT_COLUMN,...saved.map(x=>({
     id:String(x._id),label:String(x.label),type:x.type as MemberColumnType,
     options:Array.isArray(x.options)?x.options:[],
     enabled:x.enabled!==false,builtIn:false,
   }))];
 }
 async list(memberIds?:string){
   const [columns,fields,preferences]=await Promise.all([
     this.getColumns(),this.selectableProfileQuestions(),
     this.settings().findOne({_id:'profile' as any}),
   ]);
   // Existing single-field layout remains readable until the admin saves a new grouped layout.
   const legacy=Array.isArray(preferences?.questionIds)
     ?preferences.questionIds.filter((id:unknown):id is string=>typeof id==='string').slice(0,MAX_PROFILE_FIELDS):[];
   const storedLayout=Array.isArray(preferences?.layout)?preferences.layout as ProfileTableColumn[]:
     legacy.map(id=>({id,label:fields.availableFields.find(field=>field.id===id)?.label||id,questionIds:[id]}));
   const allowedIds=new Set(fields.questions.map(q=>q.id));
   const profileColumns:ProfileTableColumn[]=storedLayout.filter(column=>
      column&&typeof column.id==='string'&&typeof column.label==='string'&&
      Array.isArray(column.questionIds)&&column.questionIds.some(id=>allowedIds.has(id)))
     .map(column=>({...column,questionIds:column.questionIds.filter(id=>allowedIds.has(id))}));
   const chosen=[...new Set(profileColumns.flatMap(column=>column.questionIds))];
   const selected=chosen.map(id=>fields.questions.find(q=>q.id===id)).filter((q):q is ProfileQuestion=>!!q);
   const empty={columns,values:{},profileColumns,profileValues:{},availableFields:fields.availableFields};
   if(!memberIds)return empty;
   const ids=[...new Set(memberIds.split(',').map(id=>id.trim()).filter(Boolean))];
   if(ids.length>100||ids.some(id=>!Types.ObjectId.isValid(id)))
     throw new BadRequestException('Supply at most 100 valid member IDs');
   const objectIds=ids.map(id=>new Types.ObjectId(id));
   const records=await this.entries().find({_id:{$in:objectIds}}).toArray();
   const values=Object.fromEntries(records.map(entry=>[String(entry._id),entry.values||{}]));
   let profileValues:Record<string,Record<string,string>>={};
   if(selected.length){
     const projection:Record<string,number>={_id:1,gender:1};
     for(const q of selected){
       if(q.path)projection[q.path]=1;
       if(usesSeparateAnswerStorage(q))projection.dynamicAnswers=1;
       if(q.legacyKey)projection.customFields=1;
     }
     const members=await this.db.collection('users').find(
       {_id:{$in:objectIds},role:'user',biodataStatus:{$ne:'deleted'}},
       {projection},
     ).toArray();
     profileValues=Object.fromEntries(members.map(member=>[
       String(member._id),
       Object.fromEntries(selected.map(q=>[
         q.id,
         q.gender==='both'||q.gender===member.gender
          ?formatMemberBiodataValue(answerForQuestion(member,q),q):'',
       ])),
     ]));
   }
   return {columns,values,profileColumns,profileValues,availableFields:fields.availableFields};
 }
 async add(actor:string,input:unknown){
   const data=parseColumn(input),existing=await this.columns().countDocuments({});
   if(existing>=MAX_MEMBER_COLUMNS)
     throw new BadRequestException('The maximum is 12 additional columns');
   const duplicate=await this.columns().findOne({label:{$regex:'^'+data.label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$',$options:'i'}});
   if(duplicate||data.label.toLowerCase()===HOT_COLUMN.label.toLowerCase())
     throw new ConflictException('A column with this name already exists');
   const row={_id:('custom-'+randomUUID().replace(/-/g,'')) as any,
     ...data,createdBy:actor,createdAt:new Date(),updatedAt:new Date()};
   await this.columns().insertOne(row);
   await this.log(actor,'column.create',String(row._id));
   return {message:'Column created',id:row._id};
 }
 async edit(actor:string,id:string,input:unknown){
   if(!/^custom-[a-f0-9]{32}$/.test(id))
     throw new BadRequestException('Only custom columns may be edited');
   const data=parseColumn(input);
   const previous=await this.columns().findOne({_id:id as any});
   if(!previous)throw new NotFoundException('Column not found');
   if(data.type!==previous.type)
     throw new BadRequestException('Change the label or choices; changing type may corrupt saved values');
   const result=await this.columns().updateOne({_id:id as any},{
      $set:{label:data.label,options:data.options,enabled:data.enabled,updatedAt:new Date()},
   });
   if(!result.matchedCount)throw new NotFoundException('Column unavailable');
   await this.log(actor,'column.edit',id);
   return {message:'Column updated'};
 }
 async setValue(actor:string,memberId:string,columnId:string,raw:unknown){
   if(!Types.ObjectId.isValid(memberId)||!/^((hot-data)|(custom-[a-f0-9]{32}))$/.test(columnId))
      throw new BadRequestException('Invalid member or column');
   const column=(await this.getColumns()).find(x=>x.id===columnId && x.enabled);
   if(!column)throw new BadRequestException('Column is unavailable or hidden');
   const value=validMemberCell(column,raw);
   const member=await this.db.collection('users').findOne({_id:new Types.ObjectId(memberId),
      role:'user',biodataStatus:{$ne:'deleted'}},{projection:{_id:1}});
   if(!member)throw new NotFoundException('Member unavailable');
   const $set:Record<string,unknown>={[ 'values.'+columnId ]:value,updatedAt:new Date()};
   await this.entries().updateOne({_id:new Types.ObjectId(memberId)},
     {$set,$setOnInsert:{createdAt:new Date()}},{upsert:true});
   await this.log(actor,'member.column.value',memberId,columnId);
   return {message:'Member column saved',memberId,columnId,value};
 }
 private async log(actor:string,action:string,target:string,columnId?:string){
   await this.db.collection('member_admin_column_audit').insertOne({
      actor,action,target,columnId,at:new Date(),
   });
 }
}
