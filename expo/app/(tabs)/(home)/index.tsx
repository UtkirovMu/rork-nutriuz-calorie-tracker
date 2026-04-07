import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { Camera, Plus, Flame, TrendingUp, Utensils, Trophy, CameraIcon, BarChart3, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation } from '@tanstack/react-query';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import CalorieRing from '@/components/CalorieRing';
import MacroBar from '@/components/MacroBar';
import MealCard from '@/components/MealCard';
import AdBanner from '@/components/AdBanner';
import { MealType } from '@/types';

const MEAL_SECTION_TYPES: { type: MealType; key: string; emoji: string }[] = [
  { type: 'breakfast', key: 'breakfast', emoji: '🌅' },
  { type: 'lunch', key: 'lunch', emoji: '☀️' },
  { type: 'dinner', key: 'dinner', emoji: '🌙' },
  { type: 'snack', key: 'snack', emoji: '🍎' },
];

const analysisSchema = z.object({
  summary: z.string(),
  calorieStatus: z.enum(['low', 'on_track', 'high']),
  proteinStatus: z.enum(['low', 'on_track', 'high']),
  tips: z.array(z.string()),
  score: z.number(),
});

export default function HomeScreen() {
  const { profile, dailyTargets, todayMeals, todayTotals, removeMeal, streak, refreshAllData } = useUser();
  const { colors } = useTheme();
  const { tr } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [refreshing, setRefreshing] = useState(false);

  const cardAnims = useRef(
    Array.from({ length: 6 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(30),
    }))
  ).current;

  const analysisMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Foydalanuvchining bugungi ovqatlanish holatini tahlil qil.

Ma'lumotlar:
- Kunlik maqsad: ${dailyTargets.calories} kkal, Oqsil: ${dailyTargets.protein}g, Uglevod: ${dailyTargets.carbs}g, Yog': ${dailyTargets.fats}g
- Bugun iste'mol: ${Math.round(todayTotals.calories)} kkal, Oqsil: ${Math.round(todayTotals.protein)}g, Uglevod: ${Math.round(todayTotals.carbs)}g, Yog': ${Math.round(todayTotals.fats)}g
- Ovqatlar soni: ${todayMeals.length}
- Streak: ${streak.currentStreak} kun
- Maqsad: ${profile.goal === 'lose' ? "vazn yo'qotish" : profile.goal === 'gain' ? 'vazn olish' : 'vaznni saqlash'}

