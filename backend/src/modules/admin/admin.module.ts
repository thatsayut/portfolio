import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { RewardModule } from '../reward/reward.module';

@Module({
  imports: [UsersModule, RewardModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
