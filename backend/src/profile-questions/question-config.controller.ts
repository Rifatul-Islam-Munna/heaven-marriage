import {DashboardPermission} from '../staff-access/permissions';
import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { QuestionConfigService } from './question-config.service';
import { AuthGuard, type ExpressRequest } from '../lib/auth.guard';
import { RolesGuard } from '../lib/roles.guard';
import { Roles } from '../lib/roles.decorator';
import { UserType } from '../user/entities/user.entity';

@Controller('profile-questions')
export class QuestionConfigController {
  constructor(private readonly service:QuestionConfigService){}
  @Get()
  get(){return this.service.get();}
  @Get('admin')
  @UseGuards(AuthGuard,RolesGuard)
  @DashboardPermission('questions')
  admin(){return this.service.get();}
  @Put('admin')
  @UseGuards(AuthGuard,RolesGuard)
  @DashboardPermission('questions')
  save(@Req() req:ExpressRequest,@Body() body:unknown){return this.service.save(req.user.id,body);}
}
