'use client';

import { useQuery } from '@tanstack/react-query';
import { walletService } from '@/services/wallet.service';
import { rewardService } from '@/services/reward.service';
import { useAuthStore } from '@/stores/auth.store';
import { QUERY_KEYS } from '@/constants/query-keys';
import { formatCoins, formatDateTime } from '@/utils/format';

function StatCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: string;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function StreakCalendar({ streak }: { streak: number }) {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-foreground mb-4">Streak Calendar (30 Days)</h3>
      <div className="grid grid-cols-10 gap-1.5">
        {days.map((day) => (
          <div
            key={day}
            title={`Day ${day}`}
            className={`h-6 w-full rounded text-xs flex items-center justify-center font-medium ${
              day <= streak
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: QUERY_KEYS.WALLET,
    queryFn: walletService.getWallet,
  });

  const { data: checkinStatus } = useQuery({
    queryKey: QUERY_KEYS.CHECKIN_STATUS,
    queryFn: rewardService.getStatus,
  });

  const { data: txs } = useQuery({
    queryKey: QUERY_KEYS.TRANSACTIONS(1),
    queryFn: () => walletService.getTransactions(1, 5),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.username} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here&apos;s your reward summary</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Wallet Balance"
          value={walletLoading ? '...' : `${formatCoins(Number(wallet?.balance ?? 0))} coins`}
          icon="💰"
        />
        <StatCard
          label="Current Streak"
          value={`${checkinStatus?.currentStreak ?? 0} days`}
          icon="🔥"
          sub={checkinStatus?.hasCheckedInToday ? 'Checked in today!' : 'Not checked in yet'}
        />
        <StatCard
          label="Total Earned"
          value={`${formatCoins(Number(wallet?.totalEarned ?? 0))} coins`}
          icon="🏆"
        />
        <StatCard
          label="Total Transactions"
          value={txs?.meta.total ?? 0}
          icon="📊"
        />
      </div>

      {/* Streak Calendar */}
      <StreakCalendar streak={checkinStatus?.currentStreak ?? 0} />

      {/* Recent Transactions */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Recent Transactions</h3>
        {txs?.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">No transactions yet. Start checking in!</p>
        ) : (
          <div className="space-y-3">
            {txs?.data.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{tx.description ?? tx.type}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt)}</p>
                </div>
                <span
                  className={`text-sm font-bold ${Number(tx.amount) > 0 ? 'text-green-500' : 'text-destructive'}`}
                >
                  {Number(tx.amount) > 0 ? '+' : ''}{formatCoins(Number(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
