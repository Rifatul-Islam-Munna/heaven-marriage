import { GeminiService } from './gemini.service';
import { ProfileAiService } from './profile-ai.service';
import { ProfileAiController } from './profile-ai.controller';
import { PublicController } from './public.controller';
import { AiController } from './ai.controller';
import { PlatformService } from './platform.service';
import { PlatformController } from './platform.controller';
import { IdentityService } from './identity.service';
import { MessagingService } from './messaging.service';
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
import { SmsService } from './sms.service';
import { OtpService } from './otp.service';
import { Counter, CounterSchema } from './entities/counter.schema';
import { PdfService } from './pdf.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema },{name:Shortlist.name,schema:ShortlistSchema},{name:RequestNumber.name, schema:RequestNumberSchema},{name:Counter.name,schema:CounterSchema}]),HttpModule,PricingModule],
  controllers: [UserController,PlatformController,AiController,PublicController,ProfileAiController],
  providers: [GeminiService,ProfileAiService,PlatformService,IdentityService,MessagingService,UserService,BkashService,TelegramService,SmsService,OtpService,PdfService],
})
export class UserModule {}
