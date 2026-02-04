import { Module } from '@nestjs/common';
import { WebDataService } from './web-data.service';
import { WebDataController } from './web-data.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { WebData, WebDataSchema } from './entities/web-datum.entity';

@Module({
  imports:[MongooseModule.forFeature([{ name: WebData.name, schema: WebDataSchema }])],
  controllers: [WebDataController],
  providers: [WebDataService],
})
export class WebDataModule {}
