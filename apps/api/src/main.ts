import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { urlencoded } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

const DEFAULT_PRODUCTION_ORIGINS = [
  'https://azem.cloud',
  'https://www.azem.cloud',
  'https://admin.azem.cloud',
  'https://courier.azem.cloud',
];

function corsOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (configured?.length) return configured;
  if (process.env.NODE_ENV === 'production') return DEFAULT_PRODUCTION_ORIGINS;
  return ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];
}

async function bootstrap(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && process.env.PAYMENT_DEV_AUTO_SUCCESS === 'true') {
    throw new Error('PAYMENT_DEV_AUTO_SUCCESS must not be enabled when NODE_ENV is production');
  }
  const app = await NestFactory.create(AppModule);
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.setGlobalPrefix('api/v1', { exclude: [{ path: 'health', method: RequestMethod.GET }] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  const enableSwagger = process.env.SWAGGER_ENABLED === 'true';
  if (enableSwagger) {
    const config = new DocumentBuilder().setTitle('Pastane API').setVersion('1.0').addBearerAuth().build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }
  await app.listen(process.env.API_PORT ?? 3003, '0.0.0.0');
}
void bootstrap();
