import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule} from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { UserModule } from './user/user.module';
import { FaqModule } from './faq/faq.module';
import { GuidelinesModule } from './guidelines/guidelines.module';
import { ContactModule } from './contact/contact.module';
import { ImageModule } from './image/image.module';
import { WebDataModule } from './web-data/web-data.module';
import { VisualContentModule } from './visual-content/visual-content.module';
import { QuestionConfigModule } from './profile-questions/question-config.module';
import { SeoSettingsModule } from './seo-settings/seo-settings.module';
import {BlogModule} from './blog/blog.module';
import {StaffAccessModule} from './staff-access/staff-access.module';
import { PricingModule } from './pricing/pricing.module';
import pagination from "mongoose-paginate-v2"
import virtuals from "mongoose-lean-virtuals"
import { ThrottlerModule } from '@nestjs/throttler';
import { CustomQuestionModule } from './custom-question/custom-question.module';
import { Request } from 'express';
@Module({
  imports: [
      ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 1000, // 10 requests per ttl
      getTracker: (req) => req.ip || req.socket?.remoteAddress || 'unknown'
    }]),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.ACCESS_TOKEN,
      signOptions: { expiresIn: '1d' },
    }),
    MongooseModule.forRoot(process.env.MONGODB_URL as string, {
      autoIndex:true,
        onConnectionCreate: (connection: Connection) => {
         
    connection.on('connected', () => console.log('connected'));
    connection.on('open', () => console.log('open'));
    connection.on('disconnected', () => console.log('disconnected'));
    connection.on('reconnected', () => console.log('reconnected'));
    connection.on('disconnecting', () => console.log('disconnecting'));
   
    return connection;
  },
   connectionFactory: (connection: Connection) => {
    // Plugins applied AFTER connection
    connection.plugin(virtuals);
    
    connection.plugin(pagination);
    return connection;
  },
    }),
    UserModule,
    FaqModule,
    GuidelinesModule,
    ContactModule,
    ImageModule,
    WebDataModule,
    VisualContentModule,
    QuestionConfigModule,
    SeoSettingsModule,
    BlogModule,
    StaffAccessModule,
    PricingModule,
    CustomQuestionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
