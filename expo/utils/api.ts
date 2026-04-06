import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserProfile,
  MealEntry,
  WeightEntry,
  UnlockedAchievement,
  ProgressPhoto,
  AchievementId,
} from '@/types';

const TOKEN_KEY = 'nutriuz_api_token';

let API_BASE_URL = 'https://your-domain.com/api';

export function setApiBaseUrl(url: string) {
  API_BASE_URL = url;
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    requiresAuth?: boolean;
    params?: Record<string, string>;
  } = {}
): Promise<T> {
  const { method = 'GET', body, requiresAuth = true, params } = options;

  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requiresAuth) {
    const token = await getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = { method, headers };
  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  console.log(`[API] ${method} ${endpoint}`, body ? JSON.stringify(body).slice(0, 200) : '');

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    console.error(`[API] Error ${response.status}:`, data);
    throw new ApiError(data?.error || 'Xatolik yuz berdi', response.status);
  }

  console.log(`[API] ${method} ${endpoint} -> OK`);
  return data as T;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// ============================================================
// AUTH API
// ============================================================

interface SendOTPResponse {
  success: boolean;
  message: string;
  otp_debug?: string;
}

interface VerifyOTPResponse {
  success: boolean;
  token: string;
  user_id: number;
  is_new_user: boolean;
  onboarding_complete: boolean;
}

interface AuthCheckResponse {
  success: boolean;
  authenticated: boolean;
  user_id?: number;
  identifier?: string;
  login_method?: 'email' | 'phone';
  onboarding_complete?: boolean;
}

export const authApi = {
  sendOTP: (method: 'email' | 'phone', identifier: string) =>
    request<SendOTPResponse>('/auth/send-otp', {
      method: 'POST',
      body: { method, identifier },
      requiresAuth: false,
    }),

  verifyOTP: async (method: 'email' | 'phone', identifier: string, otp: string) => {
    const result = await request<VerifyOTPResponse>('/auth/verify-otp', {
      method: 'POST',
      body: { method, identifier, otp },
      requiresAuth: false,
    });
    if (result.token) {
      await saveToken(result.token);
    }
    return result;
  },

  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.log('[API] Logout error (ignored):', e);
    }
    await clearToken();
  },

  check: () => request<AuthCheckResponse>('/auth/check', { requiresAuth: true }),
};

// ============================================================
// PROFILE API
// ============================================================

interface ProfileResponse {
  success: boolean;
  profile: UserProfile;
}

export const profileApi = {
  get: () => request<ProfileResponse>('/profile'),

  update: (data: Partial<UserProfile>) =>
    request<ProfileResponse>('/profile', {
      method: 'PUT',
      body: data as Record<string, unknown>,
    }),
};

// ============================================================
// MEALS API
// ============================================================

interface MealsResponse {
  success: boolean;
  meals: MealEntry[];
}

export const mealsApi = {
  getAll: (date?: string) =>
    request<MealsResponse>('/meals', {
      params: date ? { date } : undefined,
    }),

  add: (meal: MealEntry) =>
    request<{ success: boolean; id: string }>('/meals', {
      method: 'POST',
      body: meal as unknown as Record<string, unknown>,
    }),

  remove: (id: string) =>
    request<{ success: boolean }>(`/meals/${id}`, { method: 'DELETE' }),
};

// ============================================================
// WEIGHT API
// ============================================================

interface WeightResponse {
  success: boolean;
  weightHistory: WeightEntry[];
}

export const weightApi = {
  getAll: () => request<WeightResponse>('/weight'),

  add: (date: string, weight: number) =>
    request<{ success: boolean }>('/weight', {
      method: 'POST',
      body: { date, weight },
    }),
};

// ============================================================
// ACHIEVEMENTS API
// ============================================================

interface AchievementsResponse {
  success: boolean;
  achievements: UnlockedAchievement[];
}

export const achievementsApi = {
  getAll: () => request<AchievementsResponse>('/achievements'),

  unlock: (achievementId: AchievementId) =>
    request<{ success: boolean; alreadyUnlocked: boolean }>('/achievements', {
      method: 'POST',
      body: { achievementId },
    }),
};

// ============================================================
// PHOTOS API
// ============================================================

interface PhotosResponse {
  success: boolean;
  photos: ProgressPhoto[];
}

export const photosApi = {
  getAll: () => request<PhotosResponse>('/photos'),

  add: (photo: ProgressPhoto) =>
    request<{ success: boolean; id: string }>('/photos', {
      method: 'POST',
      body: photo as unknown as Record<string, unknown>,
    }),

  remove: (id: string) =>
    request<{ success: boolean }>(`/photos/${id}`, { method: 'DELETE' }),
};

// ============================================================
// STREAK API
// ============================================================

interface StreakData {
  currentStreak: number;
  lastLogDate: string;
  longestStreak: number;
}

interface StreakResponse {
  success: boolean;
  streak: StreakData;
}

export const streakApi = {
  get: () => request<StreakResponse>('/streak'),

  update: (data: StreakData) =>
    request<{ success: boolean }>('/streak', {
      method: 'PUT',
      body: data as unknown as Record<string, unknown>,
    }),
};

// ============================================================
// MEAL PLAN API
// ============================================================

export const mealPlanApi = {
  get: () =>
    request<{ success: boolean; mealPlan: Record<string, unknown> | null }>('/meal-plan'),

  save: (planData: Record<string, unknown>) =>
    request<{ success: boolean }>('/meal-plan', {
      method: 'POST',
      body: { planData },
    }),
};

// ============================================================
// SETTINGS API
// ============================================================

interface SettingsData {
  themeMode: string;
  language: string;
}

export const settingsApi = {
  get: () => request<{ success: boolean; settings: SettingsData }>('/settings'),

  update: (data: Partial<SettingsData>) =>
    request<{ success: boolean }>('/settings', {
      method: 'PUT',
      body: data as Record<string, unknown>,
    }),
};

// ============================================================
// DATA MANAGEMENT API
// ============================================================

export const dataApi = {
  clearRecords: () =>
    request<{ success: boolean }>('/data/clear-records', { method: 'POST' }),

  resetAll: () =>
    request<{ success: boolean }>('/data/reset-all', { method: 'POST' }),
};
