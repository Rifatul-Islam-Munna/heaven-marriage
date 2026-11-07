import {Body,Controller,Get,Param,Patch,Post,Query,Req,UseGuards} from '@nestjs/common';
import {AuthGuard,type ExpressRequest} from '../lib/auth.guard';
import {RolesGuard} from '../lib/roles.guard';
import {Roles} from '../lib/roles.decorator';
import {UserType} from '../user/entities/user.entity';
import {MemberAdminColumnsService} from './member-admin-columns.service';

@Controller('admin/member-columns')
@UseGuards(AuthGuard,RolesGuard)
@Roles(UserType.ADMIN)
export class MemberAdminColumnsController {
 constructor(private readonly service:MemberAdminColumnsService){}
 @Get()
 list(@Query('memberIds') memberIds?:string){return this.service.list(memberIds);}
 @Patch('profile-layout')
 updateProfileLayout(@Req() req:ExpressRequest,@Body() body:unknown){return this.service.saveProfileLayout(req.user.id,body);}
 @Patch('profile-fields')
 updateProfileFields(@Req() req:ExpressRequest,@Body() body:unknown){return this.service.saveProfileFields(req.user.id,body);}
 @Post()
 add(@Req() req:ExpressRequest,@Body() data:unknown){
   return this.service.add(req.user.id,data);
 }
 @Patch(':id')
 edit(@Req() req:ExpressRequest,@Param('id') id:string,@Body() data:unknown){
   return this.service.edit(req.user.id,id,data);
 }
 @Patch('member/:memberId/:columnId')
 changeValue(@Req() req:ExpressRequest,@Param('memberId') memberId:string,
  @Param('columnId') columnId:string,@Body() data:unknown){
   const value=data&&typeof data==='object'&&!Array.isArray(data)?
     (data as Record<string,unknown>).value:undefined;
   return this.service.setValue(req.user.id,memberId,columnId,value);
 }
}
