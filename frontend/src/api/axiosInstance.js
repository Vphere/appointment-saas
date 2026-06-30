// axiosInstance.js
import axios from 'axios';
import { getInMemoryToken, setInMemoryToken, clearInMemoryToken, getTokenExpiry, setTokenExpiry } from '../context/tokenStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ── Public routes that never need an access token ─────────────────
// The request interceptor skips the refresh-or-redirect logic for these
// so that unauthenticated users can still call them even when the refresh
// token cookie is absent or invalid (e.g. a user who forgot their password
// and navigates to /forgot-password with no active session).
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/verify-otp',
  '/api/auth/reset-password',
  '/api/auth/complete-profile',
  '/api/payments/consent',
];

function isPublicRoute(url) {
  return PUBLIC_ROUTES.some((route) => url?.includes(route));
}

// ── Proactive refresh ─────────────────────────────────────────────
// Refresh the access token if it expires within the next 60 seconds.
// Called on every outgoing *protected* request so the token is always
// fresh even after the tab has been in the background for a long time.
let proactiveRefreshPromise = null;

async function refreshIfNeeded() {
  const expiry = getTokenExpiry();
  const now    = Date.now();
  const BUFFER = 60_000; // refresh if < 60s remaining

  // Token still valid with comfortable margin — nothing to do
  if (expiry && now < expiry - BUFFER) return;

  // Already refreshing — wait for that to finish
  if (proactiveRefreshPromise) return proactiveRefreshPromise;

  proactiveRefreshPromise = (async () => {
    try {
      const res      = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const newToken = res.data.accessToken;
      setInMemoryToken(newToken);
      // Decode expiry from the JWT payload (middle segment)
      try {
        const payload = JSON.parse(atob(newToken.split('.')[1]));
        setTokenExpiry(payload.exp * 1000); // exp is in seconds
      } catch {
        // If decode fails, assume 15 minutes from now
        setTokenExpiry(Date.now() + 900_000);
      }
    } catch {
      // Refresh failed — clear token; redirect only if we're on a protected page.
      // Never redirect from public auth pages (login, forgot-password, etc.)
      clearInMemoryToken();
      setTokenExpiry(null);
      if (!isPublicRoute(window.location.pathname) && window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
  })().finally(() => {
    proactiveRefreshPromise = null;
  });

  return proactiveRefreshPromise;
}

// ── Request interceptor ───────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  // Public routes: skip refresh logic entirely — just send the request as-is.
  // This is what fixes the forgot-password redirect bug: a user with no session
  // can call /forgot-password without being kicked back to the login page.
  if (isPublicRoute(config.url)) return config;

  await refreshIfNeeded();

  const token = getInMemoryToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor (fallback for unexpected 401s) ───────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // Never retry public/auth routes
    if (isPublicRoute(originalRequest.url)) {
      return Promise.reject(err);
    }

    if (err.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res      = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = res.data.accessToken;
        setInMemoryToken(newToken);
        try {
          const payload = JSON.parse(atob(newToken.split('.')[1]));
          setTokenExpiry(payload.exp * 1000);
        } catch {
          setTokenExpiry(Date.now() + 900_000);
        }
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearInMemoryToken();
        setTokenExpiry(null);
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;