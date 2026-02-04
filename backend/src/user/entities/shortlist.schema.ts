import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, mongo } from 'mongoose';
import { User } from './user.entity';

export type ShortlistDocument = HydratedDocument<Shortlist>;
@Schema({ timestamps: true ,autoIndex: true,virtuals:true})
export class Shortlist {
@Prop({type:mongoose.Schema.Types.ObjectId,ref:User.name,required: true })
userId: mongoose.Types.ObjectId

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: User.name }] })
shortlistedUserId: User[]
}

export const ShortlistSchema = SchemaFactory.createForClass(Shortlist);
