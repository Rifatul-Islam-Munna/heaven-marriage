// contact/dto/create-contact.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsPhoneNumber,
  IsMongoId,
  IsOptional,
  IsInt,
  Min,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateContactDto {
  @ApiProperty({
    description: 'Name of the person',
    example: 'জন ডো',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({
    description: 'Mobile number',
    example: '01712345678',
    minLength: 11,
    maxLength: 15,
  })
  @IsString()
  @IsNotEmpty()
  
  @IsPhoneNumber("BD")
 
  @Transform(({ value }) => value?.trim())
  mobile: string;

  @ApiProperty({
    description: 'Message or description',
    example: 'আমি আপনাদের সেবা সম্পর্কে জানতে চাই...',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  @Transform(({ value }) => value?.trim())
  description: string;
}
export class IdDto {
  @ApiProperty({
    description: 'Contact ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsNotEmpty()
  id: string;
}

export class QueryContactDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Filter by read status',
    example: 'all',
    default: 'all',
    enum: ['all', 'read', 'unread'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['all', 'read', 'unread'])
  filter?: string = 'all';

  @ApiPropertyOptional({
    description: 'Search by name or email',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;
}