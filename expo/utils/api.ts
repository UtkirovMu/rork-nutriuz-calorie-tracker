import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserProfile,
  MealEntry,
  WeightEntry,
  UnlockedAchievement,
  AchievementId,
  ProgressPhoto,
} from '@/types';

const API_TOKEN_KEY = 'nutriuz_api_token';
const API_USER_ID_KEY = 'nutriuz_api_user_id';
const API_SECRET_KEY = 'hdiuasd76887';

let BASE_URL = 'https://68bafc6d1e302.myxvest1.ru/Fitnes/api';

export function setApiBaseUrl(url: string) {
  BASE_URL = url;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface LoginResponse {
  otp_sent: boolean;
  message: string;
}

interface VerifyResponse {
  token: string;
  user_id: number;
  is_new_user: boolean;
  profile: UserProfile | null;
}

interface StreakData {
  currentStreak: number;
  lastLogDate: string;
  longestStreak: number;
}

interface WeeklyMealPlanData {
  days: Array<{
    day: string;
    breakfast: MealPlanItem;
    lunch: MealPlanItem;
    dinner: MealPlanItem;
    snack: MealPlanItem;
    totalCalories: number;
  }>;
}

interface MealPlanItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portion: string;
}

interface UserSettings {
  theme: string;
  language: string;
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(API_TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(API_TOKEN_KEY, token);
}

export async function saveUserId(id: number): Promise<void> {
  await AsyncStorage.setItem(API_USER_ID_KEY, String(id));
}

export async function getUserId(): Promise<number | null> {
  const id = await AsyncStorage.getItem(API_USER_ID_KEY);
  return id ? parseInt(id, 10) : null;
}

export async function clearAuthData(): Promise<void> {
  await AsyncStorage.multiRemove([API_TOKEN_KEY, API_USER_ID_KEY]);
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retries: number = 2
): Promise<ApiResponse<T>> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (Platform.OS !== 'web') {
    headers['X-API-Key'] = API_SECRET_KEY;
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const separator = endpoint.includes('?') ? '&' : '?';
  const apiKeyParam = Platform.OS === 'web' ? `${separator}api_key=${API_SECRET_KEY}` : '';
  const url = `${BASE_URL}${endpoint}${apiKeyParam}`;
  console.log(`[API] ${options.method || 'GET'} ${url}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    let json: ApiResponse<T>;
    try {
      json = JSON.parse(text) as ApiResponse<T>;
    } catch {
      console.error(`[API] Invalid JSON response:`, text.slice(0, 300));
      throw new Error(`Server returned invalid response`);
    }

    console.log(`[API] Response ${response.status}:`, JSON.stringify(json).slice(0, 200));

    if (!response.ok) {
      throw new Error(json.error || json.message || `HTTP ${response.status}`);
    }

    return json;
  } catch (error: unknown) {
    const isNetworkError =
      error instanceof TypeError && (error.message === 'Failed to fetch' || error.message === 'Network request failed');
    const isAbortError = error instanceof DOMException && error.name === 'AbortError';

    if ((isNetworkError || isAbortError) && retries > 0) {
      console.log(`[API] Retrying... (${retries} left)`);
      await new Promise((r) => setTimeout(r, 1000));
      return request<T>(endpoint, options, retries - 1);
    }

    console.error(`[API] Error:`, error);
    throw error;
  }
}

export const authApi = {
  sendCode: async (method: 'email' | 'phone', identifier: string) => {
    const res = await request<LoginResponse>('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ method, identifier }),
    });
    return res.data!;
  },

  verifyCode: async (method: 'email' | 'phone', identifier: string, code: string) => {
    const res = await request<VerifyResponse>('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ method, identifier, code }),
    });
    if (res.data?.token) {
      await saveToken(res.data.token);
      await saveUserId(res.data.user_id);
    }
    return res.data!;
  },

  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.log('[API] Logout error (ignored):', e);
    }
    await clearAuthData();
  },

  checkSession: async () => {
    const res = await request<{ valid: boolean; user_id: number }>('/auth/check');
    return res.data!;
  },
};

export const profileApi = {
  get: async () => {
    const res = await request<UserProfile>('/profile');
    return res.data!;
  },

  update: async (profile: Partial<UserProfile>) => {
    const res = await request<UserProfile>('/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
    return res.data!;
  },
};

export const mealsApi = {
  getAll: async () => {
    const res = await request<MealEntry[]>('/meals');
    return res.data ?? [];
  },

  getByDate: async (date: string) => {
    const res = await request<MealEntry[]>(`/meals?date=${date}`);
    return res.data ?? [];
  },

  add: async (meal: MealEntry) => {
    const res = await request<MealEntry>('/meals', {
      method: 'POST',
      body: JSON.stringify(meal),
    });
    return res.data!;
  },

  remove: async (id: string) => {
    await request(`/meals/${id}`, { method: 'DELETE' });
  },
};

export const weightApi = {
  getAll: async () => {
    const res = await request<WeightEntry[]>('/weight');
    return res.data ?? [];
  },

  add: async (entry: WeightEntry) => {
    const res = await request<WeightEntry>('/weight', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
    return res.data!;
  },
};

export const achievementsApi = {
  getAll: async () => {
    const res = await request<UnlockedAchievement[]>('/achievements');
    return res.data ?? [];
  },

  unlock: async (id: AchievementId) => {
    const res = await request<UnlockedAchievement>('/achievements', {
      method: 'POST',
      body: JSON.stringify({ id, unlockedAt: Date.now() }),
    });
    return res.data!;
  },
};

export const photosApi = {
  getAll: async () => {
    const res = await request<ProgressPhoto[]>('/photos');
    return res.data ?? [];
  },

  add: async (photo: ProgressPhoto) => {
    const res = await request<ProgressPhoto>('/photos', {
      method: 'POST',
      body: JSON.stringify(photo),
    });
    return res.data!;
  },

  remove: async (id: string) => {
    await request(`/photos/${id}`, { method: 'DELETE' });
  },
};

export const streakApi = {
  get: async () => {
    const res = await request<StreakData>('/streak');
    return res.data ?? { currentStreak: 0, lastLogDate: '', longestStreak: 0 };
  },

  update: async (streak: StreakData) => {
    const res = await request<StreakData>('/streak', {
      method: 'PUT',
      body: JSON.stringify(streak),
    });
    return res.data!;
  },
};

export const mealPlanApi = {
  get: async () => {
    const res = await request<WeeklyMealPlanData>('/meal-plan');
    return res.data ?? null;
  },

  save: async (plan: WeeklyMealPlanData) => {
    const res = await request<WeeklyMealPlanData>('/meal-plan', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
    return res.data!;
  },
};

export const settingsApi = {
  get: async () => {
    const res = await request<UserSettings>('/settings');
    return res.data ?? { theme: 'system', language: 'uz' };
  },

  update: async (settings: Partial<UserSettings>) => {
    const res = await request<UserSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return res.data!;
  },
};
