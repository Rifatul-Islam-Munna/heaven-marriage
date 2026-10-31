import {ForbiddenException} from '@nestjs/common';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {createConnection,Types,type Connection} from 'mongoose';
import {UserService} from '../user/user.service';
import {User,UserSchema,UserType} from '../user/entities/user.entity';

describe('Managers with Users permission cannot manage staff accounts',()=>{
  let mongo:MongoMemoryServer,db:Connection,service:UserService;
  let adminId:string,memberId:string,managerId:string;
  beforeAll(async()=>{
    mongo=await MongoMemoryServer.create();
    db=await createConnection(mongo.getUri(),{dbName:'manager_user_guard'}).asPromise();
    const users=db.model(User.name,UserSchema);
    // Build only the dependencies exercised by the account guard and listing.
    service=Object.create(UserService.prototype) as UserService;
    (service as any).userModel=users;
    (service as any).logger={debug:()=>{}};
  },120000);
  afterAll(async()=>{await db?.close();await mongo?.stop();});
  beforeEach(async()=>{
    await db.collection('users').deleteMany({});
    adminId=new Types.ObjectId().toString();
    memberId=new Types.ObjectId().toString();
    managerId=new Types.ObjectId().toString();
    await db.collection('users').insertMany([
      {_id:new Types.ObjectId(adminId),name:'Staff administrator',role:'admin',userId:'A1'},
      {_id:new Types.ObjectId(memberId),name:'Normal member',role:'user',userId:'U1'},
      {_id:new Types.ObjectId(managerId),name:'Section manager',role:'manager',userId:'M1'},
    ]);
  });
  it('lists regular members only for managers, regardless of supplied role filter',async()=>{
    const manager:any=await service.getUserForAdmin({page:1,limit:30,role:'admin'} as any,'manager');
    expect(manager.data.map((v:any)=>v.userId)).toEqual(['U1']);
    const admin:any=await service.getUserForAdmin({page:1,limit:30} as any,'admin');
    expect(admin.data).toHaveLength(3);
  });
  it('rejects editing, viewing admin details, deleting or changing subscriptions for staff targets',async()=>{
    await expect(service.adminProfile(adminId,'manager')).rejects.toThrow(ForbiddenException);
    await expect(service.update({id:managerId} as any,managerId,'manager')).rejects.toThrow(ForbiddenException);
    await expect(service.remove({id:adminId} as any,managerId,'manager')).rejects.toThrow(ForbiddenException);
    await expect(service.toggleSubscription(adminId,managerId,'manager')).rejects.toThrow(ForbiddenException);
    await expect((service as any).assertManageableTarget(memberId,'manager')).resolves.toBeUndefined();
    await expect((service as any).assertManageableTarget(adminId,'admin')).resolves.toBeUndefined();
  });
});
