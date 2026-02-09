import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { CustomQuestionService } from './custom-question.service';
import { CustomQuestion } from './entities/custom-question.entity';
import { CreateCustomQuestionDto, deleteDto } from './dto/create-custom-question.dto';


@Controller('admin/custom-questions')
export class CustomQuestionController {
  constructor(private readonly customQuestionService: CustomQuestionService) {}

  @Post()

  async create(@Body() question: CreateCustomQuestionDto): Promise<CustomQuestion> {
    return await this.customQuestionService.create(question.question);
  }

  @Get()
  async findAll(): Promise<CustomQuestion[]> {
    return await this.customQuestionService.findAll();
  }

  @Delete('delete-question')

  async delete(@Query() id: deleteDto): Promise<{ message: string }> {
    await this.customQuestionService.delete(id.id);
    return { message: 'Question deleted successfully' };
  }
}
