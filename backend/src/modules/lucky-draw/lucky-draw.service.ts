import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransactionType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { LuckyDrawRepository } from './lucky-draw.repository';
import { WalletService } from '../wallet/wallet.service';
import { paginate } from '../../common/types/pagination.types';

@Injectable()
export class LuckyDrawService {
  private readonly logger = new Logger(LuckyDrawService.name);

  constructor(
    private readonly repo: LuckyDrawRepository,
    private readonly walletService: WalletService,
    private readonly events: EventEmitter2,
  ) {}

  async spin(userId: string) {
    const config = await this.repo.getActiveConfig();
    if (!config || !config.isEnabled) {
      throw new BadRequestException('Lucky Draw is currently unavailable');
    }

    const activeSlots = config.slots.filter((s) => s.isActive);
    if (activeSlots.length < 2) {
      throw new BadRequestException('Not enough slots configured');
    }

    // Check daily spin limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const spinsToday = await this.repo.getTodaySpinCount(userId, today);

    if (spinsToday >= config.maxSpinsPerDay) {
      throw new ConflictException(
        `Daily spin limit reached (${config.maxSpinsPerDay} per day)`,
      );
    }

    // Deduct cost if applicable
    const cost = Number(config.costPerSpin);
    if (cost > 0) {
      try {
        await this.walletService.debitWallet({
          userId,
          amount: cost,
          type: TransactionType.LUCKY_DRAW,
          reference: `luckydraw:cost:${userId}:${uuidv4()}`,
          description: 'Lucky Draw spin cost',
        });
      } catch {
        throw new BadRequestException('Insufficient balance to spin');
      }
    }

    // Weighted random selection
    const winningSlot = this.weightedRandom(activeSlots);
    const rewardAmount = Number(winningSlot.rewardAmount);

    // Record spin
    await this.repo.createSpinRecord({
      userId,
      configId: config.id,
      slotId: winningSlot.id,
      rewardAmount,
    });

    // Credit reward to wallet
    let walletBalance = 0;
    if (rewardAmount > 0) {
      const result = await this.walletService.creditWallet({
        userId,
        amount: rewardAmount,
        type: TransactionType.LUCKY_DRAW,
        reference: `luckydraw:win:${userId}:${uuidv4()}`,
        description: `Lucky Draw — ${winningSlot.label}`,
        metadata: { slotId: winningSlot.id, configId: config.id },
      });
      walletBalance = result.walletBalance;
    } else {
      const wallet = await this.walletService.getWallet(userId);
      walletBalance = Number(wallet.balance);
    }

    this.events.emit('luckydraw.spin', {
      userId,
      slotId: winningSlot.id,
      rewardAmount,
    });

    this.logger.log(
      `User ${userId} spun lucky draw — won "${winningSlot.label}" (${rewardAmount} coins)`,
    );

    return {
      slot: {
        id: winningSlot.id,
        label: winningSlot.label,
        rewardAmount,
        color: winningSlot.color,
        position: winningSlot.position,
      },
      rewardAmount,
      walletBalance,
      spinsRemaining: config.maxSpinsPerDay - spinsToday - 1,
      message:
        rewardAmount > 0
          ? `You won ${rewardAmount} coins — ${winningSlot.label}!`
          : `${winningSlot.label} — better luck next time!`,
    };
  }

  async getWheelConfig(userId: string) {
    const config = await this.repo.getActiveConfig();
    if (!config) {
      return { isEnabled: false, slots: [], spinsRemaining: 0, maxSpinsPerDay: 0, costPerSpin: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const spinsToday = await this.repo.getTodaySpinCount(userId, today);

    return {
      isEnabled: config.isEnabled,
      costPerSpin: Number(config.costPerSpin),
      maxSpinsPerDay: config.maxSpinsPerDay,
      spinsRemaining: Math.max(0, config.maxSpinsPerDay - spinsToday),
      slots: config.slots
        .filter((s) => s.isActive)
        .map((s) => ({
          id: s.id,
          label: s.label,
          rewardAmount: Number(s.rewardAmount),
          color: s.color,
          position: s.position,
        })),
    };
  }

  async getHistory(userId: string, page: number, limit: number) {
    const { data, total } = await this.repo.getHistory({ userId, page, limit });
    return paginate(data, total, page, limit);
  }

  // ─── Admin ─────────────────────────────────────────────────────

  async getAdminConfig() {
    const config = await this.repo.getActiveConfig();
    if (!config) return null;

    return {
      id: config.id,
      name: config.name,
      isEnabled: config.isEnabled,
      costPerSpin: Number(config.costPerSpin),
      maxSpinsPerDay: config.maxSpinsPerDay,
      slots: config.slots.map((s) => ({
        id: s.id,
        label: s.label,
        rewardAmount: Number(s.rewardAmount),
        weight: s.weight,
        color: s.color,
        position: s.position,
        isActive: s.isActive,
      })),
    };
  }

  async updateAdminConfig(data: {
    name?: string;
    isEnabled?: boolean;
    costPerSpin?: number;
    maxSpinsPerDay?: number;
  }) {
    const config = await this.repo.getActiveConfig();
    if (!config) {
      return this.repo.upsertConfig({
        name: data.name ?? 'Default Wheel',
        isEnabled: data.isEnabled ?? true,
        costPerSpin: data.costPerSpin ?? 0,
        maxSpinsPerDay: data.maxSpinsPerDay ?? 3,
      });
    }
    return this.repo.updateConfig(config.id, data);
  }

  async saveSlots(
    slots: Array<{
      id?: string;
      label: string;
      rewardAmount: number;
      weight: number;
      color: string;
      position: number;
      isActive?: boolean;
    }>,
  ) {
    const config = await this.repo.getActiveConfig();
    if (!config) throw new BadRequestException('Create a config first');

    const normalized = slots.map((s) => ({ ...s, isActive: s.isActive ?? true }));
    await this.repo.bulkUpsertSlots(config.id, normalized);
    return this.repo.getConfigById(config.id);
  }

  async deleteSlot(slotId: string) {
    return this.repo.deleteSlot(slotId);
  }

  // ─── Private ───────────────────────────────────────────────────

  private weightedRandom(slots: Array<{ id: string; weight: number; [k: string]: any }>) {
    const totalWeight = slots.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;

    for (const slot of slots) {
      random -= slot.weight;
      if (random <= 0) return slot;
    }

    return slots[slots.length - 1]; // fallback
  }
}
