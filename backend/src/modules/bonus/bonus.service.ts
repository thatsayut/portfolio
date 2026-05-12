import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { BONUS_QUEUE, BONUS_JOB_DISTRIBUTE } from './bonus.constants';
import { paginate, getPrismaSkip } from '../../common/types/pagination.types';

const DISTRIBUTION_BATCH_SIZE = 500;

@Injectable()
export class BonusService {
  private readonly logger = new Logger(BonusService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(BONUS_QUEUE) private readonly bonusQueue: Queue,
  ) {}

  async createCampaign(dto: CreateCampaignDto, createdById: string) {
    return this.prisma.bonusCampaign.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        amount: dto.amount,
        multiplier: dto.multiplier ?? 1,
        maxRecipients: dto.maxRecipients,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        createdById,
      },
    });
  }

  async activateCampaign(campaignId: string) {
    const campaign = await this.prisma.bonusCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.processedAt) throw new BadRequestException('Campaign already distributed');

    await this.prisma.bonusCampaign.update({
      where: { id: campaignId },
      data: { isActive: true },
    });

    // Enqueue distribution jobs in batches
    const totalUsers = await this.prisma.user.count({ where: { status: 'ACTIVE' } });
    const limit = campaign.maxRecipients
      ? Math.min(totalUsers, campaign.maxRecipients)
      : totalUsers;

    const batches = Math.ceil(limit / DISTRIBUTION_BATCH_SIZE);
    this.logger.log(`Enqueuing ${batches} distribution batches for campaign "${campaign.name}"`);

    for (let i = 0; i < batches; i++) {
      await this.bonusQueue.add(
        BONUS_JOB_DISTRIBUTE,
        {
          campaignId: campaign.id,
          campaignName: campaign.name,
          amount: Number(campaign.amount),
          batchOffset: i * DISTRIBUTION_BATCH_SIZE,
          batchSize: DISTRIBUTION_BATCH_SIZE,
        },
        {
          delay: i * 500, // stagger batches
          priority: 1,
        },
      );
    }

    await this.prisma.bonusCampaign.update({
      where: { id: campaignId },
      data: { processedAt: new Date() },
    });

    return { message: `Distribution queued in ${batches} batches for ${limit} users` };
  }

  async deactivateCampaign(campaignId: string) {
    const campaign = await this.prisma.bonusCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    return this.prisma.bonusCampaign.update({
      where: { id: campaignId },
      data: { isActive: false },
    });
  }

  async findAll(page: number, limit: number) {
    const [total, data] = await Promise.all([
      this.prisma.bonusCampaign.count(),
      this.prisma.bonusCampaign.findMany({
        skip: getPrismaSkip(page, limit),
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, username: true } } },
      }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findById(id: string) {
    const campaign = await this.prisma.bonusCampaign.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, username: true } } },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.bonusQueue.getWaitingCount(),
      this.bonusQueue.getActiveCount(),
      this.bonusQueue.getCompletedCount(),
      this.bonusQueue.getFailedCount(),
    ]);
    return { waiting, active, completed, failed };
  }
}
