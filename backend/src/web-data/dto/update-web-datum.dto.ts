// web-data/dto/update-web-data.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { HomeSectionDto } from './create-web-datum.dto';
import { AboutSectionDto } from './create-web-datum.dto';

export class UpdateWebDataDto {
  @ApiPropertyOptional({
    description: 'Home section data',
    type: HomeSectionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => HomeSectionDto)
  home?: HomeSectionDto;

  @ApiPropertyOptional({
    description: 'About section data',
    type: AboutSectionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AboutSectionDto)
  about?: AboutSectionDto;
}
