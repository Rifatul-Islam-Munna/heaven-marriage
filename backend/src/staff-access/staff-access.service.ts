import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {InjectConnection} from '@nestjs/mongoose';
import {Connection,Types} from 'mongoose';
import {UserType} from '../user/entities/user.entity';
import {allowedDashboardSections,DASHBOARD_SECTIONS,DASHBOARD_SECTION_LABELS,validDashboardSection} from './permissions';
@Injectable()
export class StaffAccessService{
  constructor(@InjectConnection()private readonly db:Connection){}
  private get users(){return this.db.collection('users');}
  async staff(){
    const rows=await this.users.find({role:{$in:[
      UserType.ADMIN,UserType.SEO,UserType.BLOG,UserType.MANAGER,UserType.EDITOR,
    ]}},{projection:{name:1,email:1,phoneNumber:1,userId:1,role:1,dashboardPermissions:1}})
      .sort({role:1,name:1}).limit(150).toArray();
    return rows.map(u=>({
      id:String(u._id),name:u.name||'',email:u.email||'',
      phoneNumber:u.phoneNumber||'',userId:u.userId||'',
      role:u.role,permissions:allowedDashboardSections(u.role,u.dashboardPermissions),
    }));
  }
  async search(q:unknown){
    if(typeof q!=='string'||q.trim().length<2||q.length>100)
      throw new BadRequestException('Enter at least 2 characters to find an account');
    const term=q.trim().replace(/[|\\{}()[\]^$+*?.]/g,'\\$&');
    const results=await this.users.find({$or:[
      {name:{$regex:term,$options:'i'}},{email:{$regex:term,$options:'i'}},
      {phoneNumber:{$regex:term,$options:'i'}},{userId:{$regex:term,$options:'i'}},
    ]},{projection:{name:1,email:1,phoneNumber:1,userId:1,role:1,dashboardPermissions:1}})
      .limit(25).toArray();
    return results.map(u=>({
      id:String(u._id),name:u.name||'',email:u.email||'',
      phoneNumber:u.phoneNumber||'',userId:u.userId||'',
      role:u.role,permissions:allowedDashboardSections(u.role,u.dashboardPermissions),
    }));
  }
  async assign(actorId:string,id:string,input:unknown){
    if(!Types.ObjectId.isValid(id))throw new BadRequestException('Invalid user id');
    if(actorId===id)throw new ForbiddenException('Administrators cannot change their own role');
    if(!input||typeof input!=='object'||Array.isArray(input))
      throw new BadRequestException('Invalid role assignment');
    const {role,permissions}=input as Record<string,unknown>;
    if(![UserType.USER,UserType.SEO,UserType.BLOG,UserType.MANAGER].includes(role as UserType))
      throw new BadRequestException('Only user, SEO, blog or manager can be assigned');
    if(!Array.isArray(permissions)||permissions.length>DASHBOARD_SECTIONS.length||
      !permissions.every(validDashboardSection))
      throw new BadRequestException('Invalid manager page permissions');
    const chosen=role===UserType.MANAGER?[...new Set(permissions)]:[];
    const oid=new Types.ObjectId(id);
    const target=await this.users.findOne({_id:oid},{
      projection:{role:1,name:1,email:1,phoneNumber:1,userId:1,dashboardPermissions:1},
    });
    if(!target)throw new NotFoundException('Account not found');
    if(target.role===UserType.ADMIN)throw new ForbiddenException('Administrator accounts cannot be reassigned here');
    const updated=await this.users.findOneAndUpdate(
      {_id:oid,role:{$ne:UserType.ADMIN}},
      {$set:{role,dashboardPermissions:chosen,updatedAt:new Date()}},
      {returnDocument:'after',projection:{name:1,email:1,phoneNumber:1,userId:1,role:1,dashboardPermissions:1}},
    );
    if(!updated)throw new ConflictException('Account role changed while updating. Reload and retry.');
    await this.db.collection('staff_access_audit').insertOne({
      actorId,targetId:id,previousRole:target.role,newRole:role,
      previousPermissions:allowedDashboardSections(target.role,target.dashboardPermissions),
      permissions:allowedDashboardSections(updated.role,updated.dashboardPermissions),
      createdAt:new Date(),
    });
    return {id,name:updated.name||'',email:updated.email||'',phoneNumber:updated.phoneNumber||'',
      userId:updated.userId||'',role:updated.role,
      permissions:allowedDashboardSections(updated.role,updated.dashboardPermissions)};
  }
  catalog(){return DASHBOARD_SECTIONS.map(key=>({key,label:DASHBOARD_SECTION_LABELS[key]}));}
}
