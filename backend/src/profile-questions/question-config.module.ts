import { Module } from '@nestjs/common';
import { QuestionConfigController } from './question-config.controller';
import { QuestionConfigService } from './question-config.service';

@Module({
 controllers:[QuestionConfigController],
 providers:[QuestionConfigService],
 exports:[QuestionConfigService],
})
export class QuestionConfigModule {}
