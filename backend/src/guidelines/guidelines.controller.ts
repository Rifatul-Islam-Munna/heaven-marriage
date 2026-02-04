import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { GuidelinesService } from './guidelines.service';
import { CreateGuidelineDto, IdDto } from './dto/create-guideline.dto';
import { UpdateGuidelineDto } from './dto/update-guideline.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('guidelines')
export class GuidelinesController {
  constructor(private readonly guidelinesService: GuidelinesService) {}

 // Create FAQ
   @Post()
 
   @ApiOperation({ summary: 'Create a new FAQ' })
   @ApiResponse({
     status: 201,
     description: 'FAQ created successfully',
   })
   @ApiResponse({ status: 400, description: 'Bad request' })
   create(@Body() createFaqDto: CreateGuidelineDto) {
     return this.guidelinesService.create(createFaqDto);
   }
 
   // Get all FAQs
   @Get()
   @ApiOperation({ summary: 'Get all FAQs' })
   @ApiResponse({
     status: 200,
     description: 'FAQs retrieved successfully',
   })
   findAll() {
     return this.guidelinesService.findAll();
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
     return this.guidelinesService.findOne(id.id);
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
   update( @Body() updateFaqDto: UpdateGuidelineDto) {
     return this.guidelinesService.update( updateFaqDto);
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
     return this.guidelinesService.remove(id.id);
   }
}
