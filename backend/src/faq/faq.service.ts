// faq/faq.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { Faq, FaqDocument } from './entities/faq.entity';

@Injectable()
export class FaqService {
  constructor(
    @InjectModel(Faq.name) private faqModel: Model<FaqDocument>,
  ) {}

  // Create FAQ
  async create(createFaqDto: CreateFaqDto): Promise<Faq> {
    const createdFaq = new this.faqModel(createFaqDto);
    return createdFaq.save();
  }

  // Get all FAQs
  async findAll(): Promise<Faq[]> {
    return this.faqModel
      .find()
      .sort({ createdAt: -1 }) // Latest first
      .lean()
      .exec();
  }

  // Get single FAQ by ID
  async findOne(id: string): Promise<Faq> {
    const faq = await this.faqModel.findById(id).lean().exec();
    if (!faq) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }
    return faq;
  }

  // Update FAQ
  async update( updateFaqDto: UpdateFaqDto): Promise<Faq> {
    const updatedFaq = await this.faqModel
      .findByIdAndUpdate(updateFaqDto.id, updateFaqDto, { new: true })
      .lean()
      .exec();

    if (!updatedFaq) {
      throw new NotFoundException(`FAQ with ID ${updateFaqDto.id} not found`);
    }

    return updatedFaq;
  }

  // Delete FAQ
  async remove(id: string): Promise<{ message: string }> {
    const result = await this.faqModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }

    return { message: 'FAQ deleted successfully' };
  }
}
