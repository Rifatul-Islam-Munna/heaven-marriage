import {Body,Controller,Get,Param,Patch,Query,Req,UseGuards} from '@nestjs/common';
import {AuthGuard,type ExpressRequest} from '../lib/auth.guard';
import {RolesGuard} from '../lib/roles.guard';
import {Roles} from '../lib/roles.decorator';
import {UserType} from '../user/entities/user.entity';
import {StaffAccessService} from './staff-access.service';
@Controller('staff-access')
export class StaffAccessController{
  constructor(private readonly staff:StaffAccessService){}
  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req()req:ExpressRequest){
    return {role:req.user.role,permissions:req.user.dashboardPermissions||[],
      isAdmin:req.user.role===UserType.ADMIN};
  }
  @Get('admin/catalog')
  @UseGuards(AuthGuard,RolesGuard)
  @Roles(UserType.ADMIN)
  catalog(){return this.staff.catalog();}
  @Get('admin/staff')
  @UseGuards(AuthGuard,RolesGuard)
  @Roles(UserType.ADMIN)
  staffList(){return this.staff.staff();}
  @Get('admin/search')
  @UseGuards(AuthGuard,RolesGuard)
  @Roles(UserType.ADMIN)
  search(@Query('q')query:string){return this.staff.search(query);}
  @Patch('admin/:id')
  @UseGuards(AuthGuard,RolesGuard)
  @Roles(UserType.ADMIN)
  assign(@Req()req:ExpressRequest,@Param('id')id:string,@Body()payload:unknown){
    return this.staff.assign(req.user.id,id,payload);
  }
}
