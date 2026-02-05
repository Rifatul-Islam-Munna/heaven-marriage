import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Pricing, PricingSchema } from './entities/pricing.entity';

@Module({
  imports: [MongooseModule.forFeature([{name:Pricing.name,schema:PricingSchema}])],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService]
})
export class PricingModule {}
