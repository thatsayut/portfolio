import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  prefix: process.env.API_PREFIX ?? 'api',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  cacheTtl: parseInt(process.env.CACHE_TTL ?? '300', 10),
  throttleTtl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
  throttleLimit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE ?? '5242880', 10),
}));
