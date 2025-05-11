import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ExceptionfilterFormat } from './middle-ware/exception-filter';
import { GraylogService } from 'nestjs-graylog';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  // HTTP 애플리케이션 생성
  const app = await NestFactory.create(AppModule);
  const graylogService = app.get(GraylogService);

  app.useGlobalFilters(new ExceptionfilterFormat(graylogService));
  // Cookie 미들웨어 설정
  app.use(cookieParser());

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('API example')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(3000);
}

bootstrap();
