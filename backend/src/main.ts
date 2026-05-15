import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind Traefik/Nginx — trust the first proxy so req.ip uses X-Forwarded-For
  // (needed for the throttler on POST /contacts to rate-limit by real client IP)
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'uploads/(.*)', method: RequestMethod.GET }],
  });

  // CORS — explicit whitelist in prod; permissive in dev if unset
  const corsEnv = (process.env.CORS_ORIGIN || '').trim();
  const origins = corsEnv ? corsEnv.split(',').map((o) => o.trim()).filter(Boolean) : [];
  const isProd = process.env.NODE_ENV === 'production';
  app.enableCors({
    origin: origins.length ? origins : (isProd ? false : true),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger only in non-prod (or when explicitly enabled)
  if (!isProd || process.env.ENABLE_SWAGGER === '1') {
    const config = new DocumentBuilder()
      .setTitle('Portfolio API')
      .setDescription('Kevine Fray Portfolio API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`API ready on :${port}/api/v1 — env=${process.env.NODE_ENV || 'development'}`);
  if (origins.length) logger.log(`CORS origins: ${origins.join(', ')}`);
}
bootstrap();
