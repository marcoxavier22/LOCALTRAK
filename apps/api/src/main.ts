import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const corsOrigins = config.get<string>('CORS_ORIGINS') ?? config.get<string>('CORS_ORIGIN');
  
  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8081',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:8081',
  ];

  let originOption: any = true;
  if (corsOrigins) {
    const allowed = corsOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    originOption = [...new Set([...allowed, ...devOrigins])];
  } else {
    originOption = [
      'https://localtrak-web.vercel.app',
      'https://localtrak-mobile.vercel.app',
      ...devOrigins,
    ];
  }

  app.use(helmet());
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
