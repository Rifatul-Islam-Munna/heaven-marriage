import {BadRequestException,ConflictException,ForbiddenException} from '@nestjs/common';
import type {ExecutionContext} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {createConnection,Types,type Connection} from 'mongoose';
import {UserType} from '../user/entities/user.entity';
import {AuthGuard} from '../lib/auth.guard';
import {RolesGuard} from '../lib/roles.guard';
import {Roles} from '../lib/roles.decorator';
import {
  allowedDashboardSections,DashboardPermission,DASHBOARD_SECTIONS,
} from './permissions';
import {StaffAccessService} from './staff-access.service';

@DashboardPermission('seo')
class SeoAdminController{read(){}}
@DashboardPermission('images','blog','visual-editor')
class ImageUploadController{upload(){}}
@Roles(UserType.ADMIN)
class RoleAssignmentController{assign(){}}
const requestContext=(cls:any,fn:any,user:any)=>({
  getClass:()=>cls,getHandler:()=>fn,
  switchToHttp:()=>({getRequest:()=>({user})}),
} as unknown as ExecutionContext);

describe('Staff permissions',()=>{
  it('enforces immutable single-section roles even if the database has unexpected privileges',()=>{
    expect(allowedDashboardSections('seo',['users','blog'])).toEqual(['seo']);
    expect(allowedDashboardSections('blog',['seo'])).toEqual(['blog']);
    expect(allowedDashboardSections('user',['seo'])).toEqual([]);
    expect(allowedDashboardSections('editor',['users'])).toEqual([]);
    expect(allowedDashboardSections('manager',['seo','blog','unknown','blog'])).toEqual(['seo','blog']);
    expect(allowedDashboardSections('admin',[])).toEqual(DASHBOARD_SECTIONS);
  });
  it('blocks other pages and allows shared image upload only for permitted staff',()=>{
    const guard=new RolesGuard(new Reflector());
    const seo={role:'seo',dashboardPermissions:['seo']};
    const blog={role:'blog',dashboardPermissions:['blog']};
    const manager={role:'manager',dashboardPermissions:['faq']};
    const target=(c:any,method:string,user:any)=>
      guard.canActivate(requestContext(c,c.prototype[method],user));
    expect(target(SeoAdminController,'read',seo)).toBe(true);
    expect(()=>target(SeoAdminController,'read',blog)).toThrow(ForbiddenException);
    expect(()=>target(SeoAdminController,'read',manager)).toThrow(ForbiddenException);
    expect(target(ImageUploadController,'upload',blog)).toBe(true);
    expect(()=>target(ImageUploadController,'upload',seo)).toThrow(ForbiddenException);
    expect(()=>target(RoleAssignmentController,'assign',manager)).toThrow(ForbiddenException);
    expect(()=>target(RoleAssignmentController,'assign',blog)).toThrow(ForbiddenException);
    expect(target(RoleAssignmentController,'assign',{role:'admin',dashboardPermissions:[]})).toBe(true);
  });
});

describe('MongoDB staff role assignments',()=>{
  let mongo:MongoMemoryServer,db:Connection,staff:StaffAccessService;
  let memberId:string,adminId:string;
  beforeAll(async()=>{
    mongo=await MongoMemoryServer.create();
    db=await createConnection(mongo.getUri(),{dbName:'staff_permissions_test'}).asPromise();
    staff=new StaffAccessService(db);
  },120000);
  afterAll(async()=>{await db?.close();await mongo?.stop();});
  beforeEach(async()=>{
    await db.collection('users').deleteMany({});
    await db.collection('staff_access_audit').deleteMany({});
    adminId=new Types.ObjectId().toString();
    memberId=new Types.ObjectId().toString();
    await db.collection('users').insertMany([
      {_id:new Types.ObjectId(adminId),role:'admin',name:'Owner',phoneNumber:'01711111111'},
      {_id:new Types.ObjectId(memberId),role:'user',name:'Editor account',
        email:'editor@example.test',phoneNumber:'01722222222'},
    ]);
  });
  it('assigns SEO, blog, and custom manager, persists/changes permissions',async()=>{
    let member=await staff.assign(adminId,memberId,{role:'seo',permissions:[]});
    expect(member.permissions).toEqual(['seo']);
    member=await staff.assign(adminId,memberId,{role:'blog',permissions:['seo']});
    expect(member.permissions).toEqual(['blog']);
    member=await staff.assign(adminId,memberId,{role:'manager',permissions:['faq','pricing']});
    expect(member.permissions).toEqual(['faq','pricing']);
    expect((await db.collection('users').findOne({_id:new Types.ObjectId(memberId)}))?.dashboardPermissions)
      .toEqual(['faq','pricing']);
    expect((await staff.staff()).some(user=>user.id===memberId)).toBe(true);
    expect((await staff.search('editor@example.test')).map(user=>user.id)).toContain(memberId);
    member=await staff.assign(adminId,memberId,{role:'manager',permissions:['blog']});
    expect(member.permissions).toEqual(['blog']);
    member=await staff.assign(adminId,memberId,{role:'user',permissions:[]});
    expect(member.permissions).toEqual([]);
    expect(await db.collection('staff_access_audit').countDocuments()).toBe(5);
  });
  it('prevents changing admins, changing self or assigning admin role',async()=>{
    await expect(staff.assign(adminId,adminId,{role:'manager',permissions:[]}))
      .rejects.toThrow(ForbiddenException);
    await expect(staff.assign('different-admin',adminId,{role:'seo',permissions:[]}))
      .rejects.toThrow(ForbiddenException);
    await expect(staff.assign(adminId,memberId,{role:'admin',permissions:[]}))
      .rejects.toThrow(BadRequestException);
    await expect(staff.assign(adminId,memberId,{role:'manager',permissions:['admin']}))
      .rejects.toThrow(BadRequestException);
    expect((await db.collection('users').findOne({_id:new Types.ObjectId(adminId)}))?.role).toBe('admin');
  });
  it('re-evaluates effective permissions against current MongoDB role after every change',async()=>{
    const tokenState={role:'manager',permissions:['seo']};
    await staff.assign(adminId,memberId,{role:'manager',permissions:['blog']});
    const stored=await db.collection('users').findOne({_id:new Types.ObjectId(memberId)});
    expect(allowedDashboardSections(stored?.role,stored?.dashboardPermissions)).toEqual(['blog']);
    expect(tokenState.permissions).toEqual(['seo']); // stale JWT must NOT be trusted.
    await staff.assign(adminId,memberId,{role:'seo',permissions:[]});
    const updated=await db.collection('users').findOne({_id:new Types.ObjectId(memberId)});
    expect(allowedDashboardSections(updated?.role,updated?.dashboardPermissions)).toEqual(['seo']);
  });
});
