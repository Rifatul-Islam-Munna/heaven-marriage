// web-data/web-data.controller.ts
import { Controller, Get, Post, Body, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebDataService } from './web-data.service';
import { UpdateWebDataDto } from './dto/update-web-datum.dto';


@ApiTags('Web Data')
@Controller('web-data')
export class WebDataController {
  constructor(private readonly webDataService: WebDataService) {}

  // Get web data
  @Get()
  @ApiOperation({ summary: 'Get website data (images, videos URLs)' })
  @ApiResponse({
    status: 200,
    description: 'Web data retrieved successfully',
  })
  findOne() {
    return this.webDataService.findOne();
  }

  // Create or update web data
  @Patch()
  @ApiOperation({ summary: 'Update website data (Create if not exists)' })
  @ApiResponse({
    status: 200,
    description: 'Web data updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  upsert(@Body() updateWebDataDto: UpdateWebDataDto) {
    return this.webDataService.upsert(updateWebDataDto);
  }
}
