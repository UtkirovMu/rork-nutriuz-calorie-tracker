import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { RefreshCw, Utensils, Sunrise, Sun, Moon, Cookie } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';

const MEAL_PLAN_CACHE_KEY = 'nutriuz_meal_plan';



const mealItemSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fats: z.number(),
  portion: z.string(),
});

const dayPlanSchema = z.object({
  day: z.string(),
  breakfast: mealItemSchema,
  lunch: mealItemSchema,
  dinner: mealItemSchema,
  snack: mealItemSchema,
  totalCalories: z.number(),
});

const weeklyPlanSchema = z.object({
  days: z.array(dayPlanSchema),
});

export default function MealPlanScreen() {
  const { colors } = useTheme();
  const { tr, daysOfWeek } = useLanguage();
  const { profile, dailyTargets, unlockAchievement } = useUser();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const cachedPlanQuery = useQuery({
    queryKey: ['mealPlanCache'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(MEAL_PLAN_CACHE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored) as z.infer<typeof weeklyPlanSchema>;
        } catch {
          return null;
        }
      }
      return null;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const goalLabels = { lose: "vazn yo'qotish", maintain: 'vaznni saqlash', gain: 'vazn olish' };
      const prompt = `Sen professional dietologsan. Quyidagi ma'lumotlar asosida 7 kunlik ovqatlanish rejasi tuz.

Foydalanuvchi: ${profile.name}, ${profile.gender === 'male' ? 'Erkak' : 'Ayol'}, ${profile.age} yosh, ${profile.height} sm, ${profile.weight} kg
Maqsad: ${goalLabels[profile.goal]}, maqsad vazn: ${profile.targetWeight} kg
Kunlik kaloriya: ${dailyTargets.calories} kkal
Oqsil: ${dailyTargets.protein}g, Uglevod: ${dailyTargets.carbs}g, Yog': ${dailyTargets.fats}g

Har bir kun uchun nonushta, tushlik, kechki ovqat va gazak tayyorla.
Ovqatlar o'zbek oshxonasiga yaqin bo'lsin. Har bir ovqatning kaloriya va makronutrientlarini ko'rsat.
Kunlar: ${daysOfWeek.join(', ')}
Har bir kunning jami kaloriyasi ${dailyTargets.calories} kkal atrofida bo'lsin.`;

      const result = await generateObject({
        messages: [{ role: 'user', content: prompt }],
        schema: weeklyPlanSchema,
      });

      await AsyncStorage.setItem(MEAL_PLAN_CACHE_KEY, JSON.stringify(result));
      void queryClient.invalidateQueries({ queryKey: ['mealPlanCache'] });

      unlockAchievement('meal_plan_first');
      return result;
    },
  });

  const planData = generateMutation.data ?? cachedPlanQuery.data;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    generateMutation.mutate(undefined, {
      onSettled: () => setRefreshing(false),
    });
  }, [generateMutation]);

  const handleGenerate = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    generateMutation.mutate();
  }, [generateMutation]);

  const currentDay = planData?.days?.[selectedDay];

  const mealSections = useMemo(() => {
    if (!currentDay) return [];
    return [
      { key: 'breakfast', label: tr('meals', 'breakfast'), icon: Sunrise, color: '#FF9500', data: currentDay.breakfast },
      { key: 'lunch', label: tr('meals', 'lunch'), icon: Sun, color: '#34C759', data: currentDay.lunch },
      { key: 'dinner', label: tr('meals', 'dinner'), icon: Moon, color: '#5856D6', data: currentDay.dinner },
      { key: 'snack', label: tr('meals', 'snack'), icon: Cookie, color: '#FF2D55', data: currentDay.snack },
    ];
  }, [currentDay, tr]);

  const ds = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    emptyContainer: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 32,
      gap: 16,
    },
    emptyIconCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.primaryLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    emptyTitle: { fontSize: 24, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.5 },
    emptySubtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' as const, lineHeight: 22 },
    generateBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 28,
      paddingVertical: 16,
      borderRadius: 18,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 5,
    },
    generateBtnText: { fontSize: 17, fontWeight: '700' as const, color: colors.white },
    dayScroll: {
      marginBottom: 14,
      paddingHorizontal: 20,
    },
    dayChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: colors.surfaceSecondary,
      marginRight: 8,
    },
    dayChipActive: {
      backgroundColor: colors.primary,
    },
    dayChipText: { fontSize: 14, fontWeight: '600' as const, color: colors.textSecondary },
    dayChipTextActive: { color: colors.white },
    totalCard: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      padding: 18,
      marginHorizontal: 20,
      marginBottom: 14,
      flexDirection: 'row' as const,
      justifyContent: 'space-around' as const,
      alignItems: 'center' as const,
    },
    totalValue: { fontSize: 22, fontWeight: '800' as const, color: colors.white },
    totalLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' as const, marginTop: 2 },
    mealCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      marginHorizontal: 20,
      marginBottom: 12,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    mealHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      marginBottom: 12,
    },
    mealIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    mealLabel: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
    mealName: { fontSize: 17, fontWeight: '600' as const, color: colors.text, marginBottom: 4 },
    mealPortion: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
    macroRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
    },
    macroItem: {
      alignItems: 'center' as const,
      flex: 1,
    },
    macroValue: { fontSize: 15, fontWeight: '700' as const },
    macroLabel: { fontSize: 10, color: colors.textTertiary, fontWeight: '500' as const, marginTop: 2 },
    regenBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      marginHorizontal: 20,
      marginBottom: 14,
      paddingVertical: 14,
      backgroundColor: colors.primaryLight,
      borderRadius: 16,
    },
    regenText: { fontSize: 15, fontWeight: '600' as const, color: colors.primary },
  }), [colors]);

  if (generateMutation.isPending) {
    return (
      <View style={ds.screen}>
        <Stack.Screen options={{ title: tr('nav', 'mealPlan'), headerBackTitle: tr('nav', 'back') }} />
        <View style={ds.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[ds.emptyTitle, { fontSize: 18 }]}>{tr('mealPlan', 'generating')}</Text>
          <Text style={ds.emptySubtitle}>{tr('mealPlan', 'generatingSubtitle')}</Text>
        </View>
      </View>
    );
  }

  if (!planData) {
    return (
      <View style={ds.screen}>
        <Stack.Screen options={{ title: tr('nav', 'mealPlan'), headerBackTitle: tr('nav', 'back') }} />
        <Animated.View style={[ds.emptyContainer, { opacity: fadeAnim }]}>
          <View style={ds.emptyIconCircle}>
            <Utensils size={40} color={colors.primary} />
          </View>
          <Text style={ds.emptyTitle}>{tr('mealPlan', 'title')}</Text>
          <Text style={ds.emptySubtitle}>
            {tr('mealPlan', 'subtitle')}
          </Text>
          <TouchableOpacity style={ds.generateBtn} onPress={handleGenerate} activeOpacity={0.8} testID="generate-plan">
            <Utensils size={20} color={colors.white} />
            <Text style={ds.generateBtnText}>{tr('mealPlan', 'generateButton')}</Text>
          </TouchableOpacity>
          {generateMutation.isError && (
            <Text style={{ color: colors.danger, fontSize: 14, marginTop: 8 }}>
              {tr('mealPlan', 'generateError')}
            </Text>
          )}
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={ds.screen}>
      <Stack.Screen options={{ title: tr('nav', 'mealPlan'), headerBackTitle: tr('nav', 'back') }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <View style={{ paddingTop: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds.dayScroll}>
            {(planData?.days ?? []).map((day, i) => (
              <TouchableOpacity
                key={i}
                style={[ds.dayChip, selectedDay === i && ds.dayChipActive]}
                onPress={() => { setSelectedDay(i); void Haptics.selectionAsync(); }}
              >
                <Text style={[ds.dayChipText, selectedDay === i && ds.dayChipTextActive]}>
                  {day.day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {currentDay && (
            <>
              <View style={ds.totalCard}>
                <View style={{ alignItems: 'center' as const }}>
                  <Text style={ds.totalValue}>{currentDay.totalCalories}</Text>
                  <Text style={ds.totalLabel}>kkal</Text>
                </View>
                <View style={{ alignItems: 'center' as const }}>
                  <Text style={ds.totalValue}>
                    {currentDay.breakfast.protein + currentDay.lunch.protein + currentDay.dinner.protein + currentDay.snack.protein}g
                  </Text>
                  <Text style={ds.totalLabel}>oqsil</Text>
                </View>
                <View style={{ alignItems: 'center' as const }}>
                  <Text style={ds.totalValue}>
                    {currentDay.breakfast.carbs + currentDay.lunch.carbs + currentDay.dinner.carbs + currentDay.snack.carbs}g
                  </Text>
                  <Text style={ds.totalLabel}>uglevod</Text>
                </View>
                <View style={{ alignItems: 'center' as const }}>
                  <Text style={ds.totalValue}>
                    {currentDay.breakfast.fats + currentDay.lunch.fats + currentDay.dinner.fats + currentDay.snack.fats}g
                  </Text>
                  <Text style={ds.totalLabel}>yog'</Text>
                </View>
              </View>

              {mealSections.map(section => {
                const IconComp = section.icon;
                return (
                  <View key={section.key} style={ds.mealCard}>
                    <View style={ds.mealHeader}>
                      <View style={[ds.mealIconWrap, { backgroundColor: section.color + '15' }]}>
                        <IconComp size={20} color={section.color} />
                      </View>
                      <Text style={ds.mealLabel}>{section.label}</Text>
                      <View style={{ flex: 1 }} />
                      <Text style={[ds.macroValue, { color: colors.calories }]}>{section.data.calories} kkal</Text>
                    </View>
                    <Text style={ds.mealName}>{section.data.name}</Text>
                    <Text style={ds.mealPortion}>{section.data.portion}</Text>
                    <View style={ds.macroRow}>
                      <View style={ds.macroItem}>
                        <Text style={[ds.macroValue, { color: colors.protein }]}>{section.data.protein}g</Text>
                        <Text style={ds.macroLabel}>{tr('common', 'protein')}</Text>
                      </View>
                      <View style={ds.macroItem}>
                        <Text style={[ds.macroValue, { color: colors.carbs }]}>{section.data.carbs}g</Text>
                        <Text style={ds.macroLabel}>{tr('common', 'carbs')}</Text>
                      </View>
                      <View style={ds.macroItem}>
                        <Text style={[ds.macroValue, { color: colors.fats }]}>{section.data.fats}g</Text>
                        <Text style={ds.macroLabel}>{tr('common', 'fats')}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          <TouchableOpacity style={ds.regenBtn} onPress={handleGenerate} activeOpacity={0.7}>
            <RefreshCw size={16} color={colors.primary} />
            <Text style={ds.regenText}>{tr('mealPlan', 'regenerate')}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}
