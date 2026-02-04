import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { unlink } from 'fs/promises';
import { MinioService } from 'src/lib/minio.service';

@Injectable()
export class ImageService {
  constructor(private readonly minioService: MinioService) {}
 async uploadImage(file: Express.Multer.File) {
  if(!file)  {
    throw new HttpException('File is required',HttpStatus.BAD_REQUEST)
  };
    const fileUrl = await this.minioService.uploadFile(file);
    await unlink(file?.path);
    
    
    return fileUrl
  }
}
