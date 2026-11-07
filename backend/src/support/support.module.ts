import {Module} from '@nestjs/common';
import {GeminiService} from '../user/gemini.service';
import {SupportController} from './support.controller';
import {SupportService} from './support.service';
import {SupportQuotaService} from './support-quota.service';

@Module({
 controllers:[SupportController],
 providers:[GeminiService,SupportService,SupportQuotaService],
})
export class SupportModule {}
