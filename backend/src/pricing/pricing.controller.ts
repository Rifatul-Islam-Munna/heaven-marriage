import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { CreatePricingDto, IdTypeDto } from './dto/create-pricing.dto';
import { UpdatePricingDto } from './dto/update-pricing.dto';
import { AuthGuard } from 'src/lib/auth.guard';
import { RolesGuard } from 'src/lib/roles.guard';
import { Roles } from 'src/lib/roles.decorator';
import { UserType } from 'src/user/entities/user.entity';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post()
  @UseGuards(AuthGuard,RolesGuard)
  @Roles(UserType.ADMIN)
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
    @UseGuards(AuthGuard,RolesGuard)
  @Roles(UserType.ADMIN)
  update( @Body() updatePricingDto: UpdatePricingDto) {
    return this.pricingService.update( updatePricingDto);
  }

  @Delete('delete-one')
    @UseGuards(AuthGuard,RolesGuard)
  @Roles(UserType.ADMIN)
  remove(@Query() id: IdTypeDto) {
    return this.pricingService.remove(id.id);
  }
}
