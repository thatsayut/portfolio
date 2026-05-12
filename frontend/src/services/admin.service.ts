import { apiClient } from './api.client';
import type {
  ApiResponse,
  AnalyticsOverview,
  CheckinAnalyticsPoint,
  PaginatedResult,
  User,
  BonusCampaign,
} from '@/types/api.types';

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  return data.data;
}

export const adminService = {
  getOverview: () => unwrap<AnalyticsOverview>(apiClient.get('/admin/analytics/overview')),

  getCheckinAnalytics: (from?: string, to?: string) =>
    unwrap<CheckinAnalyticsPoint[]>(
      apiClient.get('/admin/analytics/checkins', { params: { from, to } }),
    ),

  getUsers: (page = 1, limit = 20, search?: string, status?: string) =>
    unwrap<PaginatedResult<User>>(
      apiClient.get('/admin/users', { params: { page, limit, search, status } }),
    ),

  setUserStatus: (userId: string, status: string) =>
    unwrap<User>(apiClient.put(`/admin/users/${userId}/status`, { status })),

  setUserRole: (userId: string, role: string) =>
    unwrap<User>(apiClient.put(`/admin/users/${userId}/role`, { role })),

  getCampaigns: (page = 1, limit = 20) =>
    unwrap<PaginatedResult<BonusCampaign>>(
      apiClient.get('/bonus/campaigns', { params: { page, limit } }),
    ),

  activateCampaign: (id: string) =>
    unwrap<{ message: string }>(apiClient.put(`/bonus/campaigns/${id}/activate`)),

  getAuditLogs: (page = 1, limit = 20) =>
    unwrap<PaginatedResult<any>>(apiClient.get('/audit-logs', { params: { page, limit } })),
};
