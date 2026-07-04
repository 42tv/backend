import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ExceptionfilterFormat } from './middle-ware/exception-filter';
import { GraylogService } from 'nestjs-graylog';
import * as cookieParser from 'cookie-parser';
import { EnvironmentValidator } from './config/environment.validator';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  // 환경변수 검증 (애플리케이션 시작 전)
  EnvironmentValidator.validateRequiredEnvironmentVariables();

  // HTTP 애플리케이션 생성
  const app = await NestFactory.create(AppModule);

  // DB 연결 검사 (실패 시 메시지 출력 후 종료)
  try {
    await app.get(PrismaService).$queryRaw`SELECT 1`;
  } catch (error) {
    console.error(
      '데이터베이스 연결에 실패했습니다. DB 서버 상태와 DATABASE_URL을 확인하세요.',
    );
    console.error(error instanceof Error ? error.message : error);
    await app.close();
    process.exit(1);
  }

  const graylogService = app.get(GraylogService);

  app.useGlobalFilters(new ExceptionfilterFormat(graylogService));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
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
  const port = 3000;
  console.log(`Server is running on port ${port}`);
  await app.listen(port);
}

bootstrap();
