import {Body,Controller,Get,Param,Patch,Query,Req,UseGuards} from '@nestjs/common';
import {AuthGuard,type ExpressRequest} from '../lib/auth.guard';
import {RolesGuard} from '../lib/roles.guard';
import {DashboardPermission} from '../staff-access/permissions';
import {PremiumAdminService} from './premium-admin.service';

@Controller('platform/admin/premium-members')
@UseGuards(AuthGuard,RolesGuard)
@DashboardPermission('upgrades')
export class PremiumAdminController {
  constructor(private readonly service:PremiumAdminService){}
  @Get()
  list(@Query('q') q?:string,@Query('page') page?:string){
    return this.service.list(q||'',Number(page||1));
  }
  @Patch(':id')
  update(@Req() request:ExpressRequest,@Param('id') id:string,@Body() body:unknown){
    return this.service.update(request.user.id,id,body);
  }
}
