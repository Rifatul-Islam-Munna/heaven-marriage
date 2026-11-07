import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, mongo } from 'mongoose';
import { User } from './user.entity';

export type ShortlistDocument = HydratedDocument<Shortlist>;
@Schema({ timestamps: true ,autoIndex: true,virtuals:true})
export class Shortlist {
@Prop({type:mongoose.Schema.Types.ObjectId,ref:User.name,required: true })
userId: mongoose.Types.ObjectId

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: User.name }] })
shortlistedUserId:  mongoose.Types.ObjectId[]
}

export const ShortlistSchema = SchemaFactory.createForClass(Shortlist);
// Existing storage stays unchanged. Multikey index accelerates "Who Favourited Me".
// Do not impose a new unique constraint on legacy data without migration.
ShortlistSchema.index({ userId: 1 });
ShortlistSchema.index({ shortlistedUserId: 1 });
