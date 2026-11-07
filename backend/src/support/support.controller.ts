import {BadRequestException,Body,Controller,Delete,ForbiddenException,Get,Param,Patch,Post,Req,UseGuards} from '@nestjs/common';
import {Throttle,ThrottlerGuard} from '@nestjs/throttler';
import type {Request} from 'express';
import {AuthGuard,type ExpressRequest} from '../lib/auth.guard';
import {RolesGuard} from '../lib/roles.guard';
import {DashboardPermission} from '../staff-access/permissions';
import {SupportService} from './support.service';
import {validSupportIdentity} from './support-quota.service';

@Controller('support')
export class SupportController {
 constructor(private readonly service:SupportService){}
 private identity(req:Request){
   const visitor=String(req.headers['x-support-visitor']||'');
   const network=String(req.headers['x-support-network']||'');
   const stamp=String(req.headers['x-support-timestamp']||'');
   const signature=String(req.headers['x-support-signature']||'');
   if(!validSupportIdentity(visitor,network,stamp,signature,process.env.SUPPORT_BOT_SECRET||''))
     throw new ForbiddenException('Support session verification failed');
   return {visitor,network};
 }
 @Get('remaining')
 @UseGuards(ThrottlerGuard)
 @Throttle({default:{limit:25,ttl:60000}})
 remaining(@Req() req:Request){
   const {visitor,network}=this.identity(req);
   return this.service.remaining(visitor,network);
 }
 @Post('chat')
 @UseGuards(ThrottlerGuard)
 @Throttle({default:{limit:12,ttl:60000}})
 async chat(@Req() req:Request,@Body() payload:unknown){
   const p=payload&&typeof payload==='object'&&!Array.isArray(payload)
     ?payload as Record<string,unknown>:{};
   const {visitor,network}=this.identity(req);
   return this.service.reply(p.message,visitor,network);
 }
 @Post('admin/preview')
 @UseGuards(AuthGuard,RolesGuard,ThrottlerGuard)
 @Throttle({default:{limit:5,ttl:60000}})
 @DashboardPermission('ai-training')
 preview(@Body() payload:unknown){
   const message=payload&&typeof payload==='object'&&!Array.isArray(payload)
     ?(payload as Record<string,unknown>).message:null;
   return this.service.preview(message);
 }
 @Get('admin/articles')
 @UseGuards(AuthGuard,RolesGuard)
 @DashboardPermission('ai-training')
 list(){return this.service.articles();}
 @Post('admin/articles')
 @UseGuards(AuthGuard,RolesGuard)
 @DashboardPermission('ai-training')
 add(@Req() req:ExpressRequest,@Body() body:unknown){
   return this.service.create(req.user.id,body);
 }
 @Patch('admin/articles/:id')
 @UseGuards(AuthGuard,RolesGuard)
 @DashboardPermission('ai-training')
 update(@Req() req:ExpressRequest,@Param('id') id:string,@Body() body:unknown){
   return this.service.update(req.user.id,id,body);
 }
 @Delete('admin/articles/:id')
 @UseGuards(AuthGuard,RolesGuard)
 @DashboardPermission('ai-training')
 remove(@Req() req:ExpressRequest,@Param('id') id:string){
   return this.service.remove(req.user.id,id);
 }
}
