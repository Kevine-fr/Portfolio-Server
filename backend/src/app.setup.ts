import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

export const API_PREFIX = 'api/v1';

export function parseCorsOrigins(raw = process.env.CORS_ORIGIN): string[] {
  return (raw || '').split(',').map((o) => o.trim()).filter(Boolean);
}

/**
 * Global HTTP configuration shared by main.ts and the e2e tests, so that the
 * tests exercise exactly the same prefix / validation / CORS behaviour.
 */
export function configureApp(app: INestApplication) {
  const isProd = process.env.NODE_ENV === 'production';
  const origins = parseCorsOrigins();

  // Behind Traefik — trust the first proxy so req.ip is the real client IP
  // (used by the rate limiter on POST /contacts and POST /auth/login).
  const http = app.getHttpAdapter().getInstance();
  if (typeof http?.set === 'function') http.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.setGlobalPrefix(API_PREFIX, {
    exclude: [{ path: 'uploads/(.*)', method: RequestMethod.GET }],
  });

  // CORS — explicit whitelist in prod; permissive in dev if unset
  app.enableCors({
    origin: origins.length ? origins : isProd ? false : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  return { isProd, origins };
}