Qisqa va aniq javob ber o'zbek tilida. 
- summary: 1-2 jumla bilan umumiy holat
- calorieStatus: kaloriya holati (low/on_track/high)
- proteinStatus: oqsil holati
- tips: 2-3 ta qisqa maslahat (har biri 1 jumla)
- score: 0-100 ball (umumiy baholash)`;

      return await generateObject({
        messages: [{ role: 'user', content: prompt }],
        schema: analysisSchema,
      });
    },
  });

  useEffect(() => {
    if (profile.onboardingComplete) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
      ]).start(() => {
        const staggerAnims = cardAnims.map((anim, i) =>
          Animated.parallel([
            Animated.timing(anim.opacity, { toValue: 1, duration: 350, delay: i * 80, useNativeDriver: true }),
            Animated.spring(anim.translateY, { toValue: 0, friction: 8, delay: i * 80, useNativeDriver: true }),
          ])
        );
        Animated.parallel(staggerAnims).start();
      });
    }
  }, [profile.onboardingComplete, fadeAnim, slideAnim, cardAnims]);

  const shouldAnalyze = profile.onboardingComplete && todayMeals.length > 0;
  const hasAnalysis = !!analysisMutation.data;
  const isAnalyzing = analysisMutation.isPending;

  useEffect(() => {
    if (shouldAnalyze && !hasAnalysis && !isAnalyzing) {
      analysisMutation.mutate();
    }
  }, [shouldAnalyze, hasAnalysis, isAnalyzing, analysisMutation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshAllData();
    if (todayMeals.length > 0) {
      analysisMutation.mutate();
    }
    setTimeout(() => setRefreshing(false), 1200);
  }, [todayMeals.length, analysisMutation, refreshAllData]);

  const handleScan = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/scanner');
  };

  const handleRemoveMeal = (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeMeal(id);
  };

  const getMealsForType = (type: MealType) => todayMeals.filter(m => m.mealType === type);

  const { auth } = useAuth();

  if (!auth.isLoggedIn) {
    return <Redirect href="/login" />;
  }

  if (!profile.onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? tr('greeting', 'morning') : hour < 18 ? tr('greeting', 'afternoon') : tr('greeting', 'evening');
  const caloriesRemaining = Math.max(0, dailyTargets.calories - todayTotals.calories);

  const analysisData = analysisMutation.data;
  const statusColors = {
    low: colors.carbs,
    on_track: colors.calories,
    high: colors.danger,
  };
  const statusLabels = {
    low: tr('home', 'statusLow'),
    on_track: tr('home', 'statusOnTrack'),
    high: tr('home', 'statusHigh'),
  };

  const quickLinks = [
    { label: tr('home', 'mealPlan'), icon: Utensils, color: '#FF9500', bg: '#FF9500' + '15', route: '/meal-plan' },
    { label: tr('home', 'achievements'), icon: Trophy, color: '#FFD60A', bg: '#FFD60A' + '15', route: '/achievements' },
    { label: tr('home', 'photos'), icon: CameraIcon, color: '#5856D6', bg: '#5856D6' + '15', route: '/progress-photos' },
    { label: tr('home', 'statistics'), icon: BarChart3, color: '#636366', bg: '#636366' + '15', route: '/(tabs)/stats' },
  ];

  const dynamicStyles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    greeting: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' as const },
    userName: { fontSize: 28, fontWeight: '800' as const, color: colors.text, marginTop: 2, letterSpacing: -0.5 },
    scanButton: {
      width: 52, height: 52, borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center' as const, justifyContent: 'center' as const,
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
    },
    streakBadge: {
      flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4,
      backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
      shadowColor: colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    streakText: { fontSize: 14, fontWeight: '700' as const, color: colors.text },
    ringCard: {
      alignItems: 'center' as const, marginBottom: 20,
      backgroundColor: colors.surface, borderRadius: 28, paddingVertical: 28, paddingHorizontal: 20,
      shadowColor: colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
    },
    quickStatRow: { flexDirection: 'row' as const, width: '100%' as const, marginTop: 20, gap: 10 },
    quickStatCard: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center' as const },
    quickStatValue: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
    quickStatLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' as const, marginTop: 2 },
    quickLinksRow: { flexDirection: 'row' as const, gap: 10, marginBottom: 20 },
    quickLinkCard: {
      flex: 1, backgroundColor: colors.surface, borderRadius: 18, paddingVertical: 14, alignItems: 'center' as const, gap: 8,
      shadowColor: colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
    },
    quickLinkIconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const },
    quickLinkText: { fontSize: 11, fontWeight: '600' as const, color: colors.textSecondary },
    analysisCard: {
      backgroundColor: colors.surface, borderRadius: 22, padding: 18, marginBottom: 20,
      shadowColor: colors.black, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
    },
    analysisHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 12 },
    analysisTitle: { fontSize: 16, fontWeight: '700' as const, color: colors.text, flex: 1 },
    analysisSummary: { fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 12 },
    analysisScoreCircle: {
      width: 48, height: 48, borderRadius: 24, alignItems: 'center' as const, justifyContent: 'center' as const,
      borderWidth: 3,
    },
    analysisScoreText: { fontSize: 16, fontWeight: '800' as const },
    analysisStatusRow: { flexDirection: 'row' as const, gap: 10, marginBottom: 12 },
    analysisStatusChip: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    analysisStatusText: { fontSize: 12, fontWeight: '600' as const },
    analysisTip: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 4, paddingLeft: 16 },
    analysisTipBullet: { fontSize: 13, color: colors.primary, fontWeight: '700' as const },
    sectionTitle: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
    macroCard: {
      backgroundColor: colors.surface, borderRadius: 22, padding: 18,
      shadowColor: colors.black, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
    },
    addMealButton: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    addMealText: { fontSize: 13, fontWeight: '600' as const, color: colors.primary },
    mealTypeLabel: { fontSize: 16, fontWeight: '600' as const, color: colors.text, flex: 1 },
    mealTypeCalBadge: { backgroundColor: colors.caloriesLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
    mealTypeCalText: { fontSize: 12, fontWeight: '600' as const, color: colors.calories },
    emptyMealCard: {
      flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8,
      height: 52, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1.5, borderColor: colors.borderLight, borderStyle: 'dashed' as const,
    },
    emptyMealText: { fontSize: 14, color: colors.textTertiary, fontWeight: '500' as const },
  }), [colors]);

  return (
    <View style={dynamicStyles.screen}>
      <AdBanner />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
            }
          >
            <View style={styles.headerSection}>
              <View>
                <Text style={dynamicStyles.greeting}>{greeting},</Text>
                <Text style={dynamicStyles.userName}>{profile.name} 👋</Text>
              </View>
              <View style={styles.headerRight}>
                {streak.currentStreak > 0 && (
                  <View style={dynamicStyles.streakBadge}>
                    <Text style={styles.streakEmoji}>🔥</Text>
                    <Text style={dynamicStyles.streakText}>{streak.currentStreak}</Text>
                  </View>
                )}
                <TouchableOpacity style={dynamicStyles.scanButton} onPress={handleScan} activeOpacity={0.8} testID="scan-button">
                  <Camera size={22} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>

            <Animated.View style={[dynamicStyles.ringCard, { opacity: cardAnims[0].opacity, transform: [{ translateY: cardAnims[0].translateY }] }]}>
              <CalorieRing consumed={todayTotals.calories} target={dailyTargets.calories} size={220} />
              <View style={dynamicStyles.quickStatRow}>
                <View style={dynamicStyles.quickStatCard}>
                  <Flame size={16} color={colors.calories} />
                  <Text style={dynamicStyles.quickStatValue}>{Math.round(todayTotals.calories)}</Text>
                  <Text style={dynamicStyles.quickStatLabel}>{tr('home', 'consumed')}</Text>
                </View>
                <View style={dynamicStyles.quickStatCard}>
                  <TrendingUp size={16} color={colors.primary} />
                  <Text style={dynamicStyles.quickStatValue}>{Math.round(caloriesRemaining)}</Text>
                  <Text style={dynamicStyles.quickStatLabel}>{tr('home', 'remaining')}</Text>
                </View>
                <View style={dynamicStyles.quickStatCard}>
                  <Text style={styles.targetEmoji}>🎯</Text>
                  <Text style={dynamicStyles.quickStatValue}>{dailyTargets.calories}</Text>
                  <Text style={dynamicStyles.quickStatLabel}>{tr('home', 'target')}</Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View style={[dynamicStyles.quickLinksRow, { opacity: cardAnims[1].opacity, transform: [{ translateY: cardAnims[1].translateY }] }]}>
              {quickLinks.map((link, i) => {
                const IconComp = link.icon;
                return (
                  <TouchableOpacity
                    key={link.route}
                    style={dynamicStyles.quickLinkCard}
                    onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(link.route as never); }}
                    activeOpacity={0.7}
                    testID={`quick-link-${i}`}
                  >
                    <View style={[dynamicStyles.quickLinkIconWrap, { backgroundColor: link.bg }]}>
                      <IconComp size={20} color={link.color} />
                    </View>
                    <Text style={dynamicStyles.quickLinkText}>{link.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>

            {(analysisData || analysisMutation.isPending) && (
              <Animated.View style={[dynamicStyles.analysisCard, { opacity: cardAnims[2].opacity, transform: [{ translateY: cardAnims[2].translateY }] }]}>
                <View style={dynamicStyles.analysisHeader}>
                  <Sparkles size={18} color={colors.primary} />
                  <Text style={dynamicStyles.analysisTitle}>{tr('home', 'aiAnalysis')}</Text>
                  {analysisData && (
                    <View style={[dynamicStyles.analysisScoreCircle, {
                      borderColor: analysisData.score >= 70 ? colors.calories : analysisData.score >= 40 ? colors.carbs : colors.danger,
                    }]}>
                      <Text style={[dynamicStyles.analysisScoreText, {
                        color: analysisData.score >= 70 ? colors.calories : analysisData.score >= 40 ? colors.carbs : colors.danger,
                      }]}>{analysisData.score}</Text>
                    </View>
                  )}
                </View>
                {analysisMutation.isPending ? (
                  <View style={styles.analysisLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[dynamicStyles.analysisSummary, { marginBottom: 0 }]}>{tr('home', 'analyzing')}</Text>
                  </View>
                ) : analysisData ? (
                  <>
                    <Text style={dynamicStyles.analysisSummary}>{analysisData.summary}</Text>
                    <View style={dynamicStyles.analysisStatusRow}>
                      <View style={[dynamicStyles.analysisStatusChip, { backgroundColor: statusColors[analysisData.calorieStatus] + '15' }]}>
                        <Text style={[dynamicStyles.analysisStatusText, { color: statusColors[analysisData.calorieStatus] }]}>
                          {tr('home', 'calorieStatus')}: {statusLabels[analysisData.calorieStatus]}
                        </Text>
                      </View>
                      <View style={[dynamicStyles.analysisStatusChip, { backgroundColor: statusColors[analysisData.proteinStatus] + '15' }]}>
                        <Text style={[dynamicStyles.analysisStatusText, { color: statusColors[analysisData.proteinStatus] }]}>
                          {tr('home', 'proteinStatus')}: {statusLabels[analysisData.proteinStatus]}
                        </Text>
                      </View>
                    </View>
                    {analysisData.tips.map((tip, i) => (
                      <View key={i} style={styles.tipRow}>
                        <Text style={dynamicStyles.analysisTipBullet}>•</Text>
                        <Text style={dynamicStyles.analysisTip}>{tip}</Text>
                      </View>
                    ))}
                  </>
                ) : null}
              </Animated.View>
            )}

            <Animated.View style={[styles.macroSection, { opacity: cardAnims[3].opacity, transform: [{ translateY: cardAnims[3].translateY }] }]}>
              <View style={styles.sectionHeader}>
                <Text style={dynamicStyles.sectionTitle}>{tr('meals', 'macronutrients')}</Text>
              </View>
              <View style={dynamicStyles.macroCard}>
                <MacroBar label={tr('common', 'protein')} current={todayTotals.protein} target={dailyTargets.protein} color={colors.protein} />
                <MacroBar label={tr('common', 'carbs')} current={todayTotals.carbs} target={dailyTargets.carbs} color={colors.carbs} />
                <MacroBar label={tr('common', 'fats')} current={todayTotals.fats} target={dailyTargets.fats} color={colors.fats} />
              </View>
            </Animated.View>

            <Animated.View style={[styles.mealsSection, { opacity: cardAnims[4].opacity, transform: [{ translateY: cardAnims[4].translateY }] }]}>
              <View style={styles.sectionHeader}>
                <Text style={dynamicStyles.sectionTitle}>{tr('meals', 'todayMeals')}</Text>
                <TouchableOpacity style={dynamicStyles.addMealButton} onPress={handleScan} activeOpacity={0.7}>
                  <Plus size={16} color={colors.primary} />
                  <Text style={dynamicStyles.addMealText}>{tr('common', 'add')}</Text>
                </TouchableOpacity>
              </View>
              {MEAL_SECTION_TYPES.map(section => {
                const sectionMeals = getMealsForType(section.type);
                const sectionCals = sectionMeals.reduce((acc, m) => acc + m.foodItem.calories, 0);
                return (
                  <View key={section.type} style={styles.mealTypeGroup}>
                    <View style={styles.mealTypeHeader}>
                      <Text style={styles.mealTypeEmoji}>{section.emoji}</Text>
                      <Text style={dynamicStyles.mealTypeLabel}>{tr('meals', section.key)}</Text>
                      {sectionCals > 0 && (
                        <View style={dynamicStyles.mealTypeCalBadge}>
                          <Text style={dynamicStyles.mealTypeCalText}>{Math.round(sectionCals)} kkal</Text>
                        </View>
                      )}
                    </View>
                    {sectionMeals.length > 0 ? (
                      sectionMeals.map(meal => (
                        <MealCard key={meal.id} entry={meal} onRemove={handleRemoveMeal} />
                      ))
                    ) : (
                      <TouchableOpacity style={dynamicStyles.emptyMealCard} onPress={handleScan} activeOpacity={0.7}>
                        <Plus size={16} color={colors.textTertiary} />
                        <Text style={dynamicStyles.emptyMealText}>{tr('meals', 'addMeal')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </Animated.View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  headerSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakEmoji: { fontSize: 16 },
  targetEmoji: { fontSize: 16 },
  analysisLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  tipRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  macroSection: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  mealsSection: { marginBottom: 20 },
  mealTypeGroup: { marginBottom: 14 },
  mealTypeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  mealTypeEmoji: { fontSize: 18 },
  bottomSpacer: { height: 20 },
});
