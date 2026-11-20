import axios from 'axios';

// Base Axios instance configured for QuickSell backend
const api = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true // Necessary to send and receive HTTP-only cookies (e.g. refreshToken)
});

// In-memory token storage getter and setter
let memoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  memoryAccessToken = token;
};

export const getAccessToken = (): string | null => {
  return memoryAccessToken;
};

// Token sync handlers allowing Redux store to observe refreshed tokens and auth expiry without circular imports
type TokenSyncHandlers = {
  onTokenRefreshed?: (token: string) => void;
  onAuthExpired?: () => void;
};

let syncHandlers: TokenSyncHandlers = {};

export const setTokenSyncHandler = (handlers: TokenSyncHandlers): void => {
  syncHandlers = handlers;
};

// Request interceptor: attach memoryAccessToken to Authorization header
api.interceptors.request.use(
  (config) => {
    if (memoryAccessToken && config.headers) {
      config.headers.Authorization = `Bearer ${memoryAccessToken}`;
    }
    // Only set Content-Type to application/json if not sending FormData
    if (!(config.data instanceof FormData) && config.headers && !config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: automatically try refreshing token if a 401 is received (except on auth routes)
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth endpoints (login, register, refresh itself)
    const isAuthEndpoint = originalRequest?.url?.includes('/api/auth/login') ||
                           originalRequest?.url?.includes('/api/auth/register') ||
                           originalRequest?.url?.includes('/api/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<{ accessToken: string }>(
          'http://localhost:5000/api/auth/refresh',
          {},
          { withCredentials: true }
        );

        const newAccessToken = response.data.accessToken;
        setAccessToken(newAccessToken);

        // Notify Redux store of token refresh
        syncHandlers.onTokenRefreshed?.(newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);

        // Notify Redux store of session invalidation
        syncHandlers.onAuthExpired?.();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
