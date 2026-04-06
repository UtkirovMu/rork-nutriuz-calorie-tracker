import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, MealEntry, WeightEntry, UnlockedAchievement, ProgressPhoto, AchievementId } from '@/types';

const API_BASE_URL = 'https://68bafc6d1e302.myxvest1.ru/Fitnes/api';

const TOKEN_KEY = 'nutriuz_api_token';

let cachedToken: string | null = null;

async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  return cachedToken;
}

async function setToken(token: string): Promise<void> {
  cachedToken = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

async function clearToken(): Promise<void> {
  cachedToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
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
    headers['Authorization'] = `Bearer ${token}`;
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
    const response = await fetch(url, config);
    const json = await response.json() as ApiResponse<T>;

    if (!response.ok) {
      console.log(`[API] Error ${response.status}:`, json.error || json.message);
      throw new Error(json.error || json.message || `HTTP ${response.status}`);
    }

    console.log(`[API] Response:`, JSON.stringify(json).substring(0, 200));
    return json;
  } catch (error) {
    console.error(`[API] Request failed:`, error);
    throw error;
  }
}

export const authApi = {
  sendCode: async (method: 'email' | 'phone', identifier: string) => {
    const res = await apiRequest<{ message: string }>('/auth/send-code', {
      method: 'POST',
      body: { method, identifier },
      requireAuth: false,
    });
    return res.data!;
  },

  verifyCode: async (method: 'email' | 'phone', identifier: string, code: string) => {
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
