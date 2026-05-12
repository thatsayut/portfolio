import { Module } from '@nestjs/common';
import { RewardController } from './reward.controller';
import { CheckinService } from './checkin.service';
import { RewardRepository } from './reward.repository';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [RewardController],
  providers: [CheckinService, RewardRepository],
  exports: [CheckinService, RewardRepository],
})
export class RewardModule {}
