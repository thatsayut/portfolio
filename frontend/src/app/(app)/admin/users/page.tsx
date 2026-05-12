'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminService } from '@/services/admin.service';
import { QUERY_KEYS } from '@/constants/query-keys';
import { formatDateTime } from '@/utils/format';
import type { UserStatus, User } from '@/types/api.types';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-500/15 text-green-600',
  SUSPENDED: 'bg-yellow-500/15 text-yellow-600',
  BANNED: 'bg-red-500/15 text-red-600',
};

const ROLE_BADGE: Record<string, string> = {
  USER: 'bg-blue-500/15 text-blue-600',
  ADMIN: 'bg-purple-500/15 text-purple-600',
  SUPER_ADMIN: 'bg-orange-500/15 text-orange-600',
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_USERS(page, debouncedSearch),
    queryFn: () => adminService.getUsers(page, 20, debouncedSearch || undefined),
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      adminService.setUserStatus(userId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  let searchTimeout: ReturnType<typeof setTimeout>;
  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { setDebouncedSearch(v); setPage(1); }, 400);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">{data?.meta.total ?? 0} total users</p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by email or username..."
          className="w-64 px-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['User', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : data?.data.map((user: User) => (
              <tr key={user.id} className="hover:bg-muted/30 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-bold">
                      {user.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[user.role] ?? ''}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[user.status] ?? ''}`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDateTime(user.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {user.status === 'ACTIVE' ? (
                      <button
                        onClick={() => updateStatus({ userId: user.id, status: 'SUSPENDED' })}
                        className="px-2.5 py-1 text-xs bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 rounded-lg transition"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus({ userId: user.id, status: 'ACTIVE' })}
                        className="px-2.5 py-1 text-xs bg-green-500/10 text-green-600 hover:bg-green-500/20 rounded-lg transition"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.meta.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {data.meta.totalPages}
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
