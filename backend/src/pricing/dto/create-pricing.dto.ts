import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, IsBoolean, IsInt, Max } from 'class-validator';

export class CreatePricingDto {
 @IsOptional() @IsBoolean() disabled?:boolean;
 @IsOptional() @IsInt() @Min(1) @Max(3650) validityDays?:number;
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
  @Min(1)
  @IsInt()
  numberOfConnections?: number;
}


export class IdTypeDto{
 @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string
}