import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePricingDto } from './dto/create-pricing.dto';
import { UpdatePricingDto } from './dto/update-pricing.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Pricing, PricingDocument } from './entities/pricing.entity';
import { Model } from 'mongoose';

@Injectable()
export class PricingService {
  constructor(@InjectModel(Pricing.name) private pricingModel: Model<PricingDocument>) {}

  async create(createPricingDto: CreatePricingDto): Promise<Pricing> {
    const newPricing = new this.pricingModel(createPricingDto);
    return await newPricing.save();
  }

  async findAll(): Promise<Pricing[]> {
    return await this.pricingModel.find().exec();
  }

  async findOne(id: string): Promise<Pricing> {
    const pricing = await this.pricingModel.findById(id).exec();
    if (!pricing) {
      throw new NotFoundException(`Pricing with ID ${id} not found`);
    }
    
    return pricing;
  }

  async update( updatePricingDto: UpdatePricingDto): Promise<Pricing> {
    const updatedPricing = await this.pricingModel
      .findByIdAndUpdate(updatePricingDto.id, updatePricingDto, { new: true })
      .exec();
    if (!updatedPricing) {
      throw new NotFoundException(`Pricing   not found`);
    }
    return updatedPricing;
  }

  async remove(id: string) {
    const result = await this.pricingModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Pricing with ID ${id} not found`);
    }
    return { message: 'Pricing deleted successfully' };
  }
}
