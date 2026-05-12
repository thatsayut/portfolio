import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { Prisma, TransactionType, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { getPrismaSkip } from '../../common/types/pagination.types';

export interface CreditWalletParams {
  userId: string;
  amount: number;
  type: TransactionType;
  reference: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class WalletRepository {
  private readonly logger = new Logger(WalletRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    return this.prisma.wallet.findUniqueOrThrow({ where: { userId } });
  }

  /**
   * Credits a wallet with full transaction safety:
   * 1. Idempotency — rejects duplicate references before any write
   * 2. Row-level lock — SELECT FOR UPDATE on the wallet row
   * 3. DB transaction — atomic balance update + transaction record
   */
  async creditWallet(params: CreditWalletParams) {
    const { userId, amount, type, reference, description, metadata } = params;

    return this.prisma.$transaction(
      async (tx) => {
        // Layer 1: Idempotency check inside the transaction
        const existing = await tx.walletTransaction.findUnique({ where: { reference } });
        if (existing) {
          this.logger.warn(`Duplicate wallet credit blocked: reference=${reference}`);
          throw new ConflictException(`Transaction ${reference} already processed`);
        }

        // Layer 3: Row-level lock — prevent concurrent balance reads on this wallet
        const wallet = await tx.$queryRaw<{ id: string; balance: Prisma.Decimal; version: number }[]>`
          SELECT id, balance, version FROM wallets WHERE "userId" = ${userId} FOR UPDATE
        `;

        if (!wallet[0]) throw new Error(`Wallet not found for user ${userId}`);

        const { id: walletId, balance: currentBalance, version } = wallet[0];
        const balanceBefore = Number(currentBalance);
        const balanceAfter = balanceBefore + amount;

        if (balanceAfter < 0) {
          throw new ConflictException('Insufficient wallet balance');
        }

        // Layer 2: Atomic update — balance + version increment (optimistic locking signal)
        await tx.wallet.update({
          where: { id: walletId, version },
          data: {
            balance: balanceAfter,
            totalEarned: amount > 0 ? { increment: amount } : undefined,
            totalSpent: amount < 0 ? { increment: Math.abs(amount) } : undefined,
            version: { increment: 1 },
          },
        });

        const transaction = await tx.walletTransaction.create({
          data: {
            walletId,
            userId,
            type,
            amount,
            balanceBefore,
            balanceAfter,
            reference,
            description,
            metadata: metadata as Prisma.InputJsonValue,
            status: TransactionStatus.COMPLETED,
          },
        });

        return { transaction, walletBalance: balanceAfter };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 5000,
        timeout: 10000,
      },
    );
  }

  async getTransactions(params: {
    userId: string;
    page: number;
    limit: number;
    type?: TransactionType;
  }) {
    const where: Prisma.WalletTransactionWhereInput = { userId: params.userId };
    if (params.type) where.type = params.type;

    const [total, data] = await Promise.all([
      this.prisma.walletTransaction.count({ where }),
      this.prisma.walletTransaction.findMany({
        where,
        skip: getPrismaSkip(params.page, params.limit),
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { data, total };
  }
}
