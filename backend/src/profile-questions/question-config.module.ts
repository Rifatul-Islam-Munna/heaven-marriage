import { Module } from '@nestjs/common';
import { QuestionConfigController } from './question-config.controller';
import { QuestionConfigService } from './question-config.service';
import { LocationCatalogService } from './location-catalog.service';

@Module({
 controllers:[QuestionConfigController],
 providers:[QuestionConfigService,LocationCatalogService],
 exports:[QuestionConfigService],
})
export class QuestionConfigModule {}
