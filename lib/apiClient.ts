import axios from 'axios';

// Points to our own Next.js proxy route — the real backend URL stays server-side
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/proxy';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for HTTP-only cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for auto-refreshing tokens
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet.
    // Skip refresh for wallet auth endpoints — a 401 there means
    // "no account found" or "bad signature", not an expired token.
    const isWalletAuth = originalRequest.url?.includes('/auths/wallet/');
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auths/refresh' &&
      !isWalletAuth
    ) {
      originalRequest._retry = true;
      try {
        // Refresh also goes through our proxy
        await apiClient.post('/auths/refresh');
        return apiClient(originalRequest);
      } catch (refreshError) {
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
