import {DashboardPermission} from '../staff-access/permissions';
import { Body, Controller, Delete, Get, Put, Post, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { QuestionConfigService } from './question-config.service';
import { LocationCatalogService } from './location-catalog.service';
import { AuthGuard, type ExpressRequest } from '../lib/auth.guard';
import { RolesGuard } from '../lib/roles.guard';
import { Roles } from '../lib/roles.decorator';
import { UserType } from '../user/entities/user.entity';

@Controller('profile-questions')
export class QuestionConfigController {
  constructor(private readonly service:QuestionConfigService,private readonly locations:LocationCatalogService){}
  @Get()
  get(){return this.service.get();}
  @Get('locations')
  listLocations(){return this.locations.list();}
  @Get('admin/locations')
  @UseGuards(AuthGuard,RolesGuard)
  @DashboardPermission('questions')
  listAllLocations(){return this.locations.list(true);}
  @Post('admin/locations')
  @UseGuards(AuthGuard,RolesGuard)
  @DashboardPermission('questions')
  addLocation(@Req() req:ExpressRequest,@Body() body:unknown){return this.locations.add(req.user.id,body);}
  @Patch('admin/locations/:id')
  @UseGuards(AuthGuard,RolesGuard)
  @DashboardPermission('questions')
  updateLocation(@Req() req:ExpressRequest,@Param('id') id:string,@Body() body:unknown){return this.locations.update(req.user.id,id,body);}
  @Delete('admin/locations/:id')
  @UseGuards(AuthGuard,RolesGuard)
  @DashboardPermission('questions')
  deleteLocation(@Req() req:ExpressRequest,@Param('id') id:string){return this.locations.remove(req.user.id,id);}
  @Get('admin')
  @UseGuards(AuthGuard,RolesGuard)
  @DashboardPermission('questions')
  admin(){return this.service.get();}
  @Put('admin')
  @UseGuards(AuthGuard,RolesGuard)
  @DashboardPermission('questions')
  save(@Req() req:ExpressRequest,@Body() body:unknown){return this.service.save(req.user.id,body);}
}
