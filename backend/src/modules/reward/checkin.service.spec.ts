import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { CheckinService } from './checkin.service';
import { RewardRepository } from './reward.repository';
import { WalletService } from '../wallet/wallet.service';

describe('CheckinService', () => {
  let service: CheckinService;
  let rewardRepo: Record<string, any>;
  let walletService: Record<string, any>;
  let events: Record<string, any>;

  const mockConfig = {
    id: 'config-1',
    name: 'Default',
    isEnabled: true,
    baseRewardAmount: 10,
    maxStreakDay: 30,
    rewardRules: [
      { id: 'r1', streakDay: 1, rewardAmount: 10, bonusMultiplier: 1, label: null },
      { id: 'r3', streakDay: 3, rewardAmount: 15, bonusMultiplier: 1, label: null },
      { id: 'r7', streakDay: 7, rewardAmount: 20, bonusMultiplier: 2, label: 'Weekly Bonus' },
      { id: 'r14', streakDay: 14, rewardAmount: 30, bonusMultiplier: 2, label: 'Bi-Weekly Bonus' },
      { id: 'r30', streakDay: 30, rewardAmount: 50, bonusMultiplier: 3, label: 'Monthly Jackpot' },
    ],
  };

  const today = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const yesterday = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d;
  })();

  beforeEach(async () => {
    rewardRepo = {
      getActiveConfig: jest.fn().mockResolvedValue(mockConfig),
      getTodayCheckin: jest.fn().mockResolvedValue(null),
      getLastCheckin: jest.fn().mockResolvedValue(null),
      createCheckin: jest.fn().mockResolvedValue({ id: 'checkin-1' }),
      getHistory: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };

    walletService = {
      creditWallet: jest.fn().mockResolvedValue({ walletBalance: 100, transaction: {} }),
    };

    events = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckinService,
        { provide: RewardRepository, useValue: rewardRepo },
        { provide: WalletService, useValue: walletService },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();

    service = module.get<CheckinService>(CheckinService);
  });

  // ─── checkin() ─────────────────────────────────────────────────────────────

  describe('checkin', () => {
    it('should perform first check-in (day 1)', async () => {
      const result = await service.checkin('user-1');

      expect(result.streakDay).toBe(1);
      expect(result.baseReward).toBe(10);
      expect(result.bonusAmount).toBe(0);
      expect(result.totalAmount).toBe(10);
      expect(result.walletBalance).toBe(100);
      expect(result.message).toMatch(/welcome back/i);
      expect(result.nextCheckinAt).toBeDefined();

      expect(walletService.creditWallet).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          amount: 10,
          type: TransactionType.CHECKIN_BONUS,
        }),
      );

      expect(events.emit).toHaveBeenCalledWith('reward.checkin', expect.any(Object));
    });

    it('should calculate streak day 2 when checked in yesterday', async () => {
      rewardRepo.getLastCheckin.mockResolvedValue({
        checkinDate: yesterday,
        streakDay: 1,
      });

      const result = await service.checkin('user-1');

      expect(result.streakDay).toBe(2);
    });

    it('should reset streak to 1 when a day is missed', async () => {
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      rewardRepo.getLastCheckin.mockResolvedValue({
        checkinDate: twoDaysAgo,
        streakDay: 5,
      });

      const result = await service.checkin('user-1');

      expect(result.streakDay).toBe(1);
    });

    it('should apply streak day 7 bonus rule (2x multiplier)', async () => {
      rewardRepo.getLastCheckin.mockResolvedValue({
        checkinDate: yesterday,
        streakDay: 6,
      });

      const result = await service.checkin('user-1');

      expect(result.streakDay).toBe(7);
      expect(result.baseReward).toBe(20);
      expect(result.bonusAmount).toBe(20); // 20 * (2-1) = 20
      expect(result.totalAmount).toBe(40);
      expect(result.message).toMatch(/weekly bonus/i);
    });

    it('should apply streak day 30 bonus rule (3x multiplier)', async () => {
      rewardRepo.getLastCheckin.mockResolvedValue({
        checkinDate: yesterday,
        streakDay: 29,
      });

      const result = await service.checkin('user-1');

      expect(result.streakDay).toBe(30);
      expect(result.baseReward).toBe(50);
      expect(result.bonusAmount).toBe(100); // 50 * (3-1) = 100
      expect(result.totalAmount).toBe(150);
      expect(result.message).toMatch(/monthly jackpot/i);
    });

    it('should reset streak back to 1 after max streak day', async () => {
      rewardRepo.getLastCheckin.mockResolvedValue({
        checkinDate: yesterday,
        streakDay: 30, // max
      });

      const result = await service.checkin('user-1');

      expect(result.streakDay).toBe(1);
    });

    it('should use fallback rule for days without exact match', async () => {
      // Day 5 — no exact rule, fallback to rule for day 3
      rewardRepo.getLastCheckin.mockResolvedValue({
        checkinDate: yesterday,
        streakDay: 4,
      });

      const result = await service.checkin('user-1');

      expect(result.streakDay).toBe(5);
      expect(result.baseReward).toBe(15); // from day 3 rule
    });

    it('should throw ConflictException if already checked in today', async () => {
      rewardRepo.getTodayCheckin.mockResolvedValue({ id: 'existing' });

      await expect(service.checkin('user-1')).rejects.toThrow(ConflictException);
      await expect(service.checkin('user-1')).rejects.toThrow('Already checked in today');
    });

    it('should throw BadRequestException if config is unavailable', async () => {
      rewardRepo.getActiveConfig.mockResolvedValue(null);

      await expect(service.checkin('user-1')).rejects.toThrow(BadRequestException);
      await expect(service.checkin('user-1')).rejects.toThrow('currently unavailable');
    });
  });

  // ─── getCheckinStatus() ───────────────────────────────────────────────────

  describe('getCheckinStatus', () => {
    it('should return status for a user who has not checked in today', async () => {
      const result = await service.getCheckinStatus('user-1');

      expect(result.hasCheckedInToday).toBe(false);
      expect(result.currentStreak).toBe(0);
      expect(result.nextReward).toBeDefined();
      expect(result.config.isEnabled).toBe(true);
      expect(result.config.rules).toHaveLength(5);
    });

    it('should show hasCheckedInToday=true after check-in', async () => {
      rewardRepo.getTodayCheckin.mockResolvedValue({ id: 'checkin-today' });
      rewardRepo.getLastCheckin.mockResolvedValue({
        checkinDate: today,
        streakDay: 3,
      });

      const result = await service.getCheckinStatus('user-1');

      expect(result.hasCheckedInToday).toBe(true);
      expect(result.currentStreak).toBe(3);
      expect(result.nextReward).toBeNull(); // already checked in
    });

    it('should return streak=0 if config is not available', async () => {
      rewardRepo.getActiveConfig.mockResolvedValue(null);

      const result = await service.getCheckinStatus('user-1');

      expect(result.nextReward).toBeNull();
      expect(result.config.isEnabled).toBe(false);
    });
  });

  // ─── getHistory() ─────────────────────────────────────────────────────────

  describe('getHistory', () => {
    it('should return paginated history', async () => {
      rewardRepo.getHistory.mockResolvedValue({
        data: [{ id: 'h1', streakDay: 1, totalAmount: 10 }],
        total: 1,
      });

      const result = await service.getHistory('user-1', 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ page: 1, limit: 10, total: 1 });
      expect(rewardRepo.getHistory).toHaveBeenCalledWith({
        userId: 'user-1',
        page: 1,
        limit: 10,
      });
    });
  });
});
