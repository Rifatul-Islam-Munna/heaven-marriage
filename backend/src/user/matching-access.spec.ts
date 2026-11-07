import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformController } from './platform.controller';
import { RolesGuard } from '../lib/roles.guard';
import { ROLES_KEY } from '../lib/roles.decorator';
import { UserType } from './entities/user.entity';

describe('Smart matching: members only', () => {
  const controller = PlatformController;
  const handler = PlatformController.prototype.matches;
  const guard = new RolesGuard(new Reflector());

  function context(role: UserType): ExecutionContext {
    return {
      getClass: () => controller,
      getHandler: () => handler,
      switchToHttp: () => ({ getRequest: () => ({
        user: { id: 'member-1', role, dashboardPermissions: [] },
      }) }),
    } as unknown as ExecutionContext;
  }

  it('requires the user role and includes a role guard', () => {
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([UserType.USER]);
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler);
    expect(guards).toContain(RolesGuard);
  });

  it('allows a regular member to fetch only their own matches', () => {
    expect(guard.canActivate(context(UserType.USER))).toBe(true);
    const service = { matches: jest.fn().mockReturnValue({ profiles: [] }) } as any;
    const instance = new PlatformController(service, {} as any, {} as any, {} as any, {} as any);
    instance.matches({ user: { id: 'member-1' } } as any, '2', '12');
    expect(service.matches).toHaveBeenCalledWith('member-1', 2, 12);
  });

  it.each([
    UserType.ADMIN, UserType.MANAGER, UserType.SEO,
    UserType.BLOG, UserType.EDITOR,
  ])('rejects the %s staff role', (role) => {
    expect(() => guard.canActivate(context(role))).toThrow(ForbiddenException);
  });

  it('provides a separate staff-permission-protected admin match endpoint', () => {
    const handler=PlatformController.prototype.adminMatches;
    expect(handler).toBeDefined();
    const guards=Reflect.getMetadata(GUARDS_METADATA,handler);
    expect(guards).toContain(RolesGuard);
    const metadata=Reflect.getMetadata('dashboardPermission',handler);
    expect(metadata).toEqual(['users']);
    expect(() => guard.canActivate({
      getClass:()=>PlatformController,getHandler:()=>handler,
      switchToHttp:()=>({getRequest:()=>({user:{id:'member',role:UserType.USER}})}),
    } as unknown as ExecutionContext)).toThrow(ForbiddenException);
  });
});
