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
import pagination from "mongoose-paginate-v2"
import virtuals from "mongoose-lean-virtuals"
@Module({
  imports: [

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
