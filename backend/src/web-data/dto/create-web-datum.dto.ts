
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class HeroVideoDto {
  @ApiPropertyOptional({
    description: 'Hero video URL for big screen',
    example: 'https://example.com/video-desktop.mp4',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  bigScreen?: string;

  @ApiPropertyOptional({
    description: 'Hero video URL for mobile screen',
    example: 'https://example.com/video-mobile.mp4',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  mobileScreen?: string;
}
export class ImagesDto {
  @ApiPropertyOptional({
    description: 'Left image URL',
    example: 'https://example.com/left-image.jpg',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  left?: string;

  @ApiPropertyOptional({
    description: 'Right image URL',
    example: 'https://example.com/right-image.jpg',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  right?: string;
}

export class HomeSectionDto {
  @ApiPropertyOptional({
    description: 'Hero video URLs',
    type: HeroVideoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => HeroVideoDto)
  heroVideo?: HeroVideoDto;

  @ApiPropertyOptional({
    description: 'Home section images',
    type: ImagesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImagesDto)
  images?: ImagesDto;
}
export class AboutSectionDto {
  @ApiPropertyOptional({
    description: 'About section images',
    type: ImagesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImagesDto)
  images?: ImagesDto;
}

export class CreateWebDatumDto {}
