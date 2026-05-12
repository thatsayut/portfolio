'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminService } from '@/services/admin.service';
import { apiClient } from '@/services/api.client';
import { QUERY_KEYS } from '@/constants/query-keys';
import { formatDateTime, formatCoins } from '@/utils/format';
import type { BonusCampaign } from '@/types/api.types';

const campaignSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  type: z.enum(['DAILY', 'MILESTONE', 'EVENT', 'ADMIN_GRANT']),
  amount: z.coerce.number().min(1),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
});
type CampaignForm = z.infer<typeof campaignSchema>;

function CreateCampaignModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { type: 'EVENT' },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CampaignForm) => apiClient.post('/bonus/campaigns', data).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold text-foreground mb-5">Create Bonus Campaign</h2>
        <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
          {[
            { name: 'name', label: 'Campaign Name', type: 'text' },
            { name: 'description', label: 'Description', type: 'text' },
            { name: 'amount', label: 'Coin Amount per User', type: 'number' },
            { name: 'startDate', label: 'Start Date', type: 'datetime-local' },
            { name: 'endDate', label: 'End Date (optional)', type: 'datetime-local' },
          ].map(({ name, label, type }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
              <input
                {...register(name as keyof CampaignForm)}
                type={type}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors[name as keyof CampaignForm] && (
                <p className="text-destructive text-xs mt-1">{errors[name as keyof CampaignForm]?.message}</p>
              )}
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Type</label>
            <select {...register('type')} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="DAILY">Daily</option>
              <option value="MILESTONE">Milestone</option>
              <option value="EVENT">Event</option>
              <option value="ADMIN_GRANT">Admin Grant</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-border rounded-lg text-muted-foreground hover:bg-muted transition text-sm">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 transition text-sm">
              {isPending ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminBonusPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);

  const { data } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_CAMPAIGNS(page),
    queryFn: () => adminService.getCampaigns(page, 20),
  });

  const { mutate: activate } = useMutation({
    mutationFn: (id: string) => adminService.activateCampaign(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'campaigns'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bonus Campaigns</h1>
          <p className="text-muted-foreground mt-1">Create and distribute bonus rewards</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition"
        >
          + New Campaign
        </button>
      </div>

      {showCreate && <CreateCampaignModal onClose={() => setShowCreate(false)} />}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Name', 'Type', 'Amount', 'Status', 'Start Date', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.data.map((c: BonusCampaign) => (
              <tr key={c.id} className="hover:bg-muted/30 transition">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{c.name}</p>
                  {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.type}</td>
                <td className="px-4 py-3 font-semibold text-primary">{formatCoins(c.amount)} coins</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.isActive ? 'bg-green-500/15 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                    {c.processedAt ? 'Distributed' : c.isActive ? 'Active' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(c.startDate)}</td>
                <td className="px-4 py-3">
                  {!c.processedAt && (
                    <button
                      onClick={() => activate(c.id)}
                      className="px-2.5 py-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition"
                    >
                      Distribute
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
