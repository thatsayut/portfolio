'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { adminService } from '@/services/admin.service';
import { QUERY_KEYS } from '@/constants/query-keys';
import { formatDateTime } from '@/utils/format';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'text-blue-500',
  CREATE: 'text-green-500',
  UPDATE: 'text-yellow-500',
  UPDATE_CONFIG: 'text-purple-500',
  DELETE: 'text-destructive',
  GRANT_BONUS: 'text-orange-500',
  SUSPEND_USER: 'text-yellow-600',
  BAN_USER: 'text-destructive',
  LOGOUT: 'text-muted-foreground',
};

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_AUDIT_LOGS(page),
    queryFn: () => adminService.getAuditLogs(page, 25),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">Immutable record of all admin actions</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Timestamp', 'Admin', 'Action', 'Entity', 'Target User', 'Changes'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : data?.data.map((log: any) => (
              <tr key={log.id} className="hover:bg-muted/30 transition">
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatDateTime(log.createdAt)}
                </td>
                <td className="px-4 py-3">
                  {log.admin ? (
                    <div>
                      <p className="font-medium text-foreground">{log.admin.username}</p>
                      <p className="text-xs text-muted-foreground">{log.admin.email}</p>
                    </div>
                  ) : <span className="text-muted-foreground">System</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-medium text-xs ${ACTION_COLORS[log.action] ?? 'text-foreground'}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{log.entity}</td>
                <td className="px-4 py-3">
                  {log.user ? (
                    <span className="text-foreground">{log.user.username}</span>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px]">
                  {log.newValue ? (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                      {JSON.stringify(log.newValue)}
                    </code>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data && data.meta.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {data.meta.total} entries · Page {page} of {data.meta.totalPages}
            </p>
            <div className="flex gap-2">
              <button disabled={!data.meta.hasPreviousPage} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-50 hover:bg-muted transition">
                Previous
              </button>
              <button disabled={!data.meta.hasNextPage} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-50 hover:bg-muted transition">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
