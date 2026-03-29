import axios from 'axios';
import { API_BASE_URL, MAIN_DOMAINS } from '../config/api';
import { setToken, clearToken, getToken } from '../utils/tokenStore';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ─── URLs que NUNCA deben intentar refresh ────────────────────────────────────
// Si alguna de estas falla con 401, simplemente se rechaza sin intentar refresh
const NO_REFRESH_URLS = [
  '/accounts/api/v1/token/',          // login
  '/accounts/api/v1/token/refresh/',  // el refresh mismo
  '/api/v1/users/user/user-role/',    // verificación inicial de AuthContext
];

// ─── Rutas públicas del browser — sin token, sin refresh ─────────────────────
// Si la URL del browser es una ruta pública, no tiene sentido intentar refresh
const PUBLIC_BROWSER_PATHS = [
  '/gateway',
  '/public-report',
  '/public-report-detail',
  '/verify-portal',
  '/register',
  '/success',
];

const isOnPublicPage = (): boolean => {
  const pathname = window.location.pathname;
  return PUBLIC_BROWSER_PATHS.some(path => pathname.includes(path));
};

// ─── Refresh lock — evita múltiples refreshes simultáneos ────────────────────
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(p => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
};

// ─── Request interceptor ─────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor ────────────────────────────────────────────────────
api.interceptors.response.use(
  response => response,
  async (error) => {
    const originalRequest = error.config;

    const isNoRefreshUrl = NO_REFRESH_URLS.some(url =>
      originalRequest?.url?.includes(url)
    );

    // No intentar refresh si:
    // 1. No es 401
    // 2. Ya se reintentó
    // 3. Es una URL excluida (login, refresh, user-role)
    // 4. El usuario está en una página pública
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isNoRefreshUrl &&
      !isOnPublicPage()
    ) {

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const tokenRes = await axios.post(
          `${API_BASE_URL}/accounts/api/v1/token/refresh/`,
          {},
          { withCredentials: true }
        );

        const newToken = tokenRes.data.access;
        setToken(newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

        processQueue(null, newToken);
        return api(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError, null);

        clearToken();

        const isCustomDomain = !MAIN_DOMAINS.includes(window.location.hostname);
        const portal = window.location.pathname.split('/')[1];
        window.location.href = isCustomDomain ? '/gateway' : `/${portal}/gateway`;

        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;