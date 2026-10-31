import {DashboardPermission} from '../staff-access/permissions';
import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../lib/auth.guard';
import { RolesGuard } from '../lib/roles.guard';
import { Roles } from '../lib/roles.decorator';
import { UserType } from '../user/entities/user.entity';
import { CustomQuestionService } from './custom-question.service';
import { CustomQuestion } from './entities/custom-question.entity';
import { CreateCustomQuestionDto, deleteDto } from './dto/create-custom-question.dto';


@Controller('admin/custom-questions')
export class CustomQuestionController {
  constructor(private readonly customQuestionService: CustomQuestionService) {}

  @Post()
  @UseGuards(AuthGuard,RolesGuard)
  @DashboardPermission('questions')

  async create(@Body() question: CreateCustomQuestionDto): Promise<CustomQuestion> {
    return await this.customQuestionService.create(question.question);
  }

  // Members must be able to load legacy default questions during profile editing.
  // Only create and delete are restricted to the question-builder permission.
  @Get()
  async findAll(): Promise<CustomQuestion[]> {
    return await this.customQuestionService.findAll();
  }

  @Delete('delete-question')
  @UseGuards(AuthGuard,RolesGuard)
  @DashboardPermission('questions')

  async delete(@Query() id: deleteDto): Promise<{ message: string }> {
    await this.customQuestionService.delete(id.id);
    return { message: 'Question deleted successfully' };
  }
}
