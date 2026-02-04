import { Module } from '@nestjs/common';
import { ImageService } from './image.service';
import { ImageController } from './image.controller';
import { MinioService } from 'src/lib/minio.service';

@Module({
  controllers: [ImageController],
  providers: [ImageService,MinioService],
})
export class ImageModule {}
