import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, MealEntry, WeightEntry, UnlockedAchievement, ProgressPhoto, AchievementId } from '@/types';

const API_BASE_URL = 'https://68bafc6d1e302.myxvest1.ru/Fitnes/api';

const FETCH_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url: string, config: RequestInit, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...config, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

const TOKEN_KEY = 'nutriuz_api_token';
const AUTH_KEY = 'nutriuz_auth';

let cachedToken: string | null = null;

function sanitizeToken(rawToken: string | null | undefined): string | null {
  if (typeof rawToken !== 'string') {
    return null;
  }

  const normalizedToken = rawToken.replace(/^Bearer\s+/i, '').trim();
  return normalizedToken.length > 0 ? normalizedToken : null;
}

async function getToken(): Promise<string | null> {
  if (cachedToken) {
    return cachedToken;
  }

  const storedToken = sanitizeToken(await AsyncStorage.getItem(TOKEN_KEY));
  if (storedToken) {
    cachedToken = storedToken;
    return storedToken;
  }

  try {
    const storedAuth = await AsyncStorage.getItem(AUTH_KEY);
    if (!storedAuth) {
      return null;
    }

    const parsedAuth = JSON.parse(storedAuth) as { token?: unknown };
    const authToken = typeof parsedAuth.token === 'string' ? sanitizeToken(parsedAuth.token) : null;

    if (authToken) {
      cachedToken = authToken;
      await AsyncStorage.setItem(TOKEN_KEY, authToken);
      console.log('[API] Token restored from auth storage');
      return authToken;
    }
  } catch (error) {
    console.log('[API] Failed to restore token from auth storage:', error);
  }

  return null;
}

async function setToken(token: string): Promise<void> {
  const normalizedToken = sanitizeToken(token);

  if (!normalizedToken) {
    cachedToken = null;
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }

  cachedToken = normalizedToken;
  await AsyncStorage.setItem(TOKEN_KEY, normalizedToken);
}

