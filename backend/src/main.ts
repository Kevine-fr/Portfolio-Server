import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { API_PREFIX, configureApp } from './app.setup';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const { isProd, origins } = configureApp(app);
  app.enableShutdownHooks();

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
  logger.log(`API ready on :${port}/${API_PREFIX} — env=${process.env.NODE_ENV || 'development'}`);
  if (origins.length) logger.log(`CORS origins: ${origins.join(', ')}`);
}
bootstrap();
