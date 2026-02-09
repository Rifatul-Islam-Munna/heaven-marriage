import { Module } from '@nestjs/common';
import { CustomQuestionService } from './custom-question.service';
import { CustomQuestionController } from './custom-question.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomQuestion, CustomQuestionSchema } from './entities/custom-question.entity';

@Module({
  imports: [MongooseModule.forFeature([{ name: CustomQuestion.name, schema: CustomQuestionSchema }])],
  controllers: [CustomQuestionController],
  providers: [CustomQuestionService],
})
export class CustomQuestionModule {}
