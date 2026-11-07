import {BadRequestException,Controller,Post,UploadedFile,UseGuards,UseInterceptors} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {diskStorage} from 'multer';
import {mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {AuthGuard} from '../lib/auth.guard';
import {Throttle,ThrottlerGuard} from '@nestjs/throttler';
import {RolesGuard} from '../lib/roles.guard';
import {DashboardPermission} from '../staff-access/permissions';
import {BlogMediaService,MAX_BLOG_VIDEO_BYTES,BLOG_VIDEO_MIMES} from './blog-media.service';

const directory=join(tmpdir(),'niqaha-blog-media');
mkdirSync(directory,{recursive:true});

@Controller('blog/admin/media')
@UseGuards(AuthGuard,RolesGuard)
@DashboardPermission('blog')
export class BlogMediaController{
 constructor(private readonly media:BlogMediaService){}
 @Post('video')
 @UseGuards(ThrottlerGuard)
 @Throttle({default:{limit:10,ttl:3600000}})
 @UseInterceptors(FileInterceptor('file',{
   storage:diskStorage({
     destination:directory,
     filename:(_req,file,callback)=>callback(null,'blog-'+randomUUID()+
       (file.mimetype==='video/webm'?'.webm':'.mp4')),
   }),
   limits:{fileSize:MAX_BLOG_VIDEO_BYTES,files:1,fields:0},
   fileFilter:(_req,file,callback)=>{
     if(!BLOG_VIDEO_MIMES.includes(file.mimetype as typeof BLOG_VIDEO_MIMES[number]))
       return callback(new BadRequestException('Use MP4 or WebM video only'),false);
     callback(null,true);
   },
 }))
 upload(@UploadedFile()file:Express.Multer.File){return this.media.uploadVideo(file);}
}
