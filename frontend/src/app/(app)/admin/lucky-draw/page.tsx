'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { luckyDrawService } from '@/services/lucky-draw.service';
import { QUERY_KEYS } from '@/constants/query-keys';
import { useState, useEffect } from 'react';
import type { LuckyDrawAdminSlot } from '@/types/api.types';

const DEFAULT_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
  '#6B7280', '#EF4444', '#06B6D4', '#F97316',
  '#EC4899', '#14B8A6',
];

function emptySlot(position: number): LuckyDrawAdminSlot {
  return {
    id: '',
    label: '',
    rewardAmount: 0,
    weight: 10,
    color: DEFAULT_COLORS[position % DEFAULT_COLORS.length],
    position,
    isActive: true,
  };
}

export default function AdminLuckyDrawPage() {
  const queryClient = useQueryClient();
  const [slots, setSlots] = useState<LuckyDrawAdminSlot[]>([]);
  const [configForm, setConfigForm] = useState({
    name: 'Default Wheel',
    isEnabled: true,
    costPerSpin: 0,
    maxSpinsPerDay: 3,
  });
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: QUERY_KEYS.LUCKY_DRAW_ADMIN_CONFIG,
    queryFn: luckyDrawService.getAdminConfig,
  });

  useEffect(() => {
    if (config) {
      setSlots(config.slots);
      setConfigForm({
        name: config.name,
        isEnabled: config.isEnabled,
        costPerSpin: config.costPerSpin,
        maxSpinsPerDay: config.maxSpinsPerDay,
      });
    }
  }, [config]);

  const { mutate: saveConfig, isPending: savingConfig } = useMutation({
    mutationFn: () => luckyDrawService.updateAdminConfig(configForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LUCKY_DRAW_ADMIN_CONFIG });
      setSaveMsg('Config saved!');
      setTimeout(() => setSaveMsg(null), 2000);
    },
  });

  const { mutate: saveSlotsMutation, isPending: savingSlots } = useMutation({
    mutationFn: () =>
      luckyDrawService.saveSlots(
        slots.map((s, i) => ({
          ...(s.id ? { id: s.id } : {}),
          label: s.label,
          rewardAmount: s.rewardAmount,
          weight: s.weight,
          color: s.color,
          position: i,
          isActive: s.isActive,
        })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LUCKY_DRAW_ADMIN_CONFIG });
      setSaveMsg('Slots saved!');
      setTimeout(() => setSaveMsg(null), 2000);
    },
  });

  const { mutate: deleteSlotMutation } = useMutation({
    mutationFn: (id: string) => luckyDrawService.deleteSlot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LUCKY_DRAW_ADMIN_CONFIG });
    },
  });

  const updateSlot = (idx: number, field: string, value: any) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const addSlot = () => {
    setSlots((prev) => [...prev, emptySlot(prev.length)]);
  };

  const removeSlot = (idx: number) => {
    const slot = slots[idx];
    if (slot.id) {
      deleteSlotMutation(slot.id);
    }
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  // Calculate total weight for probability display
  const totalWeight = slots.filter((s) => s.isActive).reduce((sum, s) => sum + s.weight, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lucky Draw Config</h1>
          <p className="text-muted-foreground mt-1">Manage wheel slots, probabilities, and rewards</p>
        </div>
        {saveMsg && (
          <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-lg text-sm font-medium">
            {saveMsg}
          </span>
        )}
      </div>

      {/* Global Config */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">General Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Name</label>
            <input
              value={configForm.name}
              onChange={(e) => setConfigForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Max Spins / Day</label>
            <input
              type="number"
              min={1}
              value={configForm.maxSpinsPerDay}
              onChange={(e) => setConfigForm((p) => ({ ...p, maxSpinsPerDay: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Cost per Spin</label>
            <input
              type="number"
              min={0}
              value={configForm.costPerSpin}
              onChange={(e) => setConfigForm((p) => ({ ...p, costPerSpin: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
            />
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={configForm.isEnabled}
                onChange={(e) => setConfigForm((p) => ({ ...p, isEnabled: e.target.checked }))}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-foreground">Enabled</span>
            </label>
            <button
              onClick={() => saveConfig()}
              disabled={savingConfig}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition"
            >
              {savingConfig ? 'Saving...' : 'Save Config'}
            </button>
          </div>
        </div>
      </div>

      {/* Slots Table */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">
            Wheel Slots ({slots.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={addSlot}
              className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-accent transition"
            >
              + Add Slot
            </button>
            <button
              onClick={() => saveSlotsMutation()}
              disabled={savingSlots}
              className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition"
            >
              {savingSlots ? 'Saving...' : 'Save All Slots'}
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="grid grid-cols-[40px_1fr_100px_80px_70px_60px_40px] gap-2 text-xs text-muted-foreground font-medium mb-2 px-1">
          <span>Color</span>
          <span>Label</span>
          <span>Reward</span>
          <span>Weight</span>
          <span>Prob %</span>
          <span>Active</span>
          <span />
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {slots.map((slot, idx) => {
            const prob = totalWeight > 0 && slot.isActive
              ? ((slot.weight / totalWeight) * 100).toFixed(1)
              : '0.0';

            return (
              <div
                key={slot.id || `new-${idx}`}
                className="grid grid-cols-[40px_1fr_100px_80px_70px_60px_40px] gap-2 items-center"
              >
                <input
                  type="color"
                  value={slot.color}
                  onChange={(e) => updateSlot(idx, 'color', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  value={slot.label}
                  onChange={(e) => updateSlot(idx, 'label', e.target.value)}
                  placeholder="e.g. 50 Coins"
                  className="px-2 py-1.5 rounded border border-input bg-background text-foreground text-sm"
                />
                <input
                  type="number"
                  min={0}
                  value={slot.rewardAmount}
                  onChange={(e) => updateSlot(idx, 'rewardAmount', Number(e.target.value))}
                  className="px-2 py-1.5 rounded border border-input bg-background text-foreground text-sm"
                />
                <input
                  type="number"
                  min={1}
                  value={slot.weight}
                  onChange={(e) => updateSlot(idx, 'weight', Number(e.target.value))}
                  className="px-2 py-1.5 rounded border border-input bg-background text-foreground text-sm"
                />
                <span className="text-sm text-center text-muted-foreground">{prob}%</span>
                <label className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={slot.isActive}
                    onChange={(e) => updateSlot(idx, 'isActive', e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                </label>
                <button
                  onClick={() => removeSlot(idx)}
                  className="text-destructive hover:text-destructive/80 text-lg transition"
                  title="Remove slot"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        {slots.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            No slots yet. Click &quot;+ Add Slot&quot; to create one.
          </p>
        )}
      </div>

      {/* Probability Preview */}
      {slots.filter((s) => s.isActive).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4">Probability Preview</h2>
          <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
            {slots
              .filter((s) => s.isActive)
              .map((slot, i) => {
                const pct = totalWeight > 0 ? (slot.weight / totalWeight) * 100 : 0;
                return (
                  <div
                    key={slot.id || `bar-${i}`}
                    className="flex items-center justify-center text-xs font-bold text-white transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: slot.color,
                      minWidth: pct > 3 ? undefined : '2px',
                    }}
                    title={`${slot.label}: ${pct.toFixed(1)}%`}
                  >
                    {pct > 8 ? `${pct.toFixed(0)}%` : ''}
                  </div>
                );
              })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {slots
              .filter((s) => s.isActive)
              .map((slot, i) => (
                <div key={slot.id || `legend-${i}`} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: slot.color }} />
                  {slot.label}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
