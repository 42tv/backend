import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ExceptionfilterFormat } from './middle-ware/exception-filter';
import { GraylogService } from 'nestjs-graylog';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  // HTTP 애플리케이션 생성
  const app = await NestFactory.create(AppModule);
  const graylogService = app.get(GraylogService);

  app.useGlobalFilters(new ExceptionfilterFormat(graylogService));

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('API example')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  // Redis Microservice 생성
  const microservice =
    await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
      transport: Transport.REDIS,
      options: {
        host: '112.162.99.107',
        port: 6379,
      },
    });

  // HTTP 서버와 Redis Microservice를 동시에 실행
  await Promise.all([
    app
      .listen(3000)
      .then(() =>
        console.log('🚀 HTTP Server running on http://localhost:3000'),
      ),
    microservice
      .listen()
      .then(() => console.log('📡 Redis Microservice is running')),
  ]);
}

bootstrap();
