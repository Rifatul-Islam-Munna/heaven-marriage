// web-data/web-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WebData, WebDataDocument } from './entities/web-datum.entity';
import { UpdateWebDataDto } from './dto/update-web-datum.dto';


@Injectable()
export class WebDataService {
  constructor(
    @InjectModel(WebData.name) private webDataModel: Model<WebDataDocument>,
  ) {}

  // Get web data
  async findOne(): Promise<WebData> {
    let webData = await this.webDataModel.findOne().lean().exec();

    if (!webData) {
      const defaultData = new this.webDataModel({
        home: {
          heroVideo: {
            bigScreen: '',
            mobileScreen: '',
          },
          images: {
            left: '',
            right: '',
          },
        },
        about: {
          images: {
            left: '',
            right: '',
          },
        },
      });
      webData = await defaultData.save();
    }

    return webData;
  }

  // Update with dot notation
  async upsert(updateWebDataDto: UpdateWebDataDto) {
    // Ensure document exists
    await this.findOne();

    // Build update object with dot notation
    const updateObject: any = {};

    if (updateWebDataDto.home) {
      if (updateWebDataDto.home.heroVideo) {
        if (updateWebDataDto.home.heroVideo.bigScreen !== undefined) {
          updateObject['home.heroVideo.bigScreen'] = updateWebDataDto.home.heroVideo.bigScreen;
        }
        if (updateWebDataDto.home.heroVideo.mobileScreen !== undefined) {
          updateObject['home.heroVideo.mobileScreen'] = updateWebDataDto.home.heroVideo.mobileScreen;
        }
      }

      if (updateWebDataDto.home.images) {
        if (updateWebDataDto.home.images.left !== undefined) {
          updateObject['home.images.left'] = updateWebDataDto.home.images.left;
        }
        if (updateWebDataDto.home.images.right !== undefined) {
          updateObject['home.images.right'] = updateWebDataDto.home.images.right;
        }
      }
    }

    if (updateWebDataDto.about) {
      if (updateWebDataDto.about.images) {
        if (updateWebDataDto.about.images.left !== undefined) {
          updateObject['about.images.left'] = updateWebDataDto.about.images.left;
        }
        if (updateWebDataDto.about.images.right !== undefined) {
          updateObject['about.images.right'] = updateWebDataDto.about.images.right;
        }
      }
    }

    // Update using $set with dot notation
    const updated = await this.webDataModel
      .findOneAndUpdate(
        {},
        { $set: updateObject },
        { new: true, upsert: false }
      )
      .lean()
      .exec();

    return updated;
  }
}
