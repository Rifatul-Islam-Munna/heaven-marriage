import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreatePricingDto } from './create-pricing.dto';
import { IsMongoId } from 'class-validator';

export class UpdatePricingDto extends PartialType(CreatePricingDto) {
    @ApiProperty()
    @IsMongoId()
    id?:string
}
