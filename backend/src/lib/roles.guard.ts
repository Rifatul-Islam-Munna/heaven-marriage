
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ExpressRequest } from './auth.guard';
import { ROLES_KEY } from './roles.decorator';

import { Reflector } from '@nestjs/core';
import { UserType } from 'src/user/entities/user.entity';
import {DASHBOARD_PERMISSION_KEY,type DashboardSection} from '../staff-access/permissions';


@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        
        private readonly reflector: Reflector, 
      ) {}

      canActivate(context: ExecutionContext): boolean {
        const request:ExpressRequest = context.switchToHttp().getRequest();
      
        const user = request.user;
        if (!user) {
            throw new UnauthorizedException('You need to be authenticated to access this resource.');
          }
          // Respect both method-level and controller-level @Roles decorators.
          // Controller-level admin restrictions must never be silently ignored.
          const requiredRoles:UserType[] | undefined = this.reflector.getAllAndOverride<UserType[]>(ROLES_KEY,
            [context.getHandler(), context.getClass()]);
          const requiredSections=this.reflector.getAllAndOverride<DashboardSection[]>(
            DASHBOARD_PERMISSION_KEY,[context.getHandler(),context.getClass()]);
          if(requiredSections?.length){
            if(user.role===UserType.ADMIN)return true;
            if(requiredSections.some(section=>user.dashboardPermissions?.includes(section)))return true;
            throw new ForbiddenException('You cannot access this dashboard section.');
          }
          if (!requiredRoles) {
            return true;
          }
          const hasRole = requiredRoles.some((role) => user.role === role);
          if (!hasRole) {
            throw new ForbiddenException('You do not have the necessary permissions.');
          }
        return true;
      }

}