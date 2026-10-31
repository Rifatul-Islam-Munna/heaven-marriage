import {DashboardPermission} from '../staff-access/permissions';
import { Body, Controller, Get, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type ExpressRequest } from '../lib/auth.guard';
import { RolesGuard } from '../lib/roles.guard';
import { Roles } from '../lib/roles.decorator';
import { UserType } from '../user/entities/user.entity';
import { SeoSettingsService } from './seo-settings.service';

@Controller('seo-settings')
export class SeoPublicController {
  constructor(private readonly seo:SeoSettingsService){}
  @Get()
  page(@Query('path')path:string,@Query('template')template?:string){
    return this.seo.publicPage(path,template);
  }
  @Get('sitemap')
  sitemap(){return this.seo.publicSitemap();}
}
@Controller('seo-settings/admin')
@UseGuards(AuthGuard,RolesGuard)
@DashboardPermission('seo')
export class SeoAdminController {
  constructor(private readonly seo:SeoSettingsService){}
  @Get()
  page(@Query('path')path:string){return this.seo.adminPage(path);}
  @Get('list')
  list(){return this.seo.list();}
  @Put()
  save(@Req()req:ExpressRequest,@Body()body:unknown){return this.seo.save(req.user.id,body);}
  @Post('publish')
  publish(@Req()req:ExpressRequest,@Body()body:unknown){
    return this.seo.publish(req.user.id,body);
  }
}
