import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, BadRequestException, UploadedFile } from '@nestjs/common';
import { ImageService } from './image.service';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { AuthGuard } from 'src/lib/auth.guard';
import { ApiConsumes } from '@nestjs/swagger';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { cwd } from 'process';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from 'src/lib/roles.guard';
import { Roles } from 'src/lib/roles.decorator';
import { UserType } from 'src/user/entities/user.entity';
@Controller('image')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}
  @Post("upload-image")
    @UseGuards(AuthGuard,RolesGuard)
    @Roles(UserType.ADMIN)
  
     @ApiConsumes('multipart/form-data')
   @UseInterceptors(FileInterceptor("file",{
    storage:diskStorage({
      destination:  (existsSync( join(cwd() , '/uploads') ) ?? mkdirSync(join(cwd() , '/uploads'), { recursive: true }), join(cwd() , '/uploads')), 
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
      
    }),
   limits: { fileSize: 1024 * 1024 * 20 },

    fileFilter: (req, file, callback) => {
      const allowedMimeTypes = [ 'image/jpeg', 'image/png', 'image/webp', "image/avif",'image/jpg','application/pdf','video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',     // .mov
  'video/x-matroska'];
    
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return callback(new BadRequestException('Only PDF and image files are allowed'), false);
      }
    
      callback(null, true);
    }
   }))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.imageService.uploadImage(file);
  }
}


