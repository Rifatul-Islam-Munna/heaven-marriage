// web-data/schemas/web-data.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WebDataDocument = HydratedDocument<WebData>;

class HeroVideo {
  @Prop({ default: '' })
  bigScreen: string;

  @Prop({ default: '' })
  mobileScreen: string;
}

class Images {
  @Prop({ default: '' })
  left: string;

  @Prop({ default: '' })
  right: string;
}

class HomeSection {
  @Prop({ type: HeroVideo, default: () => ({}) })
  heroVideo: HeroVideo;

  @Prop({ type: Images, default: () => ({}) })
  images: Images;
}

class AboutSection {
  @Prop({ type: Images, default: () => ({}) })
  images: Images;
}

@Schema({ timestamps: true })
export class WebData {
  @Prop({ type: HomeSection, default: () => ({}) })
  home: HomeSection;

  @Prop({ type: AboutSection, default: () => ({}) })
  about: AboutSection;
}

export const WebDataSchema = SchemaFactory.createForClass(WebData);



