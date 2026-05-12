'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/services/api.client';

const ruleSchema = z.object({
  streakDay: z.coerce.number().min(1),
  rewardAmount: z.coerce.number().min(0),
  bonusMultiplier: z.coerce.number().min(1),
  label: z.string().optional(),
});

const configSchema = z.object({
  name: z.string().min(3),
  baseRewardAmount: z.coerce.number().min(0),
  resetOnMissedDay: z.boolean(),
  maxStreakDay: z.coerce.number().min(1).max(365),
  rules: z.array(ruleSchema),
});

type ConfigForm = z.infer<typeof configSchema>;

const DEFAULT_RULES = [
  { streakDay: 1, rewardAmount: 10, bonusMultiplier: 1, label: 'Day 1 — Welcome' },
  { streakDay: 7, rewardAmount: 50, bonusMultiplier: 2, label: 'Weekly Jackpot' },
  { streakDay: 14, rewardAmount: 100, bonusMultiplier: 3, label: 'Fortnight Bonus' },
  { streakDay: 30, rewardAmount: 500, bonusMultiplier: 5, label: 'Monthly Legend' },
];

export default function AdminRewardsPage() {
  const qc = useQueryClient();

  const { register, control, handleSubmit, formState: { errors } } = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      name: 'Default Reward Config',
      baseRewardAmount: 10,
      resetOnMissedDay: true,
      maxStreakDay: 30,
      rules: DEFAULT_RULES,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'rules' });

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: (data: ConfigForm) =>
      apiClient.put('/admin/reward/config', data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checkin', 'status'] }),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reward Configuration</h1>
        <p className="text-muted-foreground mt-1">Configure check-in rules and streak rewards</p>
      </div>

      <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-6">
        {/* Basic Config */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Basic Settings</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Config Name</label>
              <input {...register('name')} className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Base Reward (coins)</label>
              <input {...register('baseRewardAmount')} type="number" className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Max Streak Day</label>
              <input {...register('maxStreakDay')} type="number" className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input {...register('resetOnMissedDay')} type="checkbox" id="reset" className="h-4 w-4 rounded border-input" />
              <label htmlFor="reset" className="text-sm text-foreground">Reset streak on missed day</label>
            </div>
          </div>
        </div>

        {/* Reward Rules */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Streak Reward Rules</h2>
            <button
              type="button"
              onClick={() => append({ streakDay: fields.length + 1, rewardAmount: 10, bonusMultiplier: 1, label: '' })}
              className="px-3 py-1.5 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition"
            >
              + Add Rule
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Streak Day</label>
                  <input {...register(`rules.${i}.streakDay`)} type="number" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Reward</label>
                  <input {...register(`rules.${i}.rewardAmount`)} type="number" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Multiplier</label>
                  <input {...register(`rules.${i}.bonusMultiplier`)} type="number" step="0.1" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="col-span-5">
                  <label className="block text-xs text-muted-foreground mb-1">Label (optional)</label>
                  <input {...register(`rules.${i}.label`)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="col-span-1 flex items-end pb-0.5">
                  <button type="button" onClick={() => remove(i)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {isPending ? 'Saving...' : isSuccess ? '✓ Config Saved' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
}
