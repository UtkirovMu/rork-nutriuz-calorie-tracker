import { useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { UserProfile, DailyTargets, MealEntry, MealType, WeightEntry, UnlockedAchievement, AchievementId, ProgressPhoto } from '@/types';
import { calculateDailyTargets, getTodayDateString } from '@/utils/calculations';
import { profileApi, mealsApi, weightApi, achievementsApi, photosApi, streakApi } from '@/utils/api';

const PROFILE_KEY = 'nutriuz_profile';
const MEALS_KEY = 'nutriuz_meals';
const WEIGHT_KEY = 'nutriuz_weight_history';
const ACHIEVEMENTS_KEY = 'nutriuz_achievements';
const PHOTOS_KEY = 'nutriuz_progress_photos';
const STREAK_KEY = 'nutriuz_streak';

const defaultProfile: UserProfile = {
  name: '',
  gender: 'male',
  age: 25,
  height: 170,
  weight: 70,
  targetWeight: 70,
  goal: 'maintain',
  activityLevel: 'moderate',
  onboardingComplete: false,
};

interface StreakData {
  currentStreak: number;
  lastLogDate: string;
  longestStreak: number;
}

async function loadLocal<T>(key: string, fallback: T): Promise<T> {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function saveLocal(key: string, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.log('[UserContext] Local save error:', e);
  }
}

export const [UserProvider, useUser] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [achievements, setAchievements] = useState<UnlockedAchievement[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [streak, setStreak] = useState<StreakData>({ currentStreak: 0, lastLogDate: '', longestStreak: 0 });

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      try {
        const apiProfile = await profileApi.get();
        await saveLocal(PROFILE_KEY, apiProfile);
        return apiProfile;
      } catch (e) {
        console.log('[UserContext] API profile fetch failed, using local:', e);
        return loadLocal<UserProfile>(PROFILE_KEY, defaultProfile);
      }
    },
  });

  const mealsQuery = useQuery({
    queryKey: ['meals'],
    queryFn: async () => {
      try {
        const apiMeals = await mealsApi.getAll();
        await saveLocal(MEALS_KEY, apiMeals);
        return apiMeals;
      } catch (e) {
        console.log('[UserContext] API meals fetch failed, using local:', e);
        return loadLocal<MealEntry[]>(MEALS_KEY, []);
      }
    },
  });

  const weightQuery = useQuery({
    queryKey: ['weightHistory'],
    queryFn: async () => {
      try {
        const apiWeight = await weightApi.getAll();
        await saveLocal(WEIGHT_KEY, apiWeight);
        return apiWeight;
      } catch (e) {
        console.log('[UserContext] API weight fetch failed, using local:', e);
        return loadLocal<WeightEntry[]>(WEIGHT_KEY, []);
      }
    },
  });

  const achievementsQuery = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      try {
        const apiAch = await achievementsApi.getAll();
        await saveLocal(ACHIEVEMENTS_KEY, apiAch);
        return apiAch;
      } catch (e) {
        console.log('[UserContext] API achievements fetch failed, using local:', e);
        return loadLocal<UnlockedAchievement[]>(ACHIEVEMENTS_KEY, []);
      }
    },
  });

  const photosQuery = useQuery({
    queryKey: ['progressPhotos'],
    queryFn: async () => {
      try {
        const apiPhotos = await photosApi.getAll();
        await saveLocal(PHOTOS_KEY, apiPhotos);
        return apiPhotos;
      } catch (e) {
        console.log('[UserContext] API photos fetch failed, using local:', e);
        return loadLocal<ProgressPhoto[]>(PHOTOS_KEY, []);
      }
    },
  });

  const streakQuery = useQuery({
    queryKey: ['streak'],
    queryFn: async () => {
      try {
        const apiStreak = await streakApi.get();
        await saveLocal(STREAK_KEY, apiStreak);
        return apiStreak;
      } catch (e) {
        console.log('[UserContext] API streak fetch failed, using local:', e);
        return loadLocal<StreakData>(STREAK_KEY, { currentStreak: 0, lastLogDate: '', longestStreak: 0 });
      }
    },
  });

  useEffect(() => { if (profileQuery.data) setProfile(profileQuery.data); }, [profileQuery.data]);
  useEffect(() => { if (mealsQuery.data) setMeals(mealsQuery.data); }, [mealsQuery.data]);
  useEffect(() => { if (weightQuery.data) setWeightHistory(weightQuery.data); }, [weightQuery.data]);
  useEffect(() => { if (achievementsQuery.data) setAchievements(achievementsQuery.data); }, [achievementsQuery.data]);
  useEffect(() => { if (photosQuery.data) setProgressPhotos(photosQuery.data); }, [photosQuery.data]);
  useEffect(() => { if (streakQuery.data) setStreak(streakQuery.data); }, [streakQuery.data]);

  const saveProfileMutation = useMutation({
    mutationFn: async (newProfile: UserProfile) => {
      await saveLocal(PROFILE_KEY, newProfile);
      try {
        await profileApi.update(newProfile);
      } catch (e) {
        console.log('[UserContext] API profile save failed:', e);
      }
      return newProfile;
    },
    onSuccess: (data) => {
      setProfile(data);
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const saveMealsMutation = useMutation({
    mutationFn: async (params: { meals: MealEntry[]; newMeal?: MealEntry }) => {
      await saveLocal(MEALS_KEY, params.meals);
      if (params.newMeal) {
        try {
          await mealsApi.add(params.newMeal);
        } catch (e) {
          console.log('[UserContext] API meal add failed:', e);
        }
      }
      return params.meals;
    },
    onSuccess: (data) => {
      setMeals(data);
    },
  });

  const removeMealMutation = useMutation({
    mutationFn: async (params: { id: string; updatedMeals: MealEntry[] }) => {
      await saveLocal(MEALS_KEY, params.updatedMeals);
      try {
        await mealsApi.remove(params.id);
      } catch (e) {
        console.log('[UserContext] API meal remove failed:', e);
      }
      return params.updatedMeals;
    },
    onSuccess: (data) => {
      setMeals(data);
    },
  });

  const saveWeightMutation = useMutation({
    mutationFn: async (params: { entries: WeightEntry[]; date: string; weight: number }) => {
      await saveLocal(WEIGHT_KEY, params.entries);
      try {
        await weightApi.add(params.date, params.weight);
      } catch (e) {
        console.log('[UserContext] API weight add failed:', e);
      }
      return params.entries;
    },
    onSuccess: (data) => {
      setWeightHistory(data);
    },
  });

  const saveAchievementsMutation = useMutation({
    mutationFn: async (params: { entries: UnlockedAchievement[]; newId?: AchievementId }) => {
      await saveLocal(ACHIEVEMENTS_KEY, params.entries);
      if (params.newId) {
        try {
          await achievementsApi.unlock(params.newId);
        } catch (e) {
          console.log('[UserContext] API achievement unlock failed:', e);
        }
      }
      return params.entries;
    },
    onSuccess: (data) => {
      setAchievements(data);
    },
  });

  const savePhotosMutation = useMutation({
    mutationFn: async (params: { entries: ProgressPhoto[]; newPhoto?: ProgressPhoto; removeId?: string }) => {
      await saveLocal(PHOTOS_KEY, params.entries);
      if (params.newPhoto) {
        try {
          await photosApi.add(params.newPhoto);
        } catch (e) {
          console.log('[UserContext] API photo add failed:', e);
        }
      }
      if (params.removeId) {
        try {
          await photosApi.remove(params.removeId);
        } catch (e) {
          console.log('[UserContext] API photo remove failed:', e);
        }
      }
      return params.entries;
    },
    onSuccess: (data) => {
      setProgressPhotos(data);
    },
  });

  const saveStreakMutation = useMutation({
    mutationFn: async (data: StreakData) => {
      await saveLocal(STREAK_KEY, data);
      try {
        await streakApi.update(data);
      } catch (e) {
        console.log('[UserContext] API streak update failed:', e);
      }
      return data;
    },
    onSuccess: (data) => {
      setStreak(data);
    },
  });

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    const updated = { ...profile, ...updates };
    saveProfileMutation.mutate(updated);
  }, [profile, saveProfileMutation]);

  const addMeal = useCallback((entry: MealEntry) => {
    const updated = [...meals, entry];
    saveMealsMutation.mutate({ meals: updated, newMeal: entry });

    const today = getTodayDateString();
    const yesterday = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    let newStreak = { ...streak };
    if (streak.lastLogDate !== today) {
      if (streak.lastLogDate === yesterday) {
        newStreak.currentStreak += 1;
      } else {
        newStreak.currentStreak = 1;
      }
      newStreak.lastLogDate = today;
      newStreak.longestStreak = Math.max(newStreak.longestStreak, newStreak.currentStreak);
      saveStreakMutation.mutate(newStreak);
    }
  }, [meals, saveMealsMutation, streak, saveStreakMutation]);

  const removeMeal = useCallback((id: string) => {
    const updated = meals.filter(m => m.id !== id);
    removeMealMutation.mutate({ id, updatedMeals: updated });
  }, [meals, removeMealMutation]);

  const addWeightEntry = useCallback((weight: number) => {
    const today = getTodayDateString();
    const existing = weightHistory.filter(w => w.date !== today);
    const updated = [...existing, { date: today, weight }];
    updated.sort((a, b) => a.date.localeCompare(b.date));
    saveWeightMutation.mutate({ entries: updated, date: today, weight });
  }, [weightHistory, saveWeightMutation]);

  const unlockAchievement = useCallback((id: AchievementId) => {
    if (achievements.some(a => a.id === id)) return false;
    const updated = [...achievements, { id, unlockedAt: Date.now() }];
    saveAchievementsMutation.mutate({ entries: updated, newId: id });
    return true;
  }, [achievements, saveAchievementsMutation]);

  const isAchievementUnlocked = useCallback((id: AchievementId) => {
    return achievements.some(a => a.id === id);
  }, [achievements]);

  const addProgressPhoto = useCallback((uri: string, note?: string) => {
    const photo: ProgressPhoto = {
      id: Date.now().toString(),
      uri,
      date: getTodayDateString(),
      timestamp: Date.now(),
      note,
    };
    const updated = [...progressPhotos, photo];
    savePhotosMutation.mutate({ entries: updated, newPhoto: photo });
    return photo;
  }, [progressPhotos, savePhotosMutation]);

  const removeProgressPhoto = useCallback((id: string) => {
    const updated = progressPhotos.filter(p => p.id !== id);
    savePhotosMutation.mutate({ entries: updated, removeId: id });
  }, [progressPhotos, savePhotosMutation]);

  const dailyTargets: DailyTargets = useMemo(() => {
    if (profile.onboardingComplete) {
      return calculateDailyTargets(profile);
    }
    return { calories: 2000, protein: 150, carbs: 200, fats: 67 };
  }, [profile]);

  const todayMeals = useMemo(() => {
    return meals.filter(m => m.date === getTodayDateString());
  }, [meals]);

  const todayTotals = useMemo(() => {
    return todayMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.foodItem.calories,
        protein: acc.protein + m.foodItem.protein,
        carbs: acc.carbs + m.foodItem.carbs,
        fats: acc.fats + m.foodItem.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [todayMeals]);

  const getLast7DaysCalories = useCallback(() => {
    const result: { date: string; calories: number; label: string }[] = [];
    const dayLabels = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayMeals = meals.filter(m => m.date === dateStr);
      const cals = dayMeals.reduce((sum, m) => sum + m.foodItem.calories, 0);
      result.push({ date: dateStr, calories: Math.round(cals), label: dayLabels[d.getDay()] });
    }
    return result;
  }, [meals]);

  const getLast30DaysCalories = useCallback(() => {
    const result: { date: string; calories: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayMeals = meals.filter(m => m.date === dateStr);
      const cals = dayMeals.reduce((sum, m) => sum + m.foodItem.calories, 0);
      result.push({ date: dateStr, calories: Math.round(cals) });
    }
    return result;
  }, [meals]);

  const isLoading = profileQuery.isLoading || mealsQuery.isLoading;

  return useMemo(() => ({
    profile,
    updateProfile,
    dailyTargets,
    meals,
    todayMeals,
    todayTotals,
    addMeal,
    removeMeal,
    weightHistory,
    addWeightEntry,
    achievements,
    unlockAchievement,
    isAchievementUnlocked,
    progressPhotos,
    addProgressPhoto,
    removeProgressPhoto,
    streak,
    getLast7DaysCalories,
    getLast30DaysCalories,
    isLoading,
  }), [profile, updateProfile, dailyTargets, meals, todayMeals, todayTotals, addMeal, removeMeal, weightHistory, addWeightEntry, achievements, unlockAchievement, isAchievementUnlocked, progressPhotos, addProgressPhoto, removeProgressPhoto, streak, getLast7DaysCalories, getLast30DaysCalories, isLoading]);
});

export function useMealsByType(mealType: MealType): MealEntry[] {
  const { todayMeals } = useUser();
  return todayMeals.filter(m => m.mealType === mealType);
}
