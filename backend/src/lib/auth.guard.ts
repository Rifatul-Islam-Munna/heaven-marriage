import { Injectable,CanActivate,ExecutionContext,UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection,Types } from 'mongoose';
import { Request } from 'express';
import {allowedDashboardSections, type DashboardSection} from '../staff-access/permissions';
export type jwts={email?:string,id:string,role:string,mobileNumber?:string,authVersion?:number,dashboardPermissions?:DashboardSection[]};
export interface ExpressRequest extends Request {user:jwts;}
@Injectable()
export class AuthGuard implements CanActivate {
 constructor(private jwt:JwtService,private config:ConfigService,@InjectConnection()private connection:Connection){}
 async canActivate(context:ExecutionContext){
  const request=context.switchToHttp().getRequest<ExpressRequest>();
  const token=request.headers['access_token'];
  if(!token||typeof token!=='string')throw new UnauthorizedException('Please log in');
  try{
   const decoded=await this.jwt.verifyAsync<jwts>(token,{secret:this.config.get<string>('ACCESS_TOKEN')});
   if(!Types.ObjectId.isValid(decoded.id))throw new Error();
   const u=await this.connection.collection('users').findOne({_id:new Types.ObjectId(decoded.id)},{projection:{role:1,dashboardPermissions:1,authVersion:1,verificationStatus:1}});
   if(!u||(decoded.authVersion||0)!==(u.authVersion||0))throw new Error();
   const selfRoutes=['/user/get-my-profile','/platform/summary','/platform/connections','/platform/requests','/platform/matches','/platform/admirers','/platform/request/support','/user/update-user-password'];
   if(u.verificationStatus==='suspended'&&!selfRoutes.includes(request.path))throw new UnauthorizedException('Account suspended. Please contact support.');
   request.user={...decoded,role:u.role,dashboardPermissions:allowedDashboardSections(u.role,u.dashboardPermissions)};return true;
  }catch{throw new UnauthorizedException('Invalid, expired or restricted session');}
 }
}
@Injectable()
export class OptionalAuthGuard extends AuthGuard{
 async canActivate(context:ExecutionContext){
  const request=context.switchToHttp().getRequest<ExpressRequest>();
  if(!request.headers['access_token'])return true;
  return super.canActivate(context);
 }
}
