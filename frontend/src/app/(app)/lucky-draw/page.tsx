'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { luckyDrawService } from '@/services/lucky-draw.service';
import { QUERY_KEYS } from '@/constants/query-keys';
import { formatCoins } from '@/utils/format';
import { useState, useRef, useCallback } from 'react';
import type { LuckyDrawSpinResult, LuckyDrawSlot } from '@/types/api.types';

export default function LuckyDrawPage() {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<LuckyDrawSpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const spinCountRef = useRef(0);

  const { data: config, isLoading } = useQuery({
    queryKey: QUERY_KEYS.LUCKY_DRAW_CONFIG,
    queryFn: luckyDrawService.getConfig,
  });

  const { data: history } = useQuery({
    queryKey: QUERY_KEYS.LUCKY_DRAW_HISTORY(1),
    queryFn: () => luckyDrawService.getHistory(1, 10),
  });

  const { mutate: doSpin } = useMutation({
    mutationFn: luckyDrawService.spin,
    onSuccess: (data) => {
      setError(null);
      // Calculate target rotation to land on winning slot
      const slots = config?.slots ?? [];
      const winIdx = slots.findIndex((s) => s.id === data.slot.id);
      const segmentAngle = 360 / slots.length;
      // Spin multiple full rotations + land on the winning segment
      // The pointer is at top (0°), segments start from right (90° offset)
      const targetAngle = 360 - (winIdx * segmentAngle + segmentAngle / 2);
      spinCountRef.current += 1;
      const fullSpins = 5 + spinCountRef.current; // More spins each time
      const finalRotation = fullSpins * 360 + targetAngle;

      setRotation(finalRotation);

      // Show result after animation
      setTimeout(() => {
        setResult(data);
        setIsSpinning(false);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LUCKY_DRAW_CONFIG });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WALLET });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LUCKY_DRAW_HISTORY(1) });
      }, 4000);
    },
    onError: (err: any) => {
      setIsSpinning(false);
      const msg =
        err?.response?.data?.error?.message ??
        err?.response?.data?.message ??
        'Spin failed';
      setError(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  const handleSpin = useCallback(() => {
    if (isSpinning || !config?.spinsRemaining) return;
    setResult(null);
    setError(null);
    setIsSpinning(true);
    doSpin();
  }, [isSpinning, config, doSpin]);

  const slots = config?.slots ?? [];
  const segmentAngle = slots.length > 0 ? 360 / slots.length : 0;

  // Build conic-gradient for wheel
  const conicStops = slots
    .map((slot, i) => {
      const from = i * segmentAngle;
      const to = (i + 1) * segmentAngle;
      return `${slot.color} ${from}deg ${to}deg`;
    })
    .join(', ');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!config?.isEnabled) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🎰</div>
        <h1 className="text-2xl font-bold text-foreground">Lucky Draw</h1>
        <p className="text-muted-foreground mt-2">Currently unavailable. Check back later!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Lucky Draw</h1>
        <p className="text-muted-foreground mt-1">
          Spin the wheel and win coins! {config.spinsRemaining} spin{config.spinsRemaining !== 1 ? 's' : ''} remaining today.
        </p>
      </div>

      {/* Wheel */}
      <div className="flex flex-col items-center">
        <div className="relative">
          {/* Pointer */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 text-3xl drop-shadow-lg"
               style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
            🔻
          </div>

          {/* Wheel container */}
          <div
            className="w-72 h-72 sm:w-80 sm:h-80 rounded-full border-4 border-border shadow-2xl relative overflow-hidden"
            style={{
              background: slots.length > 0 ? `conic-gradient(${conicStops})` : '#333',
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning
                ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                : 'none',
            }}
          >
            {/* Labels on each segment */}
            {slots.map((slot, i) => {
              const angle = i * segmentAngle + segmentAngle / 2;
              return (
                <div
                  key={slot.id}
                  className="absolute inset-0 flex items-center justify-start pl-6"
                  style={{
                    transform: `rotate(${angle}deg)`,
                    transformOrigin: 'center',
                  }}
                >
                  <span
                    className="text-xs sm:text-sm font-bold text-white drop-shadow-md max-w-[80px] truncate"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
                  >
                    {slot.label}
                  </span>
                </div>
              );
            })}

            {/* Center circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-card border-2 border-border rounded-full flex items-center justify-center shadow-lg">
                <span className="text-xl">🎰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Spin button */}
        <button
          onClick={handleSpin}
          disabled={isSpinning || !config.spinsRemaining}
          className="mt-8 px-10 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-95 shadow-lg shadow-primary/25"
        >
          {isSpinning
            ? '🎲 Spinning...'
            : config.spinsRemaining > 0
              ? `🎰 SPIN (${config.spinsRemaining} left)`
              : 'No spins left today'}
        </button>

        {error && <p className="text-destructive text-sm mt-2">{error}</p>}

        {config.costPerSpin > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Cost: {formatCoins(config.costPerSpin)} coins per spin
          </p>
        )}
      </div>

      {/* Result */}
      {result && (
        <div
          className={`rounded-2xl p-6 text-center border ${
            result.rewardAmount > 0
              ? 'bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/30'
              : 'bg-muted/50 border-border'
          }`}
        >
          <div className="text-5xl mb-3">{result.rewardAmount > 0 ? '🎉' : '😅'}</div>
          <h3 className="text-xl font-bold text-foreground mb-1">{result.message}</h3>
          {result.rewardAmount > 0 && (
            <div className="flex justify-center gap-8 mt-4">
              <div>
                <p className="text-2xl font-bold text-green-500">
                  +{formatCoins(result.rewardAmount)}
                </p>
                <p className="text-xs text-muted-foreground">Coins Won</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatCoins(result.walletBalance)}
                </p>
                <p className="text-xs text-muted-foreground">New Balance</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slot probabilities */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Prize Table</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="rounded-lg p-3 text-center border border-border"
              style={{ borderLeftColor: slot.color, borderLeftWidth: 4 }}
            >
              <p className="font-bold text-foreground">
                {slot.rewardAmount > 0 ? `${formatCoins(slot.rewardAmount)}` : '—'}
              </p>
              <p className="text-xs text-muted-foreground truncate">{slot.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      {history?.data.length ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Recent Spins</h3>
          <div className="space-y-2">
            {history.data.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: h.slot.color }}
                  />
                  <span className="font-medium text-foreground">{h.slot.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(h.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <span
                  className={`font-semibold ${Number(h.rewardAmount) > 0 ? 'text-green-500' : 'text-muted-foreground'}`}
                >
                  {Number(h.rewardAmount) > 0 ? `+${formatCoins(Number(h.rewardAmount))}` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
