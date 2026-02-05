import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument} from 'mongoose';


export type PricingDocument = HydratedDocument<Pricing>;

@Schema()
export class Pricing  {
  @Prop({ required: true })
  title?: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  originalPrice?: number;

  @Prop()
  discountPrice?: number;

  @Prop()
  numberOfConnections?:number
}

export const PricingSchema = SchemaFactory.createForClass(Pricing);
