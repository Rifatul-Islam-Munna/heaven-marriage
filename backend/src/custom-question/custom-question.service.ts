import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CustomQuestion, CustomQuestionDocument } from './entities/custom-question.entity';


@Injectable()
export class CustomQuestionService {
  constructor(
    @InjectModel(CustomQuestion.name) 
    private customQuestionModel: Model<CustomQuestionDocument>
  ) {}

  async create(question: string): Promise<CustomQuestion> {
   
      const newQuestion = new this.customQuestionModel({ question });
      return await newQuestion.save();
    
  }

  async findAll(): Promise<CustomQuestion[]> {
    return await this.customQuestionModel.find().sort({ createdAt: 1 }).exec();
  }

  async delete(id: string): Promise<CustomQuestion> {
    const deleted = await this.customQuestionModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException('Question not found');
    }
    return deleted;
  }
}
