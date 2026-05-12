import { apiClient } from './api.client';
import type { ApiResponse, Wallet, PaginatedResult, WalletTransaction } from '@/types/api.types';

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  return data.data;
}

export const walletService = {
  getWallet: () => unwrap<Wallet>(apiClient.get('/wallet')),

  getTransactions: (page = 1, limit = 20) =>
    unwrap<PaginatedResult<WalletTransaction>>(
      apiClient.get('/wallet/transactions', { params: { page, limit } }),
    ),
};
