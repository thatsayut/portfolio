import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: `${BASE_URL}/api/v1`,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });

  // Attach access token to every request
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Auto-refresh on 401
  let isRefreshing = false;
  let pendingQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

  const processQueue = (error: unknown, token?: string) => {
    pendingQueue.forEach(({ resolve, reject }) => {
      if (token) resolve(token);
      else reject(error);
    });
    pendingQueue = [];
  };

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status !== 401 || original._retry) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return client(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = response.data.data;

        useAuthStore.getState().setTokens(accessToken, newRefresh);
        processQueue(null, accessToken);

        original.headers.Authorization = `Bearer ${accessToken}`;
        return client(original);
      } catch (refreshError) {
        processQueue(refreshError);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    },
  );

  return client;
}

export const apiClient = createApiClient();
