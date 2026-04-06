import { ActivityLevel, DailyTargets, Gender, UserProfile } from '@/types';

export function calculateBMR(gender: Gender, weight: number, height: number, age: number): number {
  if (gender === 'male') {
    return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  }
  return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
}

export function getActivityMultiplier(level: ActivityLevel): number {
  switch (level) {
    case 'sedentary': return 1.2;
    case 'moderate': return 1.55;
    case 'active': return 1.725;
  }
}

export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile.gender, profile.weight, profile.height, profile.age);
  return Math.round(bmr * getActivityMultiplier(profile.activityLevel));
}

export function calculateDailyTargets(profile: UserProfile): DailyTargets {
  const tdee = calculateTDEE(profile);

  let calories: number;
  const weightDiff = (profile.targetWeight || profile.weight) - profile.weight;

  if (profile.goal === 'lose') {
    const deficit = Math.min(Math.abs(weightDiff) * 50, 750);
    calories = tdee - Math.max(deficit, 300);
  } else if (profile.goal === 'gain') {
    const surplus = Math.min(Math.abs(weightDiff) * 50, 750);
    calories = tdee + Math.max(surplus, 300);
  } else {
    calories = tdee;
  }

  calories = Math.max(calories, 1200);

  const protein = Math.round((calories * 0.30) / 4);
  const carbs = Math.round((calories * 0.40) / 4);
  const fats = Math.round((calories * 0.30) / 9);

  return { calories, protein, carbs, fats };
}

export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}
