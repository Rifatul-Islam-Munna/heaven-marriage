// contact/contact.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateContactDto, QueryContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { Contact, ContactDocument } from './entities/contact.entity';

@Injectable()
export class ContactService {
  constructor(
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
  ) {}

  // Create contact message
  async create(createContactDto: CreateContactDto): Promise<Contact> {
    const createdContact = new this.contactModel(createContactDto);
    return createdContact.save();
  }

  // Get all contacts (for admin)
  async findAll(queryDto: QueryContactDto) {
    const { page = 1, filter = 'all', search } = queryDto;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Build filter
    const query: any = {};

    // Filter by read status
    if (filter === 'read') {
      query.isRead = true;
    } else if (filter === 'unread') {
      query.isRead = false;
    }

    // Search by name or email
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
      ];
    }

    // Execute query with pagination
    const [data, totalItems] = await Promise.all([
      this.contactModel
        .find(query)
        .sort({ createdAt: -1 }) // Latest first
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.contactModel.countDocuments(query).exec(),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  // Get single contact by ID
  async findOne(id: string): Promise<Contact> {
    const contact = await this.contactModel.findById(id).lean().exec();
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return contact;
  }

  // Update contact (mark as read)
  async update(updateContactDto: UpdateContactDto): Promise<Contact> {
    const { id, isRead } = updateContactDto;
    
    const updatedContact = await this.contactModel
      .findByIdAndUpdate(id, { isRead }, { new: true })
      .lean()
      .exec();

    if (!updatedContact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    return updatedContact;
  }

  // Delete contact
  async remove(id: string): Promise<{ message: string }> {
    const result = await this.contactModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    return { message: 'Contact deleted successfully' };
  }

  // Get unread count (useful for admin dashboard)
  async getUnreadCount(): Promise<number> {
    return this.contactModel.countDocuments({ isRead: false }).exec();
  }

  // Get statistics
  async getStats(): Promise<{
    total: number;
    read: number;
    unread: number;
  }> {
    const [total, read] = await Promise.all([
      this.contactModel.countDocuments().exec(),
      this.contactModel.countDocuments({ isRead: true }).exec(),
    ]);

    return {
      total,
      read,
      unread: total - read,
    };
  }
}
