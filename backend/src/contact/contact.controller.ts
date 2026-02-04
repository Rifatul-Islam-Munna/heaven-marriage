// contact/contact.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto, IdDto, QueryContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';


@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  // Create contact (public - for users)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a contact message' })
  @ApiResponse({
    status: 201,
    description: 'Contact message submitted successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createContactDto: CreateContactDto) {
    return this.contactService.create(createContactDto);
  }

  // Get all contacts (admin only)
  @Get()
  @ApiBearerAuth() // If authentication required
  @ApiOperation({ summary: 'Get all contact messages with pagination (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Contacts retrieved successfully',
  })
  findAll(@Query() queryDto: QueryContactDto) {
    return this.contactService.findAll(queryDto);
  }

  // Get single contact
  @Get('get-one')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get contact by ID (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Contact retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  findOne(@Query() query: IdDto) {
    return this.contactService.findOne(query.id);
  }

  // Update contact (mark as read)
  @Patch('mark-as-read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark contact as read (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Contact updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  update(@Body() updateContactDto: UpdateContactDto) {
    return this.contactService.update(updateContactDto);
  }

  // Delete contact
  @Delete('delete')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete contact (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Contact deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  remove(@Query() query: IdDto) {
    return this.contactService.remove(query.id);
  }

  // Get unread count
  @Get('unread-count')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unread contact count (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
  })
  getUnreadCount() {
    return this.contactService.getUnreadCount();
  }

  // Get statistics
  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get contact statistics (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  getStats() {
    return this.contactService.getStats();
  }
}
