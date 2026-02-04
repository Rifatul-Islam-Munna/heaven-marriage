import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GuidelineDocument = HydratedDocument<Guideline>;

@Schema()
export class Guideline {
     @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;
}

export const GuidelineSchema = SchemaFactory.createForClass(Guideline);
