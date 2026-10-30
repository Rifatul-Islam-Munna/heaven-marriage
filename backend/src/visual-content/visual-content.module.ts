import { Module } from '@nestjs/common';
import { VisualContentService } from './visual-content.service';
import { PublicVisualContentController, AdminVisualContentController } from './visual-content.controller';

@Module({
  controllers: [PublicVisualContentController, AdminVisualContentController],
  providers: [VisualContentService],
})
export class VisualContentModule {}
