import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { CreatePricingDto, IdTypeDto } from './dto/create-pricing.dto';
import { UpdatePricingDto } from './dto/update-pricing.dto';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post()
  create(@Body() createPricingDto: CreatePricingDto) {
    return this.pricingService.create(createPricingDto);
  }

  @Get()
  findAll() {
    return this.pricingService.findAll();
  }

  @Get('get-one')
  findOne(@Query() id: IdTypeDto) {
    return this.pricingService.findOne(id.id);
  }

  @Patch('')
  update( @Body() updatePricingDto: UpdatePricingDto) {
    return this.pricingService.update( updatePricingDto);
  }

  @Delete('delete-one')
  remove(@Query() id: IdTypeDto) {
    return this.pricingService.remove(id.id);
  }
}
