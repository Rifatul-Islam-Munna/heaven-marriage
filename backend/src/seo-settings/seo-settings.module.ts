import { Module } from '@nestjs/common';
import { SeoPublicController,SeoAdminController } from './seo-settings.controller';
import { SeoSettingsService } from './seo-settings.service';
@Module({
 controllers:[SeoPublicController,SeoAdminController],
 providers:[SeoSettingsService],
 exports:[SeoSettingsService],
})
export class SeoSettingsModule {}
