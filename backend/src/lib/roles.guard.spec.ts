import {ForbiddenException} from '@nestjs/common';
import type {ExecutionContext} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {RolesGuard} from './roles.guard';
import {Roles} from './roles.decorator';
import {UserType} from '../user/entities/user.entity';

@Roles(UserType.ADMIN)
class AdminOnlyBlogController{list(){}}
class MixedController{
  @Roles(UserType.ADMIN)
  update(){}
}

describe('Role guard protects controller-level and method-level admin routes',()=>{
  const guard=new RolesGuard(new Reflector());
  const make=(controller:any,handler:()=>void,role:string)=>({
    getHandler:()=>handler,getClass:()=>controller,
    switchToHttp:()=>({getRequest:()=>({user:{role}})}),
  } as unknown as ExecutionContext);
  it('rejects regular users from a class-level admin blog controller',()=>{
    expect(()=>guard.canActivate(make(AdminOnlyBlogController,
      AdminOnlyBlogController.prototype.list,UserType.USER))).toThrow(ForbiddenException);
  });
  it('allows admins through class-level admin routes',()=>{
    expect(guard.canActivate(make(AdminOnlyBlogController,
      AdminOnlyBlogController.prototype.list,UserType.ADMIN))).toBe(true);
  });
  it('still enforces method-level roles',()=>{
    expect(()=>guard.canActivate(make(MixedController,
      MixedController.prototype.update,UserType.USER))).toThrow(ForbiddenException);
  });
});
