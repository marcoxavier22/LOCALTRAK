import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const corsOrigins = config.get<string>('CORS_ORIGINS') ?? config.get<string>('CORS_ORIGIN');
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  const productionOrigins = [
    'https://localtrak-web.vercel.app',
    'https://localtrak-mobile.vercel.app',
    'https://trakflow-web.vercel.app',
    'https://trakflow.vercel.app',
  ];
  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8081',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:8081',
  ];

  let originOption: string[] = productionOrigins;
  if (corsOrigins) {
    const allowed = corsOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    originOption = [...new Set([...allowed, ...productionOrigins, ...(isProduction ? [] : devOrigins)])];
  } else if (!isProduction) {
    originOption = [...productionOrigins, ...devOrigins];
  }

  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(helmet());
  app.use(json({ limit: config.get<string>('JSON_BODY_LIMIT') ?? '8mb' }));
  app.use(urlencoded({ extended: true, limit: config.get<string>('JSON_BODY_LIMIT') ?? '8mb' }));
  app.enableCors({
    origin: originOption,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(config.get<string>('PORT') ?? process.env.PORT ?? 3333);
  await app.listen(port);
}

void bootstrap();
