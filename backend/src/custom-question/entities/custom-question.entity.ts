import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CustomQuestionDocument = HydratedDocument<CustomQuestion>;

@Schema({ timestamps: true })
export class CustomQuestion {
  @Prop({ required: true, unique: true })
  question: string;
}

export const CustomQuestionSchema = SchemaFactory.createForClass(CustomQuestion);
