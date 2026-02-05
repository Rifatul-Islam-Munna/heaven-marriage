import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePricingDto {
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
    @Transform(({ value }) => parseInt(value, 10))
  @Min(0)
  originalPrice?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @Min(0)
  discountPrice?: number;
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @Min(0)
  numberOfConnections?: number;
}


export class IdTypeDto{
 @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string
}