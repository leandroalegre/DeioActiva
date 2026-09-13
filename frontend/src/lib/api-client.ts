import axios from 'axios';

// NOTA de seguridad (Fase 1): el access/refresh token se guardan en localStorage para
// simplificar las pruebas de esta primera etapa. Antes de exponer esto a produccion real,
// evaluar mover el refresh token a una cookie httpOnly (requiere sumar cookie-parser y
// CORS con credentials en el backend, ademas de ajustar este cliente).
const ACCESS_TOKEN_KEY = 'deioactiva_access_token';
const REFRESH_TOKEN_KEY = 'deioactiva_refresh_token';

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api',
});

// Extrae el mensaje que manda el backend (ej. un ConflictException de "no se puede eliminar
// porque tiene tareas asociadas") para mostrarlo tal cual en vez de un error generico.
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = err.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message.length > 0) return message.join(' ');
  }
  return fallback;
}

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    throw new Error('No hay refresh token disponible');
  }
  const { data } = await axios.post(
    `${apiClient.defaults.baseURL}/auth/refresh`,
    { refreshToken },
  );
  tokenStorage.setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const newAccessToken = await refreshPromise;
        refreshPromise = null;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
