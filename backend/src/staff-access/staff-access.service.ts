import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {InjectConnection} from '@nestjs/mongoose';
import {Connection,Model,Types} from 'mongoose';
import bcrypt from 'bcrypt';
import {User,UserSchema,UserType} from '../user/entities/user.entity';
import {normalizePhone} from '../user/messaging.service';
import {allowedDashboardSections,DASHBOARD_SECTIONS,DASHBOARD_SECTION_LABELS,validDashboardSection} from './permissions';

/** Roles an administrator may give from the access page (legacy "editor" is not offered). */
const ASSIGNABLE:string[]=[UserType.USER,UserType.SEO,UserType.BLOG,UserType.MANAGER,UserType.ADMIN];
const PROJECTION={name:1,email:1,phoneNumber:1,userId:1,role:1,dashboardPermissions:1,createdAt:1};
type Row=Record<string,any>;

function view(u:Row){
  return {
    id:String(u._id),name:u.name||'',email:u.email||'',phoneNumber:u.phoneNumber||'',userId:u.userId||'',
    role:u.role||UserType.USER,permissions:allowedDashboardSections(u.role,u.dashboardPermissions),
    createdAt:u.createdAt||null,
  };
}
function chosenPermissions(role:string,permissions:unknown){
  if(!Array.isArray(permissions)||permissions.length>DASHBOARD_SECTIONS.length||!permissions.every(validDashboardSection))
    throw new BadRequestException('Invalid manager page permissions');
  return role===UserType.MANAGER?[...new Set(permissions)]:[];
}

@Injectable()
export class StaffAccessService{
  constructor(@InjectConnection()private readonly db:Connection){}
  private get users(){return this.db.collection('users');}

  async staff(){
    const rows=await this.users.find({role:{$in:[
      UserType.ADMIN,UserType.SEO,UserType.BLOG,UserType.MANAGER,UserType.EDITOR,
    ]}},{projection:PROJECTION}).sort({role:1,name:1}).limit(300).toArray();
    return rows.map(view);
  }

  async search(q:unknown){
    if(typeof q!=='string'||q.trim().length<2||q.length>100)
      throw new BadRequestException('Enter at least 2 characters to find an account');
    const term=q.trim().replace(/[|\\{}()[\]^$+*?.]/g,'\\$&');
    const results=await this.users.find({$or:[
      {name:{$regex:term,$options:'i'}},{email:{$regex:term,$options:'i'}},
      {phoneNumber:{$regex:term,$options:'i'}},{userId:{$regex:term,$options:'i'}},
    ]},{projection:PROJECTION}).limit(25).toArray();
    return results.map(view);
  }

