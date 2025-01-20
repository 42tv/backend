import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExceptionfilterFormat } from './middle-ware/exception-filter';
import { GraylogService } from 'nestjs-graylog';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const graylogService = app.get(GraylogService);
  app.useGlobalFilters(new ExceptionfilterFormat(graylogService));
  await app.listen(3000);
}
bootstrap();
