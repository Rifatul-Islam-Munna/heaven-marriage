import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateFaqDto, IdDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('faq')
@ApiTags('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  // Create FAQ
  @Post()

  @ApiOperation({ summary: 'Create a new FAQ' })
  @ApiResponse({
    status: 201,
    description: 'FAQ created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createFaqDto: CreateFaqDto) {
    return this.faqService.create(createFaqDto);
  }

  // Get all FAQs
  @Get()
  @ApiOperation({ summary: 'Get all FAQs' })
  @ApiResponse({
    status: 200,
    description: 'FAQs retrieved successfully',
  })
  findAll() {
    return this.faqService.findAll();
  }

  // Get single FAQ
  @Get('get-one')
  @ApiOperation({ summary: 'Get FAQ by ID' })
  
  @ApiResponse({
    status: 200,
    description: 'FAQ retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  findOne(@Query('id') id: IdDto) {
    return this.faqService.findOne(id.id);
  }

  // Update FAQ
  @Patch('update-faq-one')

  @ApiOperation({ summary: 'Update FAQ' })
  
  @ApiResponse({
    status: 200,
    description: 'FAQ updated successfully',
  })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  update( @Body() updateFaqDto: UpdateFaqDto) {
    return this.faqService.update( updateFaqDto);
  }

  // Delete FAQ
  @Delete('delete-faq')
 
  @ApiOperation({ summary: 'Delete FAQ' })
 
  @ApiResponse({
    status: 200,
    description: 'FAQ deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  remove(@Query() id: IdDto) {
    return this.faqService.remove(id.id);
  }
}
