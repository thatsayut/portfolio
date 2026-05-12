'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { adminService } from '@/services/admin.service';
import { QUERY_KEYS } from '@/constants/query-keys';
import { formatCoins, formatDate } from '@/utils/format';

function KpiCard({
  title,
  value,
  sub,
  icon,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data: overview } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_OVERVIEW,
    queryFn: adminService.getOverview,
  });

  const { data: checkinData } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_CHECKIN_ANALYTICS(),
    queryFn: () => adminService.getCheckinAnalytics(),
  });

  const chartData =
    checkinData?.map((d) => ({
      date: formatDate(d.date, 'MMM d'),
      checkins: d.count,
      rewards: d.totalReward,
    })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform analytics overview</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard title="Total Users" value={overview?.totalUsers ?? '—'} icon="👥" />
        <KpiCard title="Active Users" value={overview?.activeUsers ?? '—'} icon="✅" />
        <KpiCard
          title="Total Check-ins"
          value={overview?.totalCheckins?.toLocaleString() ?? '—'}
          icon="🔥"
        />
        <KpiCard
          title="Total Rewards Distributed"
          value={`${formatCoins(overview?.totalRewardsDistributed ?? 0)} coins`}
          icon="🏆"
        />
        <KpiCard
          title="Rewards Last 30 Days"
          value={`${formatCoins(overview?.rewardsLast30Days ?? 0)} coins`}
          icon="📈"
        />
        <KpiCard
          title="New Users (30d)"
          value={overview?.newUsersLast30Days ?? '—'}
          icon="🆕"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Daily Check-ins (30 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="checkinGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(221.2 83.2% 53.3%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(221.2 83.2% 53.3%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="checkins"
                stroke="hsl(221.2 83.2% 53.3%)"
                fill="url(#checkinGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Rewards Distributed (30 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="rewards" fill="hsl(221.2 83.2% 53.3%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
