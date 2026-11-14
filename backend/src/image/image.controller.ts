import {
  BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import {ApiConsumes} from '@nestjs/swagger';
import {FileInterceptor} from '@nestjs/platform-express';
import {Throttle,ThrottlerGuard} from '@nestjs/throttler';
import {diskStorage} from 'multer';
import {randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AuthGuard,type ExpressRequest} from '../lib/auth.guard';
import {RolesGuard} from '../lib/roles.guard';
import {DashboardPermission} from '../staff-access/permissions';
import {UserType} from '../user/entities/user.entity';
import {ImageService} from './image.service';
import {getMediaFormat,MAX_MEDIA_BYTES} from './media-upload';

const uploadDirectory=join(tmpdir(),'niqaha-dashboard-media');
mkdirSync(uploadDirectory,{recursive:true});

@Controller('image')
export class ImageController {
  constructor(private readonly imageService:ImageService) {}

  @Post('upload-image')
  @UseGuards(AuthGuard,RolesGuard,ThrottlerGuard)
  @DashboardPermission('images','blog','visual-editor')
  @Throttle({default:{limit:100,ttl:3600000}})
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file',{
    storage:diskStorage({
      destination:uploadDirectory,
      filename:(_req,file,callback)=>{
        const format=getMediaFormat(file.originalname,file.mimetype);
        callback(null,randomUUID()+'.'+(format?.extension||'bin'));
      },
    }),
    limits:{fileSize:MAX_MEDIA_BYTES,files:1,fields:0},
    fileFilter:(req,file,callback)=>{
      const format=getMediaFormat(file.originalname,file.mimetype);
      if(!format)return callback(new BadRequestException(
        'Unsupported file format. Use a standard image, video, or PDF.'),false);
      const staff=(req as unknown as ExpressRequest).user;
      const extended=staff?.role===UserType.ADMIN||
        staff?.dashboardPermissions?.includes('images');
      if(!extended&&format.kind!=='image')
        return callback(new BadRequestException('This role can upload images only'),false);
      callback(null,true);
    },
  }))
  uploadImage(@UploadedFile()file:Express.Multer.File){
    return this.imageService.uploadImage(file);
  }
}