  /**
   * Create a ready-to-use staff (or member) account. The login contact is
   * reserved in identity_claims exactly like normal registration, and the
   * account is marked verified so the person can sign in straight away.
   */
  async create(actorId:string,input:unknown){
    if(!input||typeof input!=='object'||Array.isArray(input))throw new BadRequestException('Invalid account details');
    const p=input as Record<string,unknown>;
    const name=typeof p.name==='string'?p.name.trim():'';
    if(name.length<2||name.length>80)throw new BadRequestException('Enter a name between 2 and 80 characters');
    const gender=p.gender==='female'?'female':p.gender==='male'?'male':'';
    if(!gender)throw new BadRequestException('Choose male or female');
    const password=typeof p.password==='string'?p.password:'';
    if(password.length<8||password.length>50)throw new BadRequestException('Use a password of 8 to 50 characters');
    const role=String(p.role||'');
    if(!ASSIGNABLE.includes(role))throw new BadRequestException('Choose a valid role');
    const permissions=chosenPermissions(role,p.permissions??[]);
    const email=typeof p.email==='string'?p.email.trim().toLowerCase():'';
    const rawPhone=typeof p.phoneNumber==='string'?p.phoneNumber.trim():'';
    if(!email&&!rawPhone)throw new BadRequestException('Add an email address or a phone number for signing in');
    if(email&&(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw new BadRequestException('Enter a valid email address');
    let phone='';
    if(rawPhone){
      try{phone=String(normalizePhone(rawPhone)||'');}catch{phone='';}
      if(!phone||phone.includes('@'))throw new BadRequestException('Enter a valid phone number');
    }
    const contacts:{key:'email'|'phoneNumber';value:string}[]=[
      ...(email?[{key:'email' as const,value:email}]:[]),
      ...(phone?[{key:'phoneNumber' as const,value:phone}]:[]),
    ];
    for(const contact of contacts){
      const taken=await this.users.findOne({[contact.key]:contact.value},{projection:{_id:1}});
      if(taken)throw new ConflictException(contact.key==='email'?'This email is already used by another account':'This phone number is already used by another account');
    }
    const oid=new Types.ObjectId();
    const claims=this.db.collection('identity_claims');
    const reserved:string[]=[];
    try{
      for(const contact of contacts){
        try{
          await claims.insertOne({_id:contact.value as any,userId:oid});
          reserved.push(contact.value);
        }catch(error:any){
          if(error?.code===11000)throw new ConflictException('This email or phone number is reserved by another account');
          throw error;
        }
      }
      const counter:any=await this.db.collection('counters').findOneAndUpdate(
        {_id:'counter' as any},{$inc:{seq:1}},{upsert:true,returnDocument:'after'},
      );
      const userId=String(counter?.seq||Date.now()).padStart(6,'0');
      const UserModel=(this.db.models[User.name]||this.db.model(User.name,UserSchema)) as Model<any>;
      const created=await UserModel.create({
        _id:oid,name,gender,...(email?{email}:{}),...(phone?{phoneNumber:phone}:{}),
        password:await bcrypt.hash(password,12),role,dashboardPermissions:permissions,userId,
        isOtpVerified:true,isEmailVerified:!!email,isPhoneVerified:!!phone,
        isPublished:false,isPublishFromAdmin:false,authVersion:0,
      });
      await this.db.collection('staff_access_audit').insertOne({
        actorId,targetId:String(oid),action:'create',previousRole:null,newRole:role,
        permissions:allowedDashboardSections(role,permissions),createdAt:new Date(),
      });
      return view(created.toObject());
    }catch(error:any){
      for(const value of reserved)await claims.deleteOne({_id:value as any,userId:oid});
      if(error?.code===11000)throw new ConflictException('This email or phone number is already in use');
      throw error;
    }
  }

  async assign(actorId:string,id:string,input:unknown){
    if(!Types.ObjectId.isValid(id))throw new BadRequestException('Invalid user id');
    // Administrators can never change their own role, so the last admin can't lock everyone out.
    if(actorId===id)throw new ForbiddenException('You can\'t change your own role. Ask another administrator.');
    if(!input||typeof input!=='object'||Array.isArray(input))
      throw new BadRequestException('Invalid role assignment');
    const {role,permissions}=input as Record<string,unknown>;
    if(typeof role!=='string'||!ASSIGNABLE.includes(role))
      throw new BadRequestException('Choose member, SEO editor, blog editor, manager or administrator');
    const chosen=chosenPermissions(role,permissions);
    const oid=new Types.ObjectId(id);
    const target=await this.users.findOne({_id:oid},{projection:PROJECTION});
    if(!target)throw new NotFoundException('Account not found');
    const updated=await this.users.findOneAndUpdate(
      {_id:oid,role:target.role},
      {$set:{role,dashboardPermissions:chosen,updatedAt:new Date()}},
      {returnDocument:'after',projection:PROJECTION},
    );
    if(!updated)throw new ConflictException('This account changed while you were editing. Reload and try again.');
    await this.db.collection('staff_access_audit').insertOne({
      actorId,targetId:id,action:'assign',previousRole:target.role,newRole:role,
      previousPermissions:allowedDashboardSections(target.role,target.dashboardPermissions),
      permissions:allowedDashboardSections(updated.role,updated.dashboardPermissions),
      createdAt:new Date(),
    });
    return view(updated);
  }

  catalog(){return DASHBOARD_SECTIONS.map(key=>({key,label:DASHBOARD_SECTION_LABELS[key]}));}
}
