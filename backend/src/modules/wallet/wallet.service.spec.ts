import { Test, TestingModule } from '@nestjs/testing';
import { TransactionType } from '@prisma/client';
import { WalletService } from './wallet.service';
import { WalletRepository } from './wallet.repository';

describe('WalletService', () => {
  let service: WalletService;
  let repo: Record<string, any>;

  const mockWallet = {
    id: 'wallet-1',
    userId: 'user-1',
    balance: '150.00',
    totalEarned: '200.00',
    totalSpent: '50.00',
    version: 3,
  };

  const mockTransaction = {
    id: 'tx-1',
    walletId: 'wallet-1',
    userId: 'user-1',
    type: TransactionType.CHECKIN_BONUS,
    amount: 10,
    balanceBefore: 140,
    balanceAfter: 150,
    reference: 'checkin:user-1:2026-01-01',
    status: 'COMPLETED',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    repo = {
      getWallet: jest.fn().mockResolvedValue(mockWallet),
      creditWallet: jest.fn().mockResolvedValue({ transaction: mockTransaction, walletBalance: 150 }),
      getTransactions: jest.fn().mockResolvedValue({
        data: [mockTransaction],
        total: 1,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: WalletRepository, useValue: repo },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  // ─── getWallet ─────────────────────────────────────────────────────────────

  describe('getWallet', () => {
    it('should return wallet data for the user', async () => {
      const result = await service.getWallet('user-1');

      expect(result).toEqual(mockWallet);
      expect(repo.getWallet).toHaveBeenCalledWith('user-1');
    });
  });

  // ─── creditWallet ──────────────────────────────────────────────────────────

  describe('creditWallet', () => {
    it('should delegate to repo with correct params', async () => {
      const params = {
        userId: 'user-1',
        amount: 25,
        type: TransactionType.CHECKIN_BONUS,
        reference: 'ref-123',
        description: 'Test credit',
      };

      const result = await service.creditWallet(params);

      expect(result.walletBalance).toBe(150);
      expect(repo.creditWallet).toHaveBeenCalledWith(params);
    });
  });

  // ─── debitWallet ───────────────────────────────────────────────────────────

  describe('debitWallet', () => {
    it('should convert amount to negative before calling repo', async () => {
      const params = {
        userId: 'user-1',
        amount: 30,
        type: TransactionType.PENALTY,
        reference: 'debit-123',
      };

      await service.debitWallet(params);

      expect(repo.creditWallet).toHaveBeenCalledWith(
        expect.objectContaining({ amount: -30 }),
      );
    });

    it('should handle already negative amount', async () => {
      const params = {
        userId: 'user-1',
        amount: -30,
        type: TransactionType.PENALTY,
        reference: 'debit-456',
      };

      await service.debitWallet(params);

      // Math.abs(-30) = 30, then -30
      expect(repo.creditWallet).toHaveBeenCalledWith(
        expect.objectContaining({ amount: -30 }),
      );
    });
  });

  // ─── getTransactions ──────────────────────────────────────────────────────

  describe('getTransactions', () => {
    it('should return paginated transactions', async () => {
      const result = await service.getTransactions({
        userId: 'user-1',
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ page: 1, limit: 10, total: 1 });
    });

    it('should pass type filter to repo', async () => {
      await service.getTransactions({
        userId: 'user-1',
        page: 1,
        limit: 10,
        type: TransactionType.CHECKIN_BONUS,
      });

      expect(repo.getTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ type: TransactionType.CHECKIN_BONUS }),
      );
    });
  });
});
