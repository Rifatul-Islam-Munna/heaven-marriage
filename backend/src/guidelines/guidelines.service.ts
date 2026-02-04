import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateGuidelineDto } from './dto/create-guideline.dto';
import { UpdateGuidelineDto } from './dto/update-guideline.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Guideline, GuidelineDocument } from './entities/guideline.entity';
import { Model } from 'mongoose';

@Injectable()
export class GuidelinesService {
  constructor(@InjectModel(Guideline.name) private guidelineModel:Model<GuidelineDocument>) {}
  // Create FAQ
   async create(createFaqDto: CreateGuidelineDto): Promise<CreateGuidelineDto> {
     const createdFaq = new this.guidelineModel(createFaqDto);
     return createdFaq.save();
   }
 
   // Get all FAQs
   async findAll(): Promise<CreateGuidelineDto[]> {
     return this.guidelineModel
       .find()
       .sort({ createdAt: -1 }) // Latest first
       .lean()
       .exec();
   }
 
   // Get single FAQ by ID
   async findOne(id: string): Promise<CreateGuidelineDto> {
     const faq = await this.guidelineModel.findById(id).lean().exec();
     if (!faq) {
       throw new NotFoundException(`guideline with ID ${id} not found`);
     }
     return faq;
   }
 
   // Update FAQ
   async update( updateFaqDto: UpdateGuidelineDto): Promise<CreateGuidelineDto> {
     const updatedFaq = await this.guidelineModel
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
     const result = await this.guidelineModel.findByIdAndDelete(id).exec();
 
     if (!result) {
       throw new NotFoundException(`FAQ with ID ${id} not found`);
     }
 
     return { message: 'FAQ deleted successfully' };
   }
}
