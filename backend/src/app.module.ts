import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { RewardModule } from './modules/reward/reward.module';
import { BonusModule } from './modules/bonus/bonus.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { HealthModule } from './modules/health/health.module';
import { LuckyDrawModule } from './modules/lucky-draw/lucky-draw.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig],
      envFilePath: ['.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('app.throttleTtl', 60000),
            limit: config.get<number>('app.throttleLimit', 100),
          },
        ],
      }),
    }),

    // Event bus
    EventEmitterModule.forRoot({ wildcard: true, maxListeners: 20 }),

    // Cron scheduler
    ScheduleModule.forRoot(),

    // Redis cache
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisUrl = new URL(config.get<string>('app.redisUrl') ?? 'redis://localhost:6379');
        const useTls = redisUrl.protocol === 'rediss:';
        return {
          store: await redisStore({
            host: redisUrl.hostname,
            port: parseInt(redisUrl.port || (useTls ? '6380' : '6379'), 10),
            password: redisUrl.password || undefined,
            db: redisUrl.pathname ? parseInt(redisUrl.pathname.slice(1) || '0', 10) : 0,
            ttl: config.get<number>('app.cacheTtl', 300),
            ...(useTls ? { tls: { rejectUnauthorized: false } } : {}),
          }),
        };
      },
    }),

    // BullMQ
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(config.get<string>('app.redisUrl') ?? 'redis://localhost:6379');
        const useTls = redisUrl.protocol === 'rediss:';
        return {
          connection: {
            host: redisUrl.hostname,
            port: parseInt(redisUrl.port || (useTls ? '6380' : '6379'), 10),
            password: redisUrl.password || undefined,
            db: redisUrl.pathname ? parseInt(redisUrl.pathname.slice(1) || '0', 10) : 0,
            ...(useTls ? { tls: { rejectUnauthorized: false } } : {}),
            maxRetriesPerRequest: null,
          },
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
          },
        };
      },
    }),

    DatabaseModule,
    AuthModule,
    UsersModule,
    WalletModule,
    RewardModule,
    BonusModule,
    AdminModule,
    NotificationModule,
    AuditLogModule,
    HealthModule,
    LuckyDrawModule,
  ],
})
export class AppModule {}
