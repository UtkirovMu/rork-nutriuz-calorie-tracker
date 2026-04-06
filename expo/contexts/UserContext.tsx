import { useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { UserProfile, DailyTargets, MealEntry, MealType, WeightEntry, UnlockedAchievement, AchievementId, ProgressPhoto } from '@/types';
import { calculateDailyTargets, getTodayDateString } from '@/utils/calculations';

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
      const stored = await AsyncStorage.getItem(PROFILE_KEY);
      return stored ? (JSON.parse(stored) as UserProfile) : defaultProfile;
    },
  });

  const mealsQuery = useQuery({
    queryKey: ['meals'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(MEALS_KEY);
      return stored ? (JSON.parse(stored) as MealEntry[]) : [];
    },
  });

  const weightQuery = useQuery({
    queryKey: ['weightHistory'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(WEIGHT_KEY);
      return stored ? (JSON.parse(stored) as WeightEntry[]) : [];
    },
  });

  const achievementsQuery = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
      return stored ? (JSON.parse(stored) as UnlockedAchievement[]) : [];
    },
  });

  const photosQuery = useQuery({
    queryKey: ['progressPhotos'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(PHOTOS_KEY);
      return stored ? (JSON.parse(stored) as ProgressPhoto[]) : [];
    },
  });

  const streakQuery = useQuery({
    queryKey: ['streak'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STREAK_KEY);
      return stored ? (JSON.parse(stored) as StreakData) : { currentStreak: 0, lastLogDate: '', longestStreak: 0 };
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
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      return newProfile;
    },
    onSuccess: (data) => {
      setProfile(data);
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const saveMealsMutation = useMutation({
    mutationFn: async (newMeals: MealEntry[]) => {
      await AsyncStorage.setItem(MEALS_KEY, JSON.stringify(newMeals));
      return newMeals;
    },
    onSuccess: (data) => {
      setMeals(data);
      void queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });

  const saveWeightMutation = useMutation({
    mutationFn: async (entries: WeightEntry[]) => {
      await AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(entries));
      return entries;
    },
    onSuccess: (data) => {
      setWeightHistory(data);
      void queryClient.invalidateQueries({ queryKey: ['weightHistory'] });
    },
  });

  const saveAchievementsMutation = useMutation({
    mutationFn: async (entries: UnlockedAchievement[]) => {
      await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(entries));
      return entries;
    },
    onSuccess: (data) => {
      setAchievements(data);
      void queryClient.invalidateQueries({ queryKey: ['achievements'] });
    },
  });

  const savePhotosMutation = useMutation({
    mutationFn: async (entries: ProgressPhoto[]) => {
      await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(entries));
      return entries;
    },
    onSuccess: (data) => {
      setProgressPhotos(data);
      void queryClient.invalidateQueries({ queryKey: ['progressPhotos'] });
    },
  });

  const saveStreakMutation = useMutation({
    mutationFn: async (data: StreakData) => {
      await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(data));
      return data;
    },
    onSuccess: (data) => {
      setStreak(data);
      void queryClient.invalidateQueries({ queryKey: ['streak'] });
    },
  });

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    const updated = { ...profile, ...updates };
    saveProfileMutation.mutate(updated);
  }, [profile, saveProfileMutation]);

  const addMeal = useCallback((entry: MealEntry) => {
    const updated = [...meals, entry];
    saveMealsMutation.mutate(updated);

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
    saveMealsMutation.mutate(updated);
  }, [meals, saveMealsMutation]);

  const addWeightEntry = useCallback((weight: number) => {
    const today = getTodayDateString();
    const existing = weightHistory.filter(w => w.date !== today);
    const updated = [...existing, { date: today, weight }];
    updated.sort((a, b) => a.date.localeCompare(b.date));
    saveWeightMutation.mutate(updated);
  }, [weightHistory, saveWeightMutation]);

  const unlockAchievement = useCallback((id: AchievementId) => {
    if (achievements.some(a => a.id === id)) return false;
    const updated = [...achievements, { id, unlockedAt: Date.now() }];
    saveAchievementsMutation.mutate(updated);
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
    savePhotosMutation.mutate(updated);
    return photo;
  }, [progressPhotos, savePhotosMutation]);

  const removeProgressPhoto = useCallback((id: string) => {
    const updated = progressPhotos.filter(p => p.id !== id);
    savePhotosMutation.mutate(updated);
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
