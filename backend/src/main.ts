import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import compression from 'compression';
import helmet from "helmet"
import cookieParser from 'cookie-parser';
import {json,urlencoded} from 'express'
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './lib/all-exceptions.filter';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(compression());
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({origin:"*", compression: true, credentials: true});
  app.use(json({limit: '5mb'}));
  app.use(urlencoded({extended:true,limit: '5mb'}));
  app.useGlobalPipes(
    new ValidationPipe({
      transform:true,
      
    })
  );
  //here i will use global filters
  app.useGlobalFilters(new AllExceptionsFilter())

    if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('niqab')
      .setDescription('the halal mraage')
      .setVersion('1.0')
      .addTag('pharmacy')
      .build();
    
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, documentFactory);
  }


  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
