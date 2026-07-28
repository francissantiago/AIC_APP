import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { createValidationExceptionFactory } from './common/errors/validation-exception.factory';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // AIC-SEC-022: headers de segurança (API JSON + assets cross-origin do FE)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.setGlobalPrefix('api');
  const corsOrigin = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:4200',
  );
  app.enableCors({
    origin: corsOrigin.includes(',')
      ? corsOrigin.split(',').map((origin) => origin.trim())
      : corsOrigin,
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: createValidationExceptionFactory(),
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AIC API')
    .setDescription('API do AIC — Administração de Igrejas Cristãs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  // AIC-SEC-015: Swagger apenas fora de produção
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
}
void bootstrap();
