'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { walletService } from '@/services/wallet.service';
import { QUERY_KEYS } from '@/constants/query-keys';
import { formatCoins, formatDateTime, formatTransactionType } from '@/utils/format';
import type { TransactionType } from '@/types/api.types';

const TYPE_COLORS: Record<TransactionType, string> = {
  CHECKIN_BONUS: 'text-blue-500',
  ADMIN_BONUS: 'text-purple-500',
  SYSTEM_REWARD: 'text-green-500',
  PENALTY: 'text-destructive',
  REFERRAL_BONUS: 'text-orange-500',
  MILESTONE_BONUS: 'text-yellow-500',
};

export default function WalletPage() {
  const [page, setPage] = useState(1);

  const { data: wallet } = useQuery({
    queryKey: QUERY_KEYS.WALLET,
    queryFn: walletService.getWallet,
  });

  const { data: txs, isLoading } = useQuery({
    queryKey: QUERY_KEYS.TRANSACTIONS(page),
    queryFn: () => walletService.getTransactions(page, 20),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
        <p className="text-muted-foreground mt-1">Your balance and transaction history</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Available Balance', value: Number(wallet?.balance ?? 0), icon: '💰', accent: true },
          { label: 'Total Earned', value: Number(wallet?.totalEarned ?? 0), icon: '🏆', accent: false },
          { label: 'Total Spent', value: Number(wallet?.totalSpent ?? 0), icon: '📤', accent: false },
        ].map(({ label, value, icon, accent }) => (
          <div
            key={label}
            className={`rounded-xl p-6 border ${accent ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className={`text-sm font-medium ${accent ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {label}
              </span>
              <span className="text-xl">{icon}</span>
            </div>
            <p className="text-3xl font-bold">{formatCoins(value)}</p>
            <p className={`text-xs mt-1 ${accent ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>coins</p>
          </div>
        ))}
      </div>

      {/* Transaction Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Transaction History</h3>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : !txs?.data.length ? (
          <div className="p-8 text-center text-muted-foreground">No transactions yet</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['Date', 'Type', 'Description', 'Amount', 'Balance After'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {txs.data.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30 transition">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDateTime(tx.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium text-xs ${TYPE_COLORS[tx.type] ?? 'text-foreground'}`}>
                        {formatTransactionType(tx.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground max-w-xs truncate">
                      {tx.description ?? '—'}
                    </td>
                    <td className={`px-4 py-3 font-bold ${Number(tx.amount) > 0 ? 'text-green-500' : 'text-destructive'}`}>
                      {Number(tx.amount) > 0 ? '+' : ''}{formatCoins(Number(tx.amount))}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {formatCoins(Number(tx.balanceAfter))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {txs.meta.totalPages > 1 && (
              <div className="px-5 py-4 border-t border-border flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {txs.meta.total} transactions · Page {page} of {txs.meta.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={!txs.meta.hasPreviousPage}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-50 hover:bg-muted transition"
                  >
                    Previous
                  </button>
                  <button
                    disabled={!txs.meta.hasNextPage}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-50 hover:bg-muted transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
