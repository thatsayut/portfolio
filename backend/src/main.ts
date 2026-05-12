import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port', 4000);
  const prefix = config.get<string>('app.prefix', 'api');

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // CORS — support Vercel preview URLs + production
  const clientUrl = config.get<string>('app.clientUrl', 'http://localhost:3000');
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, health checks)
      if (!origin) return callback(null, true);
      // Allow exact match
      if (origin === clientUrl) return callback(null, true);
      // Allow Vercel preview deployments (*.vercel.app)
      if (/\.vercel\.app$/.test(origin)) return callback(null, true);
      // Allow localhost in development
      if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // API prefix + versioning
  app.setGlobalPrefix(prefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global interceptors
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
    new ResponseInterceptor(),
    new LoggingInterceptor(),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger — only in non-production
  if (config.get('app.env') !== 'production') {
    const swagger = new DocumentBuilder()
      .setTitle('Reward Platform API')
      .setDescription('Enterprise-grade reward and check-in platform')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('reward', 'Check-in and reward system')
      .addTag('wallet', 'Wallet and transactions')
      .addTag('bonus', 'Bonus campaigns')
      .addTag('admin', 'Admin management')
      .addTag('notification', 'Notifications')
      .build();

    const document = SwaggerModule.createDocument(app, swagger);
    SwaggerModule.setup(`${prefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}/${prefix}/v1`);
  console.log(`📚 Swagger at  http://localhost:${port}/${prefix}/docs`);
}

bootstrap();
