import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.entity';
import { Shortlist, ShortlistSchema } from './entities/shortlist.schema';
import { BkashService } from './bkash.service';
import { HttpModule } from '@nestjs/axios';
import { PricingModule } from 'src/pricing/pricing.module';
import { RequestNumber,RequestNumberSchema } from './entities/RequestNumber.schema';
import { TelegramService } from './telegram.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema },{name:Shortlist.name,schema:ShortlistSchema},{name:RequestNumber.name, schema:RequestNumberSchema}]),HttpModule,PricingModule],
  controllers: [UserController],
  providers: [UserService,BkashService,TelegramService],
})
export class UserModule {}
