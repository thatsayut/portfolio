import { apiClient } from './api.client';
import type { ApiResponse, AuthResponse } from '@/types/api.types';

export interface LoginPayload { email: string; password: string }
export interface RegisterPayload { email: string; username: string; password: string; phone?: string }

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  return data.data;
}

export const authService = {
  login: (payload: LoginPayload) =>
    unwrap<AuthResponse>(apiClient.post('/auth/login', payload)),

  register: (payload: RegisterPayload) =>
    unwrap<AuthResponse>(apiClient.post('/auth/register', payload)),

  logout: (refreshToken: string) =>
    unwrap<void>(apiClient.post('/auth/logout', { refreshToken })),

  forgotPassword: (email: string) =>
    unwrap<{ message: string }>(apiClient.post('/auth/forgot-password', { email })),

  changePassword: (currentPassword: string, newPassword: string) =>
    unwrap<void>(apiClient.put('/auth/change-password', { currentPassword, newPassword })),
};
