import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BonusController } from './bonus.controller';
import { BonusService } from './bonus.service';
import { BonusProcessor } from './bonus.processor';
import { WalletModule } from '../wallet/wallet.module';
import { BONUS_QUEUE } from './bonus.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: BONUS_QUEUE }),
    WalletModule,
  ],
  controllers: [BonusController],
  providers: [BonusService, BonusProcessor],
  exports: [BonusService],
})
export class BonusModule {}
