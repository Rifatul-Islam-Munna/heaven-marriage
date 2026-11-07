// faq/dto/create-faq.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { MaxWords } from '../../lib/word-limit';

export class CreateFaqDto {
  @ApiProperty({
    description: 'FAQ title',
    example: 'কিভাবে বায়োডাটা তৈরি করবো?',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiProperty({
    description: 'Answer text, maximum 3000 words',
    example: 'বায়োডাটা তৈরি করতে প্রথমে রেজিস্ট্রেশন করুন...',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxWords(3000)
  @Transform(({ value }) => value?.trim())
  description: string;
}


export class IdDto{
  @ApiProperty()
  @IsString()
  @IsNotEmpty()

  id: string
}
