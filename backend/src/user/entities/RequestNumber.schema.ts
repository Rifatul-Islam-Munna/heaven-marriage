import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, mongo } from 'mongoose';
import { User } from './user.entity';

export type RequestNumberDocument = HydratedDocument<RequestNumber>;
@Schema({ timestamps: true ,autoIndex: true,virtuals:true})
export class RequestNumber {
    @Prop({type:mongoose.Schema.Types.ObjectId,ref:User.name,required: true })
    userId?: mongoose.Types.ObjectId
    
     @Prop({type:mongoose.Schema.Types.ObjectId,ref:User.name,required: true })
    requestUserId?: mongoose.Types.ObjectId
}

export const RequestNumberSchema = SchemaFactory.createForClass(RequestNumber);