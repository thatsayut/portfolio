import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TransactionType, UserStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { BONUS_QUEUE, BONUS_JOB_DISTRIBUTE } from './bonus.constants';
import { WalletService } from '../wallet/wallet.service';
import { PrismaService } from '../../database/prisma.service';

interface DistributeCampaignPayload {
  campaignId: string;
  campaignName: string;
  amount: number;
  batchOffset: number;
  batchSize: number;
}

@Processor(BONUS_QUEUE)
export class BonusProcessor extends WorkerHost {
  private readonly logger = new Logger(BonusProcessor.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<DistributeCampaignPayload>): Promise<void> {
    if (job.name === BONUS_JOB_DISTRIBUTE) {
      await this.distributeBatch(job);
    }
  }

  private async distributeBatch(job: Job<DistributeCampaignPayload>) {
    const { campaignId, campaignName, amount, batchOffset, batchSize } = job.data;

    const users = await this.prisma.user.findMany({
      where: { status: UserStatus.ACTIVE },
      select: { id: true },
      skip: batchOffset,
      take: batchSize,
    });

    this.logger.log(
      `Processing campaign "${campaignName}" — batch offset=${batchOffset}, users=${users.length}`,
    );

    const results = await Promise.allSettled(
      users.map((user) =>
        this.walletService.creditWallet({
          userId: user.id,
          amount,
          type: TransactionType.ADMIN_BONUS,
          reference: `bonus:${campaignId}:${user.id}:${uuidv4()}`,
          description: `Bonus campaign: ${campaignName}`,
          metadata: { campaignId },
        }),
      ),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.log(
      `Campaign "${campaignName}" batch done — ✅ ${succeeded} succeeded, ❌ ${failed} failed`,
    );

    await job.updateProgress(100);
  }
}
