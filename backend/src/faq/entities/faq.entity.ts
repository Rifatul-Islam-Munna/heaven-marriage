// faq/schemas/faq.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FaqDocument = HydratedDocument<Faq>;

@Schema({ timestamps: true })
export class Faq {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;
}

export const FaqSchema = SchemaFactory.createForClass(Faq);
