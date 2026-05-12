'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rewardService } from '@/services/reward.service';
import { QUERY_KEYS } from '@/constants/query-keys';
import { formatCoins, formatDateTime } from '@/utils/format';
import type { CheckinResult } from '@/types/api.types';
import { useState } from 'react';

const STREAK_MILESTONES = [7, 14, 30];

export default function CheckinPage() {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: QUERY_KEYS.CHECKIN_STATUS,
    queryFn: rewardService.getStatus,
  });

  const { data: history } = useQuery({
    queryKey: QUERY_KEYS.CHECKIN_HISTORY(1),
    queryFn: () => rewardService.getHistory(1, 10),
  });

  const { mutate: doCheckin, isPending } = useMutation({
    mutationFn: rewardService.checkin,
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHECKIN_STATUS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WALLET });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHECKIN_HISTORY(1) });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message ?? err?.response?.data?.message ?? 'Check-in failed. Please try again.';
      setError(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  const streak = status?.currentStreak ?? 0;
  const nextMilestone = STREAK_MILESTONES.find((m) => m > streak) ?? 30;
  const progressToMilestone = Math.round((streak / nextMilestone) * 100);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Daily Check-in</h1>
        <p className="text-muted-foreground mt-1">Build your streak and earn bigger rewards</p>
      </div>

      {/* Check-in Card */}
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">{status?.hasCheckedInToday ? '✅' : '🎁'}</div>

        <h2 className="text-xl font-bold text-foreground mb-1">
          {status?.hasCheckedInToday ? 'Already Checked In Today!' : 'Ready to Check In?'}
        </h2>

        <div className="flex items-center justify-center gap-6 my-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{streak}</p>
            <p className="text-sm text-muted-foreground">Day Streak</p>
          </div>
          <div className="h-12 w-px bg-border" />
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">
              {formatCoins(Number(status?.nextReward?.baseReward ?? 0))}
            </p>
            <p className="text-sm text-muted-foreground">Next Reward</p>
          </div>
          <div className="h-12 w-px bg-border" />
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-500">{nextMilestone}</p>
            <p className="text-sm text-muted-foreground">Milestone Day</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Day {streak}</span>
            <span>Day {nextMilestone} milestone</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-500"
              style={{ width: `${progressToMilestone}%` }}
            />
          </div>
        </div>

        {!status?.hasCheckedInToday ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => doCheckin()}
              disabled={isPending || isLoading}
              className="px-10 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-95"
            >
              {isPending ? '🎲 Processing...' : '🎁 Check In Now'}
            </button>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
        ) : (
          <div className="px-6 py-3 bg-muted rounded-xl text-muted-foreground text-sm">
            Next check-in available at{' '}
            <strong>{formatDateTime(status.nextCheckinAt)}</strong>
          </div>
        )}
      </div>

      {/* Result overlay */}
      {result && (
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h3 className="text-xl font-bold text-foreground mb-1">{result.message}</h3>
          <div className="flex justify-center gap-8 mt-4">
            <div>
              <p className="text-2xl font-bold text-green-500">+{formatCoins(result.totalAmount)}</p>
              <p className="text-xs text-muted-foreground">Coins Earned</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatCoins(result.walletBalance)}</p>
              <p className="text-xs text-muted-foreground">New Balance</p>
            </div>
          </div>
          {result.bonusAmount > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Base: {formatCoins(result.baseReward)} + Streak Bonus: {formatCoins(result.bonusAmount)}
            </p>
          )}
        </div>
      )}

      {/* Reward Rules */}
      {status?.config.rules.length ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Reward Schedule</h3>
          <div className="grid grid-cols-3 gap-3">
            {status.config.rules.map((rule) => (
              <div
                key={rule.id}
                className={`rounded-xl p-3 text-center border ${
                  rule.streakDay === streak
                    ? 'bg-primary/10 border-primary'
                    : 'bg-muted/50 border-border'
                }`}
              >
                <p className="text-xs text-muted-foreground mb-1">Day {rule.streakDay}</p>
                <p className="font-bold text-foreground">{formatCoins(Number(rule.rewardAmount))}</p>
                {rule.bonusMultiplier > 1 && (
                  <p className="text-xs text-orange-500">{rule.bonusMultiplier}x</p>
                )}
                {rule.label && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{rule.label}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* History */}
      {history?.data.length ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Recent Check-ins</h3>
          <div className="space-y-2">
            {history.data.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <div>
                  <span className="font-medium text-foreground">Day {h.streakDay}</span>
                  <span className="text-muted-foreground ml-2">
                    {new Date(h.checkinDate).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                </div>
                <span className="font-semibold text-green-500">+{formatCoins(Number(h.totalAmount))}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
