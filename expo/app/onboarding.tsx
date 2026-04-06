import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronRight, ChevronLeft, User, Target, Zap, Sparkles, Heart, TrendingUp, TrendingDown, Minus, Ruler, Scale, Clock, Crosshair } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Gender, Goal, ActivityLevel } from '@/types';
import { calculateDailyTargets, calculateTDEE } from '@/utils/calculations';
import ScrollPicker from '@/components/ScrollPicker';

const STEPS = ['name', 'body', 'goal', 'targetWeight', 'activity', 'summary'] as const;

const AGE_DATA = Array.from({ length: 80 }, (_, i) => i + 10);
const HEIGHT_DATA = Array.from({ length: 101 }, (_, i) => i + 120);
const WEIGHT_DATA = Array.from({ length: 151 }, (_, i) => i + 30);
const TARGET_WEIGHT_DATA = Array.from({ length: 151 }, (_, i) => i + 30);

export default function OnboardingScreen() {
  const { profile, updateProfile } = useUser();
  const { colors } = useTheme();
  const { tr } = useLanguage();
  const { auth } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState(profile.name || '');
  const [gender, setGender] = useState<Gender>(profile.gender || 'male');
  const [age, setAge] = useState(profile.age || 25);
  const [height, setHeight] = useState(profile.height || 170);
  const [weight, setWeight] = useState(profile.weight || 70);
  const [targetWeight, setTargetWeight] = useState(profile.targetWeight || profile.weight || 70);
  const [goal, setGoal] = useState<Goal>(profile.goal || 'maintain');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel || 'moderate');

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = (direction: 'forward' | 'back', callback: () => void) => {
    const toValue = direction === 'forward' ? -30 : 30;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      callback();
      slideAnim.setValue(direction === 'forward' ? 30 : -30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const goNext = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < STEPS.length - 1) {
      animateTransition('forward', () => setCurrentStep(s => s + 1));
    }
  };

  const goBack = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 0) {
      animateTransition('back', () => setCurrentStep(s => s - 1));
    }
  };

  const handleComplete = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const profileData = {
      name,
      gender,
      age,
      height,
      weight,
      targetWeight,
      goal,
      activityLevel,
      onboardingComplete: true,
      email: auth.loginMethod === 'email' ? auth.identifier : undefined,
      phone: auth.loginMethod === 'phone' ? auth.identifier : undefined,
    };
    updateProfile(profileData);

    try {
      const ACCOUNTS_KEY = 'nutriuz_accounts';
      const accountsRaw = await AsyncStorage.getItem(ACCOUNTS_KEY);
      const accounts = accountsRaw ? JSON.parse(accountsRaw) : [];
      const existing = accounts.findIndex(
        (a: { identifier: string; method: string }) => a.identifier === auth.identifier && a.method === auth.loginMethod
      );
      const accountEntry = {
        identifier: auth.identifier,
        method: auth.loginMethod,
        profileData,
        createdAt: Date.now(),
      };
      if (existing >= 0) {
        accounts[existing] = accountEntry;
      } else {
        accounts.push(accountEntry);
      }
      await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
      console.log('[Onboarding] Account saved:', auth.identifier);
    } catch (err) {
      console.error('[Onboarding] Error saving account:', err);
    }

    router.replace('/(tabs)/(home)');
  };

  const tempProfile = useMemo(() => ({
    name,
    gender,
    age,
    height,
    weight,
    targetWeight,
    goal,
    activityLevel,
    onboardingComplete: true,
  }), [name, gender, age, height, weight, targetWeight, goal, activityLevel]);

  const isStepValid = () => {
    switch (STEPS[currentStep]) {
      case 'name': return name.trim().length > 0;
      case 'body': return age > 0 && height > 0 && weight > 0;
      case 'goal': return true;
      case 'targetWeight': return targetWeight > 0;
      case 'activity': return true;
      case 'summary': return true;
    }
  };

  const bmi = useMemo(() => {
    const h = height / 100;
    return (weight / (h * h)).toFixed(1);
  }, [height, weight]);

  const bmiCategory = useMemo(() => {
    const val = parseFloat(bmi);
    if (val < 18.5) return { label: tr('bmiCategories', 'underweight'), color: colors.carbs };
    if (val < 25) return { label: tr('bmiCategories', 'normal'), color: colors.calories };
    if (val < 30) return { label: tr('bmiCategories', 'overweight'), color: colors.warning };
    return { label: tr('bmiCategories', 'obese'), color: colors.danger };
  }, [bmi, colors, tr]);

  const weightDiff = useMemo(() => {
    return targetWeight - weight;
  }, [targetWeight, weight]);

  const estimatedWeeks = useMemo(() => {
    if (Math.abs(weightDiff) < 0.5) return 0;
    return Math.ceil(Math.abs(weightDiff) / 0.5);
  }, [weightDiff]);

  const ds = useMemo(() => StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    progressTrack: {
      flex: 1,
      height: 4,
      backgroundColor: colors.borderLight,
      borderRadius: 2,
      overflow: 'hidden' as const,
    },
    progressFill: {
      height: '100%' as const,
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    progressText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      minWidth: 30,
      textAlign: 'right' as const,
    },
    stepTitle: {
      fontSize: 30,
      fontWeight: '800' as const,
      color: colors.text,
      textAlign: 'center' as const,
      marginBottom: 6,
      letterSpacing: -0.5,
    },
    stepSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center' as const,
      marginBottom: 28,
      lineHeight: 22,
      paddingHorizontal: 10,
    },
    textInput: {
      width: '100%' as const,
      height: 58,
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingHorizontal: 20,
      fontSize: 17,
      color: colors.text,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    genderOption: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      height: 80,
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 2.5,
      borderColor: 'transparent',
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },
    genderOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    genderText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    genderTextActive: {
      color: colors.primary,
    },
    bodyHeroRow: {
      flexDirection: 'row' as const,
      gap: 8,
      width: '100%' as const,
      marginBottom: 14,
    },
    bodyHeroCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 8,
      alignItems: 'center' as const,
      borderWidth: 1.5,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    bodyHeroIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 6,
    },
    bodyHeroValue: {
      fontSize: 26,
      fontWeight: '800' as const,
      letterSpacing: -1,
    },
    bodyHeroUnit: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: colors.textTertiary,
      marginTop: 2,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    pickerSection: {
      width: '100%' as const,
      marginBottom: 14,
    },
    pickerCard: {
      width: '100%' as const,
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 16,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
    },
    bmiSection: {
      width: '100%' as const,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    bmiTopRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 8,
    },
    bmiLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      marginLeft: 6,
    },
    bmiPill: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 10,
    },
    bmiPillText: {
      fontSize: 13,
      fontWeight: '700' as const,
    },
    bmiValue: {
      fontSize: 36,
      fontWeight: '800' as const,
      letterSpacing: -1.5,
    },
    bmiBarTrack: {
      width: '100%' as const,
      height: 6,
      backgroundColor: colors.borderLight,
      borderRadius: 3,
      marginTop: 10,
      overflow: 'visible' as const,
      position: 'relative' as const,
    },
    bmiBarFill: {
      height: '100%' as const,
      borderRadius: 3,
    },
    bmiScaleText: {
      fontSize: 10,
      fontWeight: '600' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.3,
    },
    optionCard: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 14,
      borderWidth: 2.5,
      borderColor: 'transparent',
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },
    optionCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    optionLabel: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
    },
    optionLabelActive: {
      color: colors.primaryDark,
    },
    optionDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    levelBarSegment: {
      width: 24,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderLight,
    },
    radioOuter: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2.5,
      borderColor: colors.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    radioOuterActive: {
      borderColor: colors.primary,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    successIconCircle: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.primary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 20,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },
    summaryGreeting: {
      fontSize: 32,
      fontWeight: '800' as const,
      color: colors.text,
      textAlign: 'center' as const,
      marginBottom: 6,
      letterSpacing: -0.5,
    },
    summaryMainCard: {
      width: '100%' as const,
      backgroundColor: colors.primary,
      borderRadius: 28,
      paddingVertical: 28,
      paddingHorizontal: 20,
      alignItems: 'center' as const,
      marginBottom: 14,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 8,
    },
    summaryMacroLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500' as const,
      marginTop: 4,
    },
    summaryDetails: {
      width: '100%' as const,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
    },
    summaryDetailDivider: {
      height: 1,
      backgroundColor: colors.borderLight,
    },
    summaryDetailLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    summaryDetailValue: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    nextButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      height: 58,
      backgroundColor: colors.primary,
      borderRadius: 20,
      gap: 6,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 6,
    },
    nextButtonDisabled: {
      backgroundColor: colors.border,
      shadowOpacity: 0,
    },
    targetWeightCard: {
      width: '100%' as const,
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 20,
      marginBottom: 14,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
    },
    weightCompareRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-around' as const,
      width: '100%' as const,
      marginBottom: 20,
    },
    weightCompareCard: {
      alignItems: 'center' as const,
      gap: 6,
      flex: 1,
    },
    weightCompareLabel: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    weightCompareValue: {
      fontSize: 32,
      fontWeight: '800' as const,
      letterSpacing: -1,
    },
    weightCompareUnit: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: colors.textTertiary,
    },
    weightArrow: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    weightDiffCard: {
      width: '100%' as const,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center' as const,
      marginBottom: 14,
    },
    weightDiffText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      marginTop: 4,
    },
  }), [colors]);

  const renderNameStep = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
        <User size={32} color={colors.primary} />
      </View>
      <Text style={ds.stepTitle}>Ismingiz nima?</Text>
      <Text style={ds.stepSubtitle}>Biz sizni shaxsiy ravishda kutib olishimiz uchun</Text>
      <TextInput
        style={ds.textInput}
        value={name}
        onChangeText={setName}
        placeholder="Ismingizni kiriting"
        placeholderTextColor={colors.textTertiary}
        autoFocus
        testID="name-input"
      />
      <View style={styles.genderRow}>
        <TouchableOpacity
          style={[ds.genderOption, gender === 'male' && ds.genderOptionActive]}
          onPress={() => { setGender('male'); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          activeOpacity={0.7}
          testID="gender-male"
        >
          <Text style={styles.genderEmoji}>👨</Text>
          <Text style={[ds.genderText, gender === 'male' && ds.genderTextActive]}>Erkak</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ds.genderOption, gender === 'female' && ds.genderOptionActive]}
          onPress={() => { setGender('female'); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          activeOpacity={0.7}
          testID="gender-female"
        >
          <Text style={styles.genderEmoji}>👩</Text>
          <Text style={[ds.genderText, gender === 'female' && ds.genderTextActive]}>Ayol</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const bmiPercent = useMemo(() => {
    const val = parseFloat(bmi);
    const clamped = Math.max(15, Math.min(val, 40));
    return ((clamped - 15) / 25) * 100;
  }, [bmi]);

  const renderBodyStep = () => (
    <View style={styles.stepContent}>
      <Text style={ds.stepTitle}>Tana o'lchamlari</Text>
      <Text style={ds.stepSubtitle}>Kaloriya ehtiyojingizni hisoblash uchun quyidagi ma'lumotlarni belgilang</Text>

      <View style={ds.bodyHeroRow}>
        <View style={[ds.bodyHeroCard, { borderColor: colors.carbs + '30' }]}>
          <View style={[ds.bodyHeroIconWrap, { backgroundColor: colors.carbs + '15' }]}>
            <Clock size={16} color={colors.carbs} />
          </View>
          <Text style={[ds.bodyHeroValue, { color: colors.carbs }]}>{age}</Text>
          <Text style={ds.bodyHeroUnit}>yosh</Text>
        </View>
        <View style={[ds.bodyHeroCard, { borderColor: colors.primary + '30' }]}>
          <View style={[ds.bodyHeroIconWrap, { backgroundColor: colors.primary + '15' }]}>
            <Ruler size={16} color={colors.primary} />
          </View>
          <Text style={[ds.bodyHeroValue, { color: colors.primary }]}>{height}</Text>
          <Text style={ds.bodyHeroUnit}>sm</Text>
        </View>
        <View style={[ds.bodyHeroCard, { borderColor: colors.protein + '30' }]}>
          <View style={[ds.bodyHeroIconWrap, { backgroundColor: colors.protein + '15' }]}>
            <Scale size={16} color={colors.protein} />
          </View>
          <Text style={[ds.bodyHeroValue, { color: colors.protein }]}>{weight}</Text>
          <Text style={ds.bodyHeroUnit}>kg</Text>
        </View>
      </View>

      <View style={ds.pickerSection}>
        <View style={ds.pickerCard}>
          <View style={styles.pickersRow}>
            <ScrollPicker
              data={AGE_DATA}
              selectedValue={age}
              onValueChange={setAge}
              unit="yosh"
              label="YOSH"
              accentColor={colors.carbs}
            />
            <ScrollPicker
              data={HEIGHT_DATA}
              selectedValue={height}
              onValueChange={setHeight}
              unit="sm"
              label="BO'Y"
              accentColor={colors.primary}
            />
            <ScrollPicker
              data={WEIGHT_DATA}
              selectedValue={weight}
              onValueChange={setWeight}
              unit="kg"
              label="VAZN"
              accentColor={colors.protein}
            />
          </View>
        </View>
      </View>

      <View style={ds.bmiSection}>
        <View style={ds.bmiTopRow}>
          <View style={styles.bmiLabelGroup}>
            <Heart size={16} color={bmiCategory.color} />
            <Text style={ds.bmiLabel}>BMI indeksi</Text>
          </View>
          <View style={[ds.bmiPill, { backgroundColor: bmiCategory.color + '15' }]}>
            <Text style={[ds.bmiPillText, { color: bmiCategory.color }]}>{bmiCategory.label}</Text>
          </View>
        </View>
        <View style={styles.bmiValueRow}>
          <Text style={[ds.bmiValue, { color: bmiCategory.color }]}>{bmi}</Text>
        </View>
        <View style={ds.bmiBarTrack}>
          <View style={[ds.bmiBarFill, { width: `${bmiPercent}%` as unknown as number, backgroundColor: bmiCategory.color }]} />
          <View style={[styles.bmiBarIndicator, { left: `${bmiPercent}%` as unknown as number }]}>
            <View style={[styles.bmiBarDot, { backgroundColor: bmiCategory.color, borderColor: colors.surface }]} />
          </View>
        </View>
        <View style={styles.bmiScaleRow}>
          <Text style={[ds.bmiScaleText, { color: colors.carbs }]}>{tr('bmiCategories', 'underweight')}</Text>
          <Text style={[ds.bmiScaleText, { color: colors.calories }]}>{tr('bmiCategories', 'normal')}</Text>
          <Text style={[ds.bmiScaleText, { color: colors.warning }]}>{tr('bmiCategories', 'overweight')}</Text>
          <Text style={[ds.bmiScaleText, { color: colors.danger }]}>{tr('bmiCategories', 'obese')}</Text>
        </View>
      </View>
    </View>
  );

  const goalOptions: { value: Goal; label: string; description: string; emoji: string; color: string; icon: typeof TrendingDown }[] = [
    { value: 'lose', label: "Vazn yo'qotish", description: 'Kunlik kaloriya defitsiti', emoji: '🔥', color: colors.protein, icon: TrendingDown },
    { value: 'maintain', label: 'Vaznni saqlash', description: 'Hozirgi vaznda qolish', emoji: '⚖️', color: colors.primary, icon: Minus },
    { value: 'gain', label: 'Vazn olish', description: 'Kunlik kaloriya surplyusi', emoji: '💪', color: colors.carbs, icon: TrendingUp },
  ];

  const renderGoalStep = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
        <Target size={32} color={colors.primary} />
      </View>
      <Text style={ds.stepTitle}>Maqsadingiz</Text>
      <Text style={ds.stepSubtitle}>Siz nimaga erishmoqchisiz?</Text>
      <View style={styles.optionsGroup}>
        {goalOptions.map(opt => {
          const isActive = goal === opt.value;
          const IconComp = opt.icon;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[ds.optionCard, isActive && { borderColor: opt.color, backgroundColor: opt.color + '10' }]}
              onPress={() => { setGoal(opt.value); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              activeOpacity={0.7}
              testID={`goal-${opt.value}`}
            >
              <View style={[styles.optionIconCircle, { backgroundColor: opt.color + '18' }]}>
                <IconComp size={22} color={opt.color} />
              </View>
              <View style={styles.optionTextGroup}>
                <Text style={[ds.optionLabel, isActive && { color: opt.color }]}>{opt.label}</Text>
                <Text style={ds.optionDescription}>{opt.description}</Text>
              </View>
              <View style={[ds.radioOuter, isActive && { borderColor: opt.color }]}>
                {isActive && <View style={[ds.radioInner, { backgroundColor: opt.color }]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderTargetWeightStep = () => {
    const diffColor = weightDiff < 0 ? colors.protein : weightDiff > 0 ? colors.carbs : colors.primary;
    const ArrowIcon = weightDiff < 0 ? TrendingDown : weightDiff > 0 ? TrendingUp : Minus;

    return (
      <View style={styles.stepContent}>
        <View style={[styles.iconCircle, { backgroundColor: diffColor + '15' }]}>
          <Crosshair size={32} color={diffColor} />
        </View>
        <Text style={ds.stepTitle}>Maqsad vazningiz</Text>
        <Text style={ds.stepSubtitle}>
          {goal === 'lose' ? "Qancha vaznni yo'qotmoqchisiz?" : goal === 'gain' ? 'Qancha vazn olmoqchisiz?' : 'Hozirgi vaznda qolasiz'}
        </Text>

        <View style={ds.weightCompareRow}>
          <View style={ds.weightCompareCard}>
            <Text style={ds.weightCompareLabel}>Hozirgi</Text>
            <Text style={[ds.weightCompareValue, { color: colors.text }]}>{weight}</Text>
            <Text style={ds.weightCompareUnit}>kg</Text>
          </View>
          <View style={[ds.weightArrow, { backgroundColor: diffColor + '15' }]}>
            <ArrowIcon size={22} color={diffColor} />
          </View>
          <View style={ds.weightCompareCard}>
            <Text style={[ds.weightCompareLabel, { color: diffColor }]}>Maqsad</Text>
            <Text style={[ds.weightCompareValue, { color: diffColor }]}>{targetWeight}</Text>
            <Text style={ds.weightCompareUnit}>kg</Text>
          </View>
        </View>

        <View style={ds.targetWeightCard}>
          <ScrollPicker
            data={TARGET_WEIGHT_DATA}
            selectedValue={targetWeight}
            onValueChange={setTargetWeight}
            unit="kg"
            label={tr('onboarding', 'targetWeightLabel')}
            accentColor={diffColor}
          />
        </View>

        {Math.abs(weightDiff) >= 0.5 && (
          <View style={ds.weightDiffCard}>
            <Text style={[ds.weightCompareValue, { color: diffColor, fontSize: 24 }]}>
              {weightDiff > 0 ? '+' : ''}{weightDiff} kg
            </Text>
            <Text style={ds.weightDiffText}>
              Taxminan {estimatedWeeks} hafta (haftasiga ~0.5 kg)
            </Text>
          </View>
        )}
      </View>
    );
  };

  const activityOptions: { value: ActivityLevel; label: string; description: string; emoji: string; level: number }[] = [
    { value: 'sedentary', label: 'Kam harakatli', description: 'Ofis ishi, kam yurish', emoji: '🪑', level: 1 },
    { value: 'moderate', label: "O'rtacha faol", description: 'Haftada 3-5 marta sport', emoji: '🚶', level: 2 },
    { value: 'active', label: 'Juda faol', description: 'Har kuni sport, og\'ir ish', emoji: '🏃', level: 3 },
  ];

  const renderActivityStep = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
        <Zap size={32} color={colors.primary} />
      </View>
      <Text style={ds.stepTitle}>Faollik darajasi</Text>
      <Text style={ds.stepSubtitle}>Kunlik harakatlanish darajangiz</Text>
      <View style={styles.optionsGroup}>
        {activityOptions.map(opt => {
          const isActive = activityLevel === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[ds.optionCard, isActive && ds.optionCardActive]}
              onPress={() => { setActivityLevel(opt.value); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              activeOpacity={0.7}
              testID={`activity-${opt.value}`}
            >
              <View style={[styles.optionIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
              </View>
              <View style={styles.optionTextGroup}>
                <Text style={[ds.optionLabel, isActive && ds.optionLabelActive]}>{opt.label}</Text>
                <Text style={ds.optionDescription}>{opt.description}</Text>
                <View style={styles.levelBarContainer}>
                  {[1, 2, 3].map(lvl => (
                    <View
                      key={lvl}
                      style={[
                        ds.levelBarSegment,
                        lvl <= opt.level && { backgroundColor: isActive ? colors.primary : colors.textTertiary },
                      ]}
                    />
                  ))}
                </View>
              </View>
              <View style={[ds.radioOuter, isActive && ds.radioOuterActive]}>
                {isActive && <View style={ds.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderSummaryStep = () => {
    const targets = calculateDailyTargets(tempProfile);
    const tdee = calculateTDEE(tempProfile);
    return (
      <View style={styles.stepContent}>
        <View style={ds.successIconCircle}>
          <Sparkles size={36} color={colors.white} />
        </View>
        <Text style={ds.summaryGreeting}>Tayyor, {name}! 🎉</Text>
        <Text style={ds.stepSubtitle}>Sizning shaxsiy rejangiz tayyor</Text>

        <View style={ds.summaryMainCard}>
          <Text style={styles.summaryMainLabel}>{tr('onboarding', 'dailyCalorieGoal')}</Text>
          <Text style={styles.summaryMainValue}>{targets.calories}</Text>
          <Text style={styles.summaryMainUnit}>kkal / kun</Text>
          <View style={styles.summaryTdeeRow}>
            <Text style={styles.summaryTdeeLabel}>TDEE:</Text>
            <Text style={styles.summaryTdeeValue}>{tdee} kkal</Text>
          </View>
        </View>

        <View style={styles.summaryMacroRow}>
          <View style={[styles.summaryMacroCard, { backgroundColor: colors.proteinLight }]}>
            <Text style={[styles.summaryMacroValue, { color: colors.protein }]}>{targets.protein}g</Text>
            <Text style={ds.summaryMacroLabel}>Oqsil</Text>
          </View>
          <View style={[styles.summaryMacroCard, { backgroundColor: colors.carbsLight }]}>
            <Text style={[styles.summaryMacroValue, { color: colors.carbs }]}>{targets.carbs}g</Text>
            <Text style={ds.summaryMacroLabel}>Uglevod</Text>
          </View>
          <View style={[styles.summaryMacroCard, { backgroundColor: colors.fatsLight }]}>
            <Text style={[styles.summaryMacroValue, { color: colors.fats }]}>{targets.fats}g</Text>
            <Text style={ds.summaryMacroLabel}>Yog'</Text>
          </View>
        </View>

        <View style={ds.summaryDetails}>
          <View style={styles.summaryDetailRow}>
            <Text style={ds.summaryDetailLabel}>Maqsad</Text>
            <Text style={ds.summaryDetailValue}>
              {goal === 'lose' ? "Vazn yo'qotish" : goal === 'gain' ? 'Vazn olish' : 'Vaznni saqlash'}
            </Text>
          </View>
          <View style={ds.summaryDetailDivider} />
          <View style={styles.summaryDetailRow}>
            <Text style={ds.summaryDetailLabel}>Maqsad vazn</Text>
            <Text style={ds.summaryDetailValue}>{targetWeight} kg</Text>
          </View>
          <View style={ds.summaryDetailDivider} />
          <View style={styles.summaryDetailRow}>
            <Text style={ds.summaryDetailLabel}>Faollik</Text>
            <Text style={ds.summaryDetailValue}>
              {activityLevel === 'sedentary' ? 'Kam harakatli' : activityLevel === 'moderate' ? "O'rtacha faol" : 'Juda faol'}
            </Text>
          </View>
          <View style={ds.summaryDetailDivider} />
          <View style={styles.summaryDetailRow}>
            <Text style={ds.summaryDetailLabel}>Bo'y / Vazn</Text>
            <Text style={ds.summaryDetailValue}>{height} sm / {weight} kg</Text>
          </View>
          <View style={ds.summaryDetailDivider} />
          <View style={styles.summaryDetailRow}>
            <Text style={ds.summaryDetailLabel}>BMI</Text>
            <Text style={ds.summaryDetailValue}>{bmi}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderStep = () => {
    switch (STEPS[currentStep]) {
      case 'name': return renderNameStep();
      case 'body': return renderBodyStep();
      case 'goal': return renderGoalStep();
      case 'targetWeight': return renderTargetWeightStep();
      case 'activity': return renderActivityStep();
      case 'summary': return renderSummaryStep();
    }
  };

  const isFinal = currentStep === STEPS.length - 1;
  const progress = (currentStep + 1) / STEPS.length;

  return (
    <View style={ds.screen}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            {currentStep > 0 ? (
              <TouchableOpacity onPress={goBack} style={ds.backButton} testID="back-button">
                <ChevronLeft size={24} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backPlaceholder} />
            )}
            <View style={styles.progressContainer}>
              <View style={ds.progressTrack}>
                <View style={[ds.progressFill, { width: `${progress * 100}%` as unknown as number }]} />
              </View>
              <Text style={ds.progressText}>{currentStep + 1}/{STEPS.length}</Text>
            </View>
            <View style={styles.backPlaceholder} />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={[
                styles.animatedContent,
                { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
              ]}
            >
              {renderStep()}
            </Animated.View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[ds.nextButton, !isStepValid() && ds.nextButtonDisabled]}
              onPress={isFinal ? handleComplete : goNext}
              disabled={!isStepValid()}
              testID="next-button"
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {isFinal ? "Boshlash 🚀" : 'Davom etish'}
              </Text>
              {!isFinal && <ChevronRight size={20} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backPlaceholder: {
    width: 40,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    gap: 10,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  animatedContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  genderEmoji: {
    fontSize: 28,
  },
  pickersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  bmiLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bmiValueRow: {
    alignItems: 'center',
    marginBottom: 2,
  },
  bmiBarIndicator: {
    position: 'absolute',
    top: -5,
    marginLeft: -8,
  },
  bmiBarDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
  },
  bmiScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  optionsGroup: {
    width: '100%',
    gap: 10,
  },
  optionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionTextGroup: {
    flex: 1,
    gap: 3,
  },
  levelBarContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  summaryMainLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  summaryMainValue: {
    fontSize: 56,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  summaryMainUnit: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  summaryTdeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  summaryTdeeLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500' as const,
  },
  summaryTdeeValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  summaryMacroRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 14,
  },
  summaryMacroCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 18,
  },
  summaryMacroValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  summaryDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    paddingTop: 12,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
