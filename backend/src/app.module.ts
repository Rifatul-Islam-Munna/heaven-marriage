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
      getTracker: (req) => {
    // Helper to get first valid value
    const getHeader = (headerName: string): string | null => {
      const value = req.headers[headerName];
      if (!value) return null;
      
      const str = typeof value === 'string' ? value : value[0];
      return str?.trim() || null;
    };
    
    // Priority order for your stack
    const ip = 
      getHeader('cf-connecting-ip') ||           // Cloudflare (most reliable)
      getHeader('x-forwarded-for')?.split(',')[0]?.trim() || // Proxies
      getHeader('x-real-ip') ||                  // Nginx/Easypanel
      getHeader('true-client-ip') ||             // Cloudflare Enterprise
      getHeader('x-client-ip') ||                // Other proxies
      req.ip ||                                  // Express fallback
      'unknown';
    
    return ip;
  }
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
    PricingModule,
    CustomQuestionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
