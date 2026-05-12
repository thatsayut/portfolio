import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { WalletRepository, CreditWalletParams } from './wallet.repository';
import { paginate } from '../../common/types/pagination.types';

@Injectable()
export class WalletService {
  constructor(private readonly walletRepo: WalletRepository) {}

  async getWallet(userId: string) {
    return this.walletRepo.getWallet(userId);
  }

  async creditWallet(params: CreditWalletParams) {
    return this.walletRepo.creditWallet(params);
  }

  async debitWallet(params: Omit<CreditWalletParams, 'amount'> & { amount: number }) {
    return this.walletRepo.creditWallet({ ...params, amount: -Math.abs(params.amount) });
  }

  async getTransactions(params: {
    userId: string;
    page: number;
    limit: number;
    type?: TransactionType;
  }) {
    const { data, total } = await this.walletRepo.getTransactions(params);
    return paginate(data, total, params.page, params.limit);
  }
}
