import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401, but only for authenticated requests (not login itself)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthEndpoint = err.config?.url?.includes('/auth/login') ||
                           err.config?.url?.includes('/auth/register') ||
                           err.config?.url?.includes('/auth/forgot-password') ||
                           err.config?.url?.includes('/auth/reset-password');

    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('tb_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
