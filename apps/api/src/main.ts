import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { urlencoded } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && process.env.PAYMENT_DEV_AUTO_SUCCESS === 'true') {
    throw new Error('PAYMENT_DEV_AUTO_SUCCESS must not be enabled when NODE_ENV is production');
  }
  const app = await NestFactory.create(AppModule);
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  const enableSwagger = process.env.SWAGGER_ENABLED === 'true';
  if (enableSwagger) {
    const config = new DocumentBuilder().setTitle('Pastane API').setVersion('1.0').addBearerAuth().build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }
  await app.listen(process.env.API_PORT ?? 3003);
}
void bootstrap();
