import {
  Injectable,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import { TransactionType } from '@prisma/client';
import { RewardRepository } from './reward.repository';
import { WalletService } from '../wallet/wallet.service';
import { paginate } from '../../common/types/pagination.types';

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    private readonly rewardRepo: RewardRepository,
    private readonly walletService: WalletService,
    private readonly events: EventEmitter2,
  ) {}

  async checkin(userId: string) {
    const config = await this.rewardRepo.getActiveConfig();
    if (!config) throw new BadRequestException('Check-in system is currently unavailable');

    const today = this.getToday();

    const alreadyCheckedIn = await this.rewardRepo.getTodayCheckin(userId, today);
    if (alreadyCheckedIn) {
      throw new ConflictException('Already checked in today');
    }

    const streakDay = await this.calculateStreakDay(userId, config);
    const { baseReward, bonusAmount, rule } = this.calculateReward(config, streakDay);
    const totalAmount = baseReward + bonusAmount;
    const reference = `checkin:${userId}:${today.toISOString().split('T')[0]}:${uuidv4()}`;

    const [checkin, walletResult] = await Promise.all([
      this.rewardRepo.createCheckin({
        userId,
        checkinDate: today,
        streakDay,
        baseReward,
        bonusAmount,
        totalAmount,
        configId: config.id,
        metadata: { ruleId: rule?.id, ruleName: rule?.label },
      }),
      this.walletService.creditWallet({
        userId,
        amount: totalAmount,
        type: TransactionType.CHECKIN_BONUS,
        reference,
        description: `Day ${streakDay} check-in reward${rule?.label ? ` — ${rule.label}` : ''}`,
        metadata: { streakDay, baseReward, bonusAmount, configId: config.id },
      }),
    ]);

    const message = this.buildCheckinMessage(streakDay, rule?.label);

    this.events.emit('reward.checkin', {
      userId,
      streakDay,
      totalAmount,
      walletBalance: walletResult.walletBalance,
    });

    this.logger.log(`User ${userId} checked in — day ${streakDay}, reward ${totalAmount}`);

    return {
      streakDay,
      baseReward,
      bonusAmount,
      totalAmount,
      walletBalance: walletResult.walletBalance,
      message,
      nextCheckinAt: this.getNextCheckinTime(),
    };
  }

  async getCheckinStatus(userId: string) {
    const config = await this.rewardRepo.getActiveConfig();
    const today = this.getToday();
    const [todayCheckin, lastCheckin] = await Promise.all([
      this.rewardRepo.getTodayCheckin(userId, today),
      this.rewardRepo.getLastCheckin(userId),
    ]);

    const hasCheckedInToday = !!todayCheckin;
    const currentStreak = lastCheckin ? await this.resolveStreakDay(userId) : 0;
    const nextReward = config
      ? this.calculateReward(config, (currentStreak % (config.maxStreakDay || 30)) + 1)
      : null;

    return {
      hasCheckedInToday,
      currentStreak,
      todayCheckin,
      nextReward: hasCheckedInToday ? null : nextReward,
      nextCheckinAt: this.getNextCheckinTime(),
      config: {
        isEnabled: config?.isEnabled ?? false,
        rules: config?.rewardRules ?? [],
      },
    };
  }

  async getHistory(userId: string, page: number, limit: number) {
    const { data, total } = await this.rewardRepo.getHistory({ userId, page, limit });
    return paginate(data, total, page, limit);
  }

  // Runs at midnight every day to process streak validations
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processStreakValidation() {
    this.logger.log('Running streak validation cron...');
    this.events.emit('reward.streakValidation', { timestamp: new Date() });
  }

  private async calculateStreakDay(userId: string, config: any): Promise<number> {
    const lastCheckin = await this.rewardRepo.getLastCheckin(userId);
    if (!lastCheckin) return 1;

    const today = this.getToday();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastDate = new Date(lastCheckin.checkinDate);
    lastDate.setHours(0, 0, 0, 0);

    const isConsecutive = lastDate.getTime() === yesterday.getTime();

    if (!isConsecutive) {
      return 1; // streak broken
    }

    const nextDay = lastCheckin.streakDay + 1;
    return nextDay > config.maxStreakDay ? 1 : nextDay;
  }

  private async resolveStreakDay(userId: string): Promise<number> {
    const lastCheckin = await this.rewardRepo.getLastCheckin(userId);
    if (!lastCheckin) return 0;

    const today = this.getToday();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastDate = new Date(lastCheckin.checkinDate);
    lastDate.setHours(0, 0, 0, 0);

    if (lastDate >= yesterday) return lastCheckin.streakDay;
    return 0;
  }

  private calculateReward(config: any, streakDay: number) {
    // Find the most specific rule for this streak day (exact match, then closest lower)
    const rules: any[] = config.rewardRules ?? [];
    const exactRule = rules.find((r) => r.streakDay === streakDay);
    const fallbackRule = rules
      .filter((r) => r.streakDay <= streakDay)
      .sort((a, b) => b.streakDay - a.streakDay)[0];

    const rule = exactRule ?? fallbackRule;

    if (!rule) {
      return { baseReward: Number(config.baseRewardAmount), bonusAmount: 0, rule: null };
    }

    const baseReward = Number(rule.rewardAmount);
    const multiplier = Number(rule.bonusMultiplier);
    const bonusAmount = multiplier > 1 ? Math.round(baseReward * (multiplier - 1)) : 0;

    return { baseReward, bonusAmount, rule };
  }

  private buildCheckinMessage(streakDay: number, ruleLabel?: string | null): string {
    if (ruleLabel) return `${ruleLabel} unlocked! Day ${streakDay} complete.`;
    if (streakDay === 1) return 'Welcome back! Check-in complete.';
    return `Day ${streakDay} streak — keep it up!`;
  }

  private getToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getNextCheckinTime(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}
