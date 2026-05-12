import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { getPrismaSkip } from '../../common/types/pagination.types';

@Injectable()
export class RewardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveConfig() {
    return this.prisma.checkinConfig.findFirst({
      where: { isEnabled: true },
      include: {
        rewardRules: { where: { isActive: true }, orderBy: { streakDay: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTodayCheckin(userId: string, today: Date) {
    return this.prisma.checkinHistory.findUnique({
      where: { userId_checkinDate: { userId, checkinDate: today } },
    });
  }

  async getLastCheckin(userId: string) {
    return this.prisma.checkinHistory.findFirst({
      where: { userId },
      orderBy: { checkinDate: 'desc' },
    });
  }

  async createCheckin(data: {
    userId: string;
    checkinDate: Date;
    streakDay: number;
    baseReward: number;
    bonusAmount: number;
    totalAmount: number;
    configId: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.checkinHistory.create({ data: data as any });
  }

  async getHistory(params: { userId: string; page: number; limit: number }) {
    const where = { userId: params.userId };
    const [total, data] = await Promise.all([
      this.prisma.checkinHistory.count({ where }),
      this.prisma.checkinHistory.findMany({
        where,
        skip: getPrismaSkip(params.page, params.limit),
        take: params.limit,
        orderBy: { checkinDate: 'desc' },
      }),
    ]);
    return { data, total };
  }

  async upsertConfig(data: {
    name: string;
    baseRewardAmount: number;
    resetOnMissedDay: boolean;
    maxStreakDay: number;
  }) {
    // Deactivate all existing configs, create new one
    await this.prisma.checkinConfig.updateMany({ data: { isEnabled: false } });
    return this.prisma.checkinConfig.create({ data: { ...data, isEnabled: true } });
  }

  async upsertRewardRule(configId: string, rule: {
    streakDay: number;
    rewardAmount: number;
    bonusMultiplier: number;
    label?: string;
  }) {
    return this.prisma.rewardRule.upsert({
      where: { configId_streakDay: { configId, streakDay: rule.streakDay } },
      create: { configId, ...rule },
      update: rule,
    });
  }

  async getAnalytics(from: Date, to: Date) {
    return this.prisma.checkinHistory.groupBy({
      by: ['checkinDate'],
      where: { checkinDate: { gte: from, lte: to } },
      _count: { _all: true },
      _sum: { totalAmount: true },
      orderBy: { checkinDate: 'asc' },
    });
  }
}