async function clearToken(): Promise<void> {
  cachedToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function syncStoredToken(token: string | null | undefined): Promise<void> {
  const normalizedToken = sanitizeToken(token);

  if (!normalizedToken) {
    await clearToken();
    return;
  }

  await setToken(normalizedToken);
}

export async function clearStoredToken(): Promise<void> {
  await clearToken();
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: Record<string, unknown>;
    requireAuth?: boolean;
  } = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, requireAuth = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (requireAuth) {
    const token = await getToken();
    if (!token) {
      console.log('[API] No token found, skipping auth request to', endpoint);
      throw new Error('NOT_AUTHENTICATED');
    }
    headers.Authorization = `Bearer ${token}`;
    headers['X-Authorization'] = `Bearer ${token}`;
    headers['X-Access-Token'] = token;
    console.log('[API] Auth headers attached for', endpoint);
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[API] ${method} ${url}`);

  try {
    const response = await fetchWithTimeout(url, config);
    const json = await response.json() as ApiResponse<T>;

    if (!response.ok) {
      console.log(`[API] Error ${response.status}:`, json.error || json.message);
      throw new Error(json.error || json.message || `HTTP ${response.status}`);
    }

    console.log(`[API] Response:`, JSON.stringify(json).substring(0, 200));
    return json;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log(`[API] Request timed out: ${url}`);
      throw new Error('REQUEST_TIMEOUT');
    }
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.log(`[API] Network error (server unreachable): ${url}`);
      throw new Error('NETWORK_ERROR');
    }
    console.error(`[API] Request failed:`, error);
    throw error;
  }
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message === 'NETWORK_ERROR' || error.message === 'REQUEST_TIMEOUT' || error.message === 'Failed to fetch';
  }
  return false;
}

export const authApi = {
  sendCode: async (method: 'email' | 'phone', identifier: string) => {
    try {
      const res = await apiRequest<{ message: string }>('/auth/send-code', {
        method: 'POST',
        body: { method, identifier },
        requireAuth: false,
      });
      return res.data!;
    } catch (error) {
      if (isNetworkError(error)) {
        throw new Error('SERVER_UNAVAILABLE');
      }
      throw error;
    }
  },

  verifyCode: async (method: 'email' | 'phone', identifier: string, code: string) => {
    try {
      const res = await apiRequest<{
        token: string;
        isNewUser: boolean;
        profile: UserProfile | null;
      }>('/auth/verify-code', {
        method: 'POST',
        body: { method, identifier, code },
        requireAuth: false,
      });
      if (res.data?.token) {
        await setToken(res.data.token);
      }
      return res.data!;
    } catch (error) {
      if (isNetworkError(error)) {
        throw new Error('SERVER_UNAVAILABLE');
      }
      throw error;
    }
  },

  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.log('[API] Logout error (ignored):', e);
    }
    await clearToken();
  },

  checkToken: async () => {
    const token = await getToken();
    if (!token) return null;
    try {
      const res = await apiRequest<{ profile: UserProfile }>('/auth/check');
      return res.data;
    } catch {
      await clearToken();
      return null;
    }
  },
};

export const profileApi = {
  get: async () => {
    const res = await apiRequest<{ profile: UserProfile }>('/profile');
    return res.data!.profile;
  },

  update: async (profile: Partial<UserProfile>) => {
    const res = await apiRequest<{ profile: UserProfile }>('/profile', {
      method: 'PUT',
      body: profile as Record<string, unknown>,
    });
    return res.data!.profile;
  },
};

export const mealsApi = {
  getAll: async () => {
    const res = await apiRequest<{ meals: MealEntry[] }>('/meals');
    return res.data!.meals;
  },

  getByDate: async (date: string) => {
    const res = await apiRequest<{ meals: MealEntry[] }>(`/meals?date=${date}`);
    return res.data!.meals;
  },

  add: async (meal: MealEntry) => {
    const res = await apiRequest<{ meal: MealEntry }>('/meals', {
      method: 'POST',
      body: meal as unknown as Record<string, unknown>,
    });
    return res.data!.meal;
  },

  remove: async (id: string) => {
    await apiRequest(`/meals/${id}`, { method: 'DELETE' });
  },
};

export const weightApi = {
  getAll: async () => {
    const res = await apiRequest<{ entries: WeightEntry[] }>('/weight');
    return res.data!.entries;
  },

  add: async (date: string, weight: number) => {
    const res = await apiRequest<{ entry: WeightEntry }>('/weight', {
      method: 'POST',
      body: { date, weight },
    });
    return res.data!.entry;
  },
};

export const achievementsApi = {
  getAll: async () => {
    const res = await apiRequest<{ achievements: UnlockedAchievement[] }>('/achievements');
    return res.data!.achievements;
  },

  unlock: async (id: AchievementId) => {
    const res = await apiRequest<{ achievement: UnlockedAchievement }>('/achievements', {
      method: 'POST',
      body: { id },
    });
    return res.data!.achievement;
  },
};

export const photosApi = {
  getAll: async () => {
    const res = await apiRequest<{ photos: ProgressPhoto[] }>('/photos');
    return res.data!.photos;
  },

  add: async (photo: ProgressPhoto) => {
    const res = await apiRequest<{ photo: ProgressPhoto }>('/photos', {
      method: 'POST',
      body: photo as unknown as Record<string, unknown>,
    });
    return res.data!.photo;
  },

  remove: async (id: string) => {
    await apiRequest(`/photos/${id}`, { method: 'DELETE' });
  },
};

export const streakApi = {
  get: async () => {
    const res = await apiRequest<{ streak: { currentStreak: number; lastLogDate: string; longestStreak: number } }>('/streak');
    return res.data!.streak;
  },

  update: async (streak: { currentStreak: number; lastLogDate: string; longestStreak: number }) => {
    const res = await apiRequest<{ streak: typeof streak }>('/streak', {
      method: 'PUT',
      body: streak,
    });
    return res.data!.streak;
  },
};

export const mealPlanApi = {
  get: async () => {
    const res = await apiRequest<{ mealPlan: unknown }>('/meal-plan');
    return res.data!.mealPlan;
  },

  save: async (plan: unknown) => {
    const res = await apiRequest<{ mealPlan: unknown }>('/meal-plan', {
      method: 'POST',
      body: { plan: plan },
    });
    return res.data!.mealPlan;
  },
};

export const settingsApi = {
  get: async () => {
    const res = await apiRequest<{ settings: { theme: string; language: string } }>('/settings');
    return res.data!.settings;
  },

  update: async (settings: { theme?: string; language?: string }) => {
    const res = await apiRequest<{ settings: { theme: string; language: string } }>('/settings', {
      method: 'PUT',
      body: settings,
    });
    return res.data!.settings;
  },
};
