import { apiClient } from './api.client';
import type {
  ApiResponse,
  LuckyDrawWheelConfig,
  LuckyDrawSpinResult,
  LuckyDrawAdminConfig,
  LuckyDrawHistory,
  PaginatedResult,
} from '@/types/api.types';

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  return data.data;
}

export const luckyDrawService = {
  // User
  getConfig: () => unwrap<LuckyDrawWheelConfig>(apiClient.get('/lucky-draw/config')),

  spin: () => unwrap<LuckyDrawSpinResult>(apiClient.post('/lucky-draw/spin')),

  getHistory: (page = 1, limit = 10) =>
    unwrap<PaginatedResult<LuckyDrawHistory>>(
      apiClient.get('/lucky-draw/history', { params: { page, limit } }),
    ),

  // Admin
  getAdminConfig: () => unwrap<LuckyDrawAdminConfig>(apiClient.get('/lucky-draw/admin/config')),

  updateAdminConfig: (data: {
    name?: string;
    isEnabled?: boolean;
    costPerSpin?: number;
    maxSpinsPerDay?: number;
  }) => unwrap<any>(apiClient.put('/lucky-draw/admin/config', data)),

  saveSlots: (slots: any[]) => unwrap<any>(apiClient.put('/lucky-draw/admin/slots', { slots })),

  deleteSlot: (id: string) => unwrap<any>(apiClient.delete(`/lucky-draw/admin/slots/${id}`)),
};
