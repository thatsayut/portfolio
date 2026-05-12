import { apiClient } from './api.client';
import type {
  ApiResponse,
  CheckinResult,
  CheckinStatus,
  PaginatedResult,
  CheckinHistory,
} from '@/types/api.types';

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  return data.data;
}

export const rewardService = {
  checkin: () => unwrap<CheckinResult>(apiClient.post('/reward/checkin')),

  getStatus: () => unwrap<CheckinStatus>(apiClient.get('/reward/checkin/status')),

  getHistory: (page = 1, limit = 20) =>
    unwrap<PaginatedResult<CheckinHistory>>(
      apiClient.get('/reward/checkin/history', { params: { page, limit } }),
    ),
};
