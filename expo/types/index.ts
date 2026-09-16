export type Gender = 'male' | 'female';
export type Goal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'sedentary' | 'moderate' | 'active';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface UserProfile {
  name: string;
  gender: Gender;
  age: number;
  height: number;
  weight: number;
  targetWeight: number;
  goal: Goal;
  activityLevel: ActivityLevel;
  onboardingComplete: boolean;
  email?: string;
  phone?: string;
}

export interface DailyTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface FoodItem {
  id: string;
  name: string;
  nameUz?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portionSize: number;
  portionUnit: string;
  imageUri?: string;
}

export interface MealEntry {
  id: string;
  foodItem: FoodItem;
  mealType: MealType;
  date: string;
  timestamp: number;
}

export interface DailyLog {
  date: string;
  meals: MealEntry[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
}

export interface AIFoodResult {
  name: string;
  nameUz?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  estimatedPortionGrams: number;
  confidence: number;
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface ProgressPhoto {
  id: string;
  uri: string;
  date: string;
  timestamp: number;
  note?: string;
}

export type AchievementId =
  | 'first_meal'
  | 'streak_3'
  | 'streak_7'
  | 'streak_14'
  | 'streak_30'
  | 'meals_10'
  | 'meals_50'
  | 'meals_100'
  | 'calorie_goal_hit'
  | 'calorie_goal_7days'
  | 'protein_master'
  | 'scanner_first'
  | 'weight_logged'
  | 'photo_first'
  | 'chat_first'
  | 'meal_plan_first';

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  emoji: string;
  category: 'streak' | 'meals' | 'goals' | 'features';
  requirement: number;
}

export interface UnlockedAchievement {
  id: AchievementId;
  unlockedAt: number;
}

export interface MealPlanItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portion: string;
}

export interface DayMealPlan {
  day: string;
  breakfast: MealPlanItem;
  lunch: MealPlanItem;
  dinner: MealPlanItem;
  snack: MealPlanItem;
  totalCalories: number;
}

export interface WeeklyMealPlan {
  days: DayMealPlan[];
  generatedAt: number;
}

export interface AIAnalysisResult {
  summary: string;
  calorieStatus: 'low' | 'on_track' | 'high';
  proteinStatus: 'low' | 'on_track' | 'high';
  tips: string[];
  score: number;
}
