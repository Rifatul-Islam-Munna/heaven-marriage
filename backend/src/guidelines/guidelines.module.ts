import { Module } from '@nestjs/common';
import { GuidelinesService } from './guidelines.service';
import { GuidelinesController } from './guidelines.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Guideline, GuidelineSchema } from './entities/guideline.entity';

@Module({
  imports: [MongooseModule.forFeature([{ name: Guideline.name, schema: GuidelineSchema }])],
  controllers: [GuidelinesController],
  providers: [GuidelinesService],
})
export class GuidelinesModule {}
