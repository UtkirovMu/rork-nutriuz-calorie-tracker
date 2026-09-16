import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  User,
  Ruler,
  Weight,
  Target,
  Zap,
  ChevronRight,
  RotateCcw,
  Edit3,
  Sun,
  Moon,
  Smartphone,
  Heart,
  Calendar,
  Trash2,
  Info,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react-native';
import { useTheme, ThemeMode } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { LANGUAGE_OPTIONS } from '@/constants/translations';
import { calculateTDEE, calculateDailyTargets } from '@/utils/calculations';

export default function ProfileScreen() {
  const { profile, updateProfile } = useUser();
  const { colors, themeMode, setMode } = useTheme();
  const { tr, language, setLang } = useLanguage();
  const { auth, logout } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['meals'] }),
        queryClient.invalidateQueries({ queryKey: ['weightHistory'] }),
        queryClient.invalidateQueries({ queryKey: ['achievements'] }),
        queryClient.invalidateQueries({ queryKey: ['streak'] }),
      ]);
    } catch (e) {
      console.log('[Profile] Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const bmi = useMemo(() => {
    if (!profile.onboardingComplete) return '0';
    const h = profile.height / 100;
    return (profile.weight / (h * h)).toFixed(1);
  }, [profile.height, profile.weight, profile.onboardingComplete]);

  const bmiCategory = useMemo(() => {
    const val = parseFloat(bmi);
    if (val < 18.5) return { label: tr('bmiCategories', 'underweight'), color: colors.carbs };
    if (val < 25) return { label: tr('bmiCategories', 'normal'), color: colors.calories };
    if (val < 30) return { label: tr('bmiCategories', 'overweight'), color: colors.warning };
    return { label: tr('bmiCategories', 'obese'), color: colors.danger };
  }, [bmi, colors, tr]);

  const handleClearData = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Ma'lumotlarni tozalash",
      "Barcha ovqat yozuvlari, vazn tarixi va progress rasmlar o'chiriladi. Profil saqlanadi.",
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'nutriuz_meals',
                'nutriuz_weight_history',
                'nutriuz_progress_photos',
                'nutriuz_streak',
                'nutriuz_meal_plan',
              ]);
              Alert.alert('Tayyor', "Ma'lumotlar tozalandi. Ilovani qayta oching.");
            } catch (e) {
              console.log('Clear data error:', e);
            }
          },
        },
      ]
    );
  }, []);

  const handleResetAll = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "To'liq qayta sozlash",
      "BARCHA ma'lumotlar o'chiriladi — profil, ovqatlar, yutuqlar, rasmlar. Bu amalni qaytarib bo'lmaydi!",
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "Hammasini o'chirish",
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Tayyor', "Barcha ma'lumotlar tozalandi. Ilovani qayta oching.");
            } catch (e) {
              console.log('Reset all error:', e);
            }
          },
        },
      ]
    );
  }, []);

  const ds = useMemo(() => StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: 'Outfit_800ExtraBold',
      color: colors.text,
      letterSpacing: -0.5,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      paddingHorizontal: 40,
    },
    emptyIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surfaceSecondary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 20,
      fontFamily: 'Outfit_700Bold',
      color: colors.text,
    },
    emptySubtext: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center' as const,
      marginBottom: 16,
    },
    setupButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 18,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 4,
    },
    setupButtonText: {
      fontSize: 16,
      fontFamily: 'Outfit_700Bold',
      color: colors.white,
    },
    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: 28,
      padding: 24,
      alignItems: 'center' as const,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 4,
    },
    avatarRing: {
      width: 88,
      height: 88,
      borderRadius: 44,
      borderWidth: 3,
      borderColor: colors.primary + '30',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 14,
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.primary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 5,
    },
    profileName: {
      fontSize: 24,
      fontFamily: 'Outfit_800ExtraBold',
      color: colors.text,
      marginBottom: 8,
      letterSpacing: -0.3,
    },
    goalPill: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 20,
    },
    goalPillText: {
      fontSize: 14,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.primary,
    },
    statCard: {
      width: '31%' as unknown as number,
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: 'center' as const,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    statValue: {
      fontSize: 22,
      fontFamily: 'Outfit_800ExtraBold',
      color: colors.text,
      letterSpacing: -0.5,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
      fontFamily: 'Outfit_500Medium',
    },
    bmiCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 16,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    bmiLabel: {
      fontSize: 13,
      fontFamily: 'Outfit_500Medium',
      color: colors.textSecondary,
    },
    bmiValue: {
      fontSize: 26,
      fontFamily: 'Outfit_800ExtraBold',
      color: colors.text,
      letterSpacing: -0.5,
    },
    macroTargetsCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 20,
      marginBottom: 16,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    },
    cardTitle: {
      fontSize: 17,
      fontFamily: 'Outfit_700Bold',
      color: colors.text,
      marginBottom: 16,
    },
    macroLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontFamily: 'Outfit_500Medium',
    },
    themeCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 20,
      marginBottom: 16,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    },
    themeOption: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: colors.surfaceSecondary,
      gap: 4,
    },
    themeOptionActive: {
      backgroundColor: colors.primaryLight,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    themeOptionText: {
      fontSize: 12,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.textSecondary,
    },
    themeOptionTextActive: {
      color: colors.primary,
    },
    detailsCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 20,
      marginBottom: 16,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    },
    detailLabel: {
      fontSize: 15,
      color: colors.text,
      fontFamily: 'Outfit_500Medium',
    },
    detailValue: {
      fontSize: 15,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.textSecondary,
    },
    itemDivider: {
      height: 1,
      backgroundColor: colors.borderLight,
    },
    editButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      height: 54,
      backgroundColor: colors.primaryLight,
      borderRadius: 18,
      gap: 8,
      marginBottom: 16,
    },
    editButtonText: {
      fontSize: 16,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.primary,
    },
    settingsCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      overflow: 'hidden' as const,
      marginBottom: 16,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    },
    settingItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 14,
    },
    settingIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    settingLabel: {
      fontSize: 15,
      fontFamily: 'Outfit_500Medium',
      color: colors.text,
      flex: 1,
    },
    settingValue: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    dangerText: {
      fontSize: 15,
      fontFamily: 'Outfit_500Medium',
      flex: 1,
    },
    sectionTitle: {
      fontSize: 13,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.textSecondary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 4,
    },
    versionText: {
      fontSize: 13,
      color: colors.textTertiary,
      textAlign: 'center' as const,
      marginTop: 8,
      marginBottom: 40,
    },
  }), [colors]);

  if (!profile.onboardingComplete) {
    return (
      <View style={ds.screen}>
        <SafeAreaView style={staticStyles.safeArea} edges={['top']}>
          <View style={ds.emptyContainer}>
            <View style={ds.emptyIconCircle}>
              <User size={36} color={colors.textTertiary} />
            </View>
            <Text style={ds.emptyText}>Profil topilmadi</Text>
            <Text style={ds.emptySubtext}>Profilingizni sozlash uchun boshlang</Text>
            <TouchableOpacity
              style={ds.setupButton}
              onPress={() => router.replace('/onboarding')}
              activeOpacity={0.8}
            >
              <Text style={ds.setupButtonText}>Profilni sozlash</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const tdee = calculateTDEE(profile);
  const targets = calculateDailyTargets(profile);

  const goalLabels = {
    lose: tr('goals', 'lose'),
    maintain: tr('goals', 'maintain'),
    gain: tr('goals', 'gain'),
  };

  const goalEmojis = {
    lose: '🔥',
    maintain: '⚖️',
    gain: '💪',
  };

  const activityLabels = {
    sedentary: tr('activityLevels', 'sedentary'),
    moderate: tr('activityLevels', 'moderate'),
    active: tr('activityLevels', 'active'),
  };

  const handleReset = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      tr('data', 'resetConfirmTitle'),
      tr('data', 'resetConfirmMsg'),
      [
        { text: tr('common', 'cancel'), style: 'cancel' },
        {
          text: tr('data', 'resetProfile'),
          style: 'destructive',
          onPress: () => {
            updateProfile({ onboardingComplete: false });
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const handleThemeChange = (mode: ThemeMode) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(mode);
  };

  const profileItems = [
    { icon: User, label: tr('profile', 'gender'), value: profile.gender === 'male' ? tr('profile', 'male') : tr('profile', 'female'), color: colors.primary },
    { icon: Calendar, label: tr('profile', 'age'), value: `${profile.age} ${tr('profile', 'ageUnit')}`, color: colors.carbs },
    { icon: Ruler, label: tr('profile', 'height'), value: `${profile.height} sm`, color: colors.fats },
    { icon: Weight, label: tr('profile', 'weight'), value: `${profile.weight} kg`, color: colors.protein },
    { icon: Target, label: tr('profile', 'goal'), value: goalLabels[profile.goal], color: colors.calories },
    { icon: Zap, label: tr('profile', 'activity'), value: activityLabels[profile.activityLevel], color: colors.carbs },
  ];

  const themeOptions: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
    { mode: 'light', label: tr('theme', 'light'), icon: Sun },
    { mode: 'dark', label: tr('theme', 'dark'), icon: Moon },
    { mode: 'system', label: tr('theme', 'system'), icon: Smartphone },
  ];

  return (
    <View style={ds.screen}>
      <SafeAreaView style={staticStyles.safeArea} edges={['top']}>
        <Animated.ScrollView
          style={[staticStyles.scrollView, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          contentContainerStyle={staticStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <View style={staticStyles.header}>
            <Text style={ds.headerTitle}>{tr('profile', 'title')}</Text>
          </View>

          <View style={ds.profileCard}>
            <View style={ds.avatarRing}>
              <View style={ds.avatar}>
                <Text style={staticStyles.avatarText}>
                  {profile.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={ds.profileName}>{profile.name}</Text>
            <View style={ds.goalPill}>
              <Text style={staticStyles.goalPillEmoji}>{goalEmojis[profile.goal]}</Text>
              <Text style={ds.goalPillText}>{goalLabels[profile.goal]}</Text>
            </View>
          </View>

          <View style={staticStyles.statsRow}>
            <View style={[ds.statCard, { flex: 1 }]}>
              <Text style={staticStyles.statEmoji}>🔥</Text>
              <Text style={ds.statValue}>{tdee}</Text>
              <Text style={ds.statLabel}>TDEE</Text>
            </View>
            <View style={[ds.statCard, { flex: 1, backgroundColor: colors.primary }]}>
              <Text style={staticStyles.statEmoji}>🎯</Text>
              <Text style={[ds.statValue, { color: colors.white }]}>{targets.calories}</Text>
              <Text style={[ds.statLabel, { color: 'rgba(255,255,255,0.8)' }]}>{tr('profile', 'targetKcal')}</Text>
            </View>
            <View style={[ds.statCard, { flex: 1 }]}>
              <Text style={staticStyles.statEmoji}>⚖️</Text>
              <Text style={ds.statValue}>{profile.weight}</Text>
              <Text style={ds.statLabel}>kg</Text>
            </View>
          </View>

          <View style={ds.bmiCard}>
            <View>
              <Text style={ds.bmiLabel}>{tr('profile', 'bmiIndex')}</Text>
              <Text style={ds.bmiValue}>{bmi}</Text>
            </View>
            <View style={staticStyles.bmiRight}>
              <View style={[staticStyles.bmiCategoryPill, { backgroundColor: bmiCategory.color + '18' }]}>
                <View style={[staticStyles.bmiDot, { backgroundColor: bmiCategory.color }]} />
                <Text style={[staticStyles.bmiCategoryText, { color: bmiCategory.color }]}>{bmiCategory.label}</Text>
              </View>
              <Heart size={18} color={bmiCategory.color} />
            </View>
          </View>

          <View style={ds.macroTargetsCard}>
            <Text style={ds.cardTitle}>{tr('profile', 'dailyMacroTargets')}</Text>
            <View style={staticStyles.macroRow}>
              <View style={staticStyles.macroItem}>
                <View style={[staticStyles.macroCircle, { backgroundColor: colors.proteinLight }]}>
                  <Text style={[staticStyles.macroCircleText, { color: colors.protein }]}>{targets.protein}g</Text>
                </View>
                <Text style={ds.macroLabel}>{tr('common', 'protein')}</Text>
              </View>
              <View style={staticStyles.macroItem}>
                <View style={[staticStyles.macroCircle, { backgroundColor: colors.carbsLight }]}>
                  <Text style={[staticStyles.macroCircleText, { color: colors.carbs }]}>{targets.carbs}g</Text>
                </View>
                <Text style={ds.macroLabel}>{tr('common', 'carbs')}</Text>
              </View>
              <View style={staticStyles.macroItem}>
                <View style={[staticStyles.macroCircle, { backgroundColor: colors.fatsLight }]}>
                  <Text style={[staticStyles.macroCircleText, { color: colors.fats }]}>{targets.fats}g</Text>
                </View>
                <Text style={ds.macroLabel}>{tr('common', 'fats')}</Text>
              </View>
            </View>
          </View>

          <View style={ds.detailsCard}>
            <Text style={ds.cardTitle}>{tr('profile', 'personalInfo')}</Text>
            {profileItems.map((item, i) => (
              <View key={i}>
                {i > 0 && <View style={ds.itemDivider} />}
                <View style={staticStyles.detailItem}>
                  <View style={staticStyles.detailLeft}>
                    <View style={[staticStyles.detailIcon, { backgroundColor: item.color + '15' }]}>
                      <item.icon size={18} color={item.color} />
                    </View>
                    <Text style={ds.detailLabel}>{item.label}</Text>
                  </View>
                  <Text style={ds.detailValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={ds.editButton}
            onPress={() => router.push('/onboarding')}
            activeOpacity={0.7}
          >
            <Edit3 size={18} color={colors.primary} />
            <Text style={ds.editButtonText}>{tr('profile', 'editProfile')}</Text>
            <ChevronRight size={18} color={colors.primary} />
          </TouchableOpacity>

          <Text style={ds.sectionTitle}>{tr('profile', 'settingsSection')}</Text>

          <View style={ds.themeCard}>
            <Text style={ds.cardTitle}>{tr('theme', 'title')}</Text>
            <View style={staticStyles.themeRow}>
              {themeOptions.map(opt => {
                const isActive = themeMode === opt.mode;
                const IconComp = opt.icon;
                return (
                  <TouchableOpacity
                    key={opt.mode}
                    style={[ds.themeOption, isActive && ds.themeOptionActive]}
                    onPress={() => handleThemeChange(opt.mode)}
                    activeOpacity={0.7}
                    testID={`theme-${opt.mode}`}
                  >
                    <IconComp size={20} color={isActive ? colors.primary : colors.textSecondary} />
                    <Text style={[ds.themeOptionText, isActive && ds.themeOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={ds.themeCard}>
            <Text style={ds.cardTitle}>{tr('profile', 'language')}</Text>
            <View style={staticStyles.themeRow}>
              {LANGUAGE_OPTIONS.map(opt => {
                const isActive = language === opt.code;
                return (
                  <TouchableOpacity
                    key={opt.code}
                    style={[ds.themeOption, isActive && ds.themeOptionActive]}
                    onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLang(opt.code); }}
                    activeOpacity={0.7}
                    testID={`lang-${opt.code}`}
                  >
                    <Text style={staticStyles.langFlag}>{opt.flag}</Text>
                    <Text style={[ds.themeOptionText, isActive && ds.themeOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={ds.settingsCard}>
            <View style={ds.settingItem}>
              <View style={[ds.settingIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Info size={18} color={colors.primary} />
              </View>
              <Text style={ds.settingLabel}>{tr('common', 'version')}</Text>
              <Text style={ds.settingValue}>1.0.0</Text>
            </View>
          </View>

          <Text style={ds.sectionTitle}>{tr('profile', 'dataSection')}</Text>

          <View style={ds.settingsCard}>
            <TouchableOpacity style={ds.settingItem} onPress={handleClearData} activeOpacity={0.7}>
              <View style={[ds.settingIconWrap, { backgroundColor: colors.warning + '15' }]}>
                <Trash2 size={18} color={colors.warning} />
              </View>
              <Text style={[ds.dangerText, { color: colors.warning }]}>{tr('data', 'clearRecords')}</Text>
            </TouchableOpacity>
            <View style={ds.itemDivider} />
            <TouchableOpacity style={ds.settingItem} onPress={handleResetAll} activeOpacity={0.7}>
              <View style={[ds.settingIconWrap, { backgroundColor: colors.danger + '15' }]}>
                <Trash2 size={18} color={colors.danger} />
              </View>
              <Text style={[ds.dangerText, { color: colors.danger }]}>{tr('data', 'deleteAll')}</Text>
            </TouchableOpacity>
            <View style={ds.itemDivider} />
            <TouchableOpacity style={ds.settingItem} onPress={handleReset} activeOpacity={0.7}>
              <View style={[ds.settingIconWrap, { backgroundColor: colors.danger + '15' }]}>
                <RotateCcw size={16} color={colors.danger} />
              </View>
              <Text style={[ds.dangerText, { color: colors.danger }]}>{tr('data', 'resetProfile')}</Text>
            </TouchableOpacity>
          </View>

          <View style={ds.settingsCard}>
            <TouchableOpacity
              style={ds.settingItem}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert(
                  tr('login', 'logout'),
                  tr('login', 'logoutConfirm'),
                  [
                    { text: tr('common', 'cancel'), style: 'cancel' },
                    {
                      text: tr('login', 'logout'),
                      style: 'destructive',
                      onPress: async () => {
                        await logout();
                        router.replace('/login');
                      },
                    },
                  ]
                );
              }}
              activeOpacity={0.7}
              testID="logout-button"
            >
              <View style={[ds.settingIconWrap, { backgroundColor: colors.danger + '15' }]}>
                <LogOut size={18} color={colors.danger} />
              </View>
              <Text style={[ds.dangerText, { color: colors.danger }]}>{tr('login', 'logout')}</Text>
              {auth.identifier ? (
                <Text style={ds.settingValue}>{auth.identifier}</Text>
              ) : null}
            </TouchableOpacity>
          </View>

          <Text style={ds.versionText}>Oqsil v1.0.0</Text>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    paddingVertical: 12,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: 'Outfit_700Bold',
    color: '#FFFFFF',
  },
  goalPillEmoji: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  bmiRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bmiCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  bmiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bmiCategoryText: {
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
    gap: 8,
  },
  macroCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroCircleText: {
    fontSize: 17,
    fontFamily: 'Outfit_700Bold',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
  langFlag: {
    fontSize: 18,
  },
});
