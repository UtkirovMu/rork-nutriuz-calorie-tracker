import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '@/mocks/achievements';

export default function AchievementsScreen() {
  const { colors } = useTheme();
  const { tr } = useLanguage();
  const { achievements } = useUser();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const unlockedIds = useMemo(() => new Set(achievements.map(a => a.id)), [achievements]);
  const unlockedCount = achievements.length;
  const totalCount = ACHIEVEMENTS.length;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const ds = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    headerCard: {
      backgroundColor: colors.primary,
      borderRadius: 24,
      padding: 24,
      marginHorizontal: 20,
      marginTop: 10,
      marginBottom: 20,
      alignItems: 'center' as const,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 6,
    },
    headerTitle: { fontSize: 48, fontFamily: 'Outfit_800ExtraBold', color: colors.white, letterSpacing: -2 },
    headerSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontFamily: 'Outfit_500Medium', marginTop: 4 },
    progressBarTrack: {
      width: '100%' as const,
      height: 8,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 4,
      marginTop: 16,
    },
    progressBarFill: {
      height: '100%' as const,
      backgroundColor: colors.white,
      borderRadius: 4,
    },
    progressText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8, fontFamily: 'Outfit_600SemiBold' },
    categoryTitle: {
      fontSize: 18,
      fontFamily: 'Outfit_700Bold',
      color: colors.text,
      marginHorizontal: 20,
      marginBottom: 12,
      marginTop: 8,
    },
    badgeGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      paddingHorizontal: 16,
      gap: 10,
      marginBottom: 20,
    },
    badgeCard: {
      width: '47%' as unknown as number,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      alignItems: 'center' as const,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    badgeCardLocked: {
      opacity: 0.45,
    },
    badgeEmoji: { fontSize: 36, marginBottom: 8 },
    badgeTitle: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: colors.text, textAlign: 'center' as const, marginBottom: 4 },
    badgeDescription: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' as const, lineHeight: 16 },
    badgeUnlockedTag: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 8,
      marginTop: 8,
    },
    badgeUnlockedText: { fontSize: 10, fontFamily: 'Outfit_600SemiBold', color: colors.primary },
    badgeLockedTag: {
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 8,
      marginTop: 8,
    },
    badgeLockedText: { fontSize: 10, fontFamily: 'Outfit_600SemiBold', color: colors.textTertiary },
  }), [colors]);

  return (
    <View style={ds.screen}>
      <Stack.Screen options={{ title: tr('nav', 'achievements'), headerBackTitle: tr('nav', 'back') }} />
      <Animated.ScrollView style={{ opacity: fadeAnim }} showsVerticalScrollIndicator={false}>
        <View style={ds.headerCard}>
          <Text style={ds.headerTitle}>{unlockedCount}/{totalCount}</Text>
          <Text style={ds.headerSubtitle}>{tr('achievementsPage', 'unlocked')}</Text>
          <View style={ds.progressBarTrack}>
            <View style={[ds.progressBarFill, { width: `${progressPercent}%` as unknown as number }]} />
          </View>
          <Text style={ds.progressText}>{progressPercent}% {tr('achievementsPage', 'completed')}</Text>
        </View>

        {ACHIEVEMENT_CATEGORIES.map(cat => {
          const catAchievements = ACHIEVEMENTS.filter(a => a.category === cat.key);
          return (
            <View key={cat.key}>
              <Text style={ds.categoryTitle}>{cat.emoji} {tr('achievementCategories', cat.key)}</Text>
              <View style={ds.badgeGrid}>
                {catAchievements.map(achievement => {
                  const isUnlocked = unlockedIds.has(achievement.id);
                  return (
                    <View key={achievement.id} style={[ds.badgeCard, !isUnlocked && ds.badgeCardLocked]}>
                      <Text style={ds.badgeEmoji}>{isUnlocked ? achievement.emoji : '🔒'}</Text>
                      <Text style={ds.badgeTitle}>{tr('achievementTitles', achievement.id)}</Text>
                      <Text style={ds.badgeDescription}>{tr('achievementDescriptions', achievement.id)}</Text>
                      {isUnlocked ? (
                        <View style={ds.badgeUnlockedTag}>
                          <Text style={ds.badgeUnlockedText}>{tr('achievementsPage', 'unlockedTag')}</Text>
                        </View>
                      ) : (
                        <View style={ds.badgeLockedTag}>
                          <Text style={ds.badgeLockedText}>{tr('achievementsPage', 'lockedTag')}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}
