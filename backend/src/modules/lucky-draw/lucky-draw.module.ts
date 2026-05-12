import { Module } from '@nestjs/common';
import { LuckyDrawController } from './lucky-draw.controller';
import { LuckyDrawService } from './lucky-draw.service';
import { LuckyDrawRepository } from './lucky-draw.repository';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [LuckyDrawController],
  providers: [LuckyDrawService, LuckyDrawRepository],
  exports: [LuckyDrawService],
})
export class LuckyDrawModule {}
