// contact/contact.controller.ts
import {
  UseGuards,
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
import { AuthGuard } from 'src/lib/auth.guard';
import { RolesGuard } from 'src/lib/roles.guard';
import { Roles } from 'src/lib/roles.decorator';
import { UserType } from 'src/user/entities/user.entity';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { CreateContactDto, IdDto, QueryContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';


@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  // Create contact (public - for users)
  @UseGuards(ThrottlerGuard)
  @Throttle({default:{limit:5,ttl:600000}})
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
  @UseGuards(AuthGuard,RolesGuard)
  @Roles(UserType.ADMIN)
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
  @UseGuards(AuthGuard,RolesGuard)
  @Roles(UserType.ADMIN)
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
  @UseGuards(AuthGuard,RolesGuard)
  @Roles(UserType.ADMIN)
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
  @UseGuards(AuthGuard,RolesGuard)
  @Roles(UserType.ADMIN)
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
  @UseGuards(AuthGuard,RolesGuard)
  @Roles(UserType.ADMIN)
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
  @UseGuards(AuthGuard,RolesGuard)
  @Roles(UserType.ADMIN)
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
