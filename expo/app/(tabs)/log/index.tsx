import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Calendar, Camera, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, UtensilsCrossed } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { MealType } from '@/types';
import MealCard from '@/components/MealCard';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MEAL_SECTION_KEYS: { type: MealType; key: string; emoji: string }[] = [
  { type: 'breakfast', key: 'breakfast', emoji: '🌅' },
  { type: 'lunch', key: 'lunch', emoji: '☀️' },
  { type: 'dinner', key: 'dinner', emoji: '🌙' },
  { type: 'snack', key: 'snack', emoji: '🍎' },
];



export default function LogScreen() {
  const queryClient = useQueryClient();
  const { meals, removeMeal } = useUser();
  const { colors } = useTheme();
  const { tr, weekdaysShort, months } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const dateMeals = meals.filter(m => m.date === selectedDate);

  const dateTotals = dateMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.foodItem.calories,
      protein: acc.protein + m.foodItem.protein,
      carbs: acc.carbs + m.foodItem.carbs,
      fats: acc.fats + m.foodItem.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const getMealsForType = (type: MealType) => dateMeals.filter(m => m.mealType === type);

  const handleRemoveMeal = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      tr('log', 'deleteConfirmTitle'),
      tr('log', 'deleteConfirmMsg'),
      [
        { text: tr('common', 'cancel'), style: 'cancel' },
        { text: tr('common', 'delete'), style: 'destructive', onPress: () => removeMeal(id) },
      ]
    );
  }, [removeMeal, tr]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['meals'] });
    } catch (e) {
      console.log('[Log] Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const selectedDateObj = new Date(selectedDate + 'T12:00:00');
  const selectedYear = selectedDateObj.getFullYear();
  const selectedMonth = selectedDateObj.getMonth();

  const getWeekDates = () => {
    const current = new Date(selectedDate + 'T12:00:00');
    const dayOfWeek = current.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(current);
    monday.setDate(current.getDate() + mondayOffset);

    const dates: { date: string; dayNum: number; isToday: boolean; isSelected: boolean }[] = [];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dates.push({
        date: dateStr,
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
      });
    }
    return dates;
  };

  const getMonthDates = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const days: { date: string; dayNum: number; isToday: boolean; isSelected: boolean; isCurrentMonth: boolean }[] = [];

    for (let i = 0; i < startDay; i++) {
      const d = new Date(selectedYear, selectedMonth, -startDay + i + 1);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: dateStr, dayNum: d.getDate(), isToday: false, isSelected: dateStr === selectedDate, isCurrentMonth: false });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ date: dateStr, dayNum: i, isToday: dateStr === todayStr, isSelected: dateStr === selectedDate, isCurrentMonth: true });
    }

    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(selectedYear, selectedMonth + 1, i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        days.push({ date: dateStr, dayNum: d.getDate(), isToday: false, isSelected: dateStr === selectedDate, isCurrentMonth: false });
      }
    }

    return days;
  };

  const navigateWeek = (direction: number) => {
    const current = new Date(selectedDate + 'T12:00:00');
    if (calendarExpanded) {
      current.setMonth(current.getMonth() + direction);
    } else {
      current.setDate(current.getDate() + (direction * 7));
    }
    const newDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    setSelectedDate(newDate);
  };

  const toggleCalendar = () => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setCalendarExpanded(!calendarExpanded);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const hasMealsOnDate = useCallback((dateStr: string) => {
    return meals.some(m => m.date === dateStr);
  }, [meals]);

  const weekDates = getWeekDates();
  const monthDates = calendarExpanded ? getMonthDates() : [];

  const ds = useMemo(() => StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerTitle: {
      fontSize: 22,
      fontFamily: 'Outfit_700Bold',
      color: colors.text,
    },
    addButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 4,
    },
    calendarCard: {
      marginHorizontal: 20,
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 18,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 4,
    },
    monthText: {
      fontSize: 16,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.text,
    },
    expandButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
    },
    expandText: {
      fontSize: 12,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.primary,
    },
    dayCellSelected: {
      backgroundColor: colors.primary,
    },
    dayCellToday: {
      backgroundColor: colors.primaryLight,
    },
    dayLabel: {
      fontSize: 11,
      color: colors.textTertiary,
      fontFamily: 'Outfit_500Medium',
      marginBottom: 4,
    },
    dayNum: {
      fontSize: 16,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.text,
    },
    dayNumToday: {
      color: colors.primary,
      fontFamily: 'Outfit_700Bold',
    },
    dayNumOtherMonth: {
      color: colors.textTertiary,
      opacity: 0.4,
    },
    todayDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.primary,
      marginTop: 3,
    },
    mealDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.calories,
      marginTop: 2,
    },
    monthDayCellSelected: {
      backgroundColor: colors.primary,
      borderRadius: 12,
    },
    monthDayCellToday: {
      backgroundColor: colors.primaryLight,
      borderRadius: 12,
    },
    summaryBar: {
      flexDirection: 'row' as const,
      justifyContent: 'space-around' as const,
      alignItems: 'center' as const,
      marginHorizontal: 20,
      backgroundColor: colors.surface,
      borderRadius: 24,
      paddingVertical: 18,
      marginBottom: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 4,
    },
    summaryLabel: {
      fontSize: 11,
      color: colors.textTertiary,
      marginTop: 2,
      fontFamily: 'Outfit_500Medium',
    },
    summaryDivider: {
      width: 1,
      height: 24,
      backgroundColor: colors.borderLight,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.surfaceSecondary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.text,
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    emptyAddButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 20,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 6,
    },
    mealTypeLabel: {
      fontSize: 16,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.text,
      flex: 1,
    },
    mealTypeCalBadge: {
      backgroundColor: colors.caloriesLight,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
    },
    mealTypeCalText: {
      fontSize: 12,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.calories,
    },
  }), [colors]);

  return (
    <View style={ds.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Calendar size={20} color={colors.primary} />
              <Text style={ds.headerTitle}>{tr('log', 'title')}</Text>
            </View>
            <TouchableOpacity
              style={ds.addButton}
              onPress={() => router.push('/scanner')}
              activeOpacity={0.8}
              testID="log-add-button"
            >
              <Camera size={18} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={ds.calendarCard}>
            <View style={styles.monthRow}>
              <TouchableOpacity onPress={() => navigateWeek(-1)} style={styles.navButton} activeOpacity={0.6}>
                <ChevronLeft size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleCalendar} style={ds.expandButton} activeOpacity={0.7}>
                <Text style={ds.monthText}>
                  {months[selectedDateObj.getMonth()]} {selectedDateObj.getFullYear()}
                </Text>
                {calendarExpanded ? (
                  <ChevronUp size={16} color={colors.primary} />
                ) : (
                  <ChevronDown size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateWeek(1)} style={styles.navButton} activeOpacity={0.6}>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {!calendarExpanded ? (
              <View style={styles.weekRow}>
                {weekDates.map((item, i) => (
                  <TouchableOpacity
                    key={item.date}
                    style={[
                      styles.dayCell,
                      item.isSelected && ds.dayCellSelected,
                      item.isToday && !item.isSelected && ds.dayCellToday,
                    ]}
                    onPress={() => { setSelectedDate(item.date); void Haptics.selectionAsync(); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      ds.dayLabel,
                      item.isSelected && styles.dayLabelSelected,
                    ]}>{weekdaysShort[i]}</Text>
                    <Text style={[
                      ds.dayNum,
                      item.isSelected && styles.dayNumSelected,
                      item.isToday && !item.isSelected && ds.dayNumToday,
                    ]}>{item.dayNum}</Text>
                    {item.isToday && !item.isSelected && <View style={ds.todayDot} />}
                    {!item.isToday && !item.isSelected && hasMealsOnDate(item.date) && <View style={ds.mealDot} />}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View>
                <View style={styles.monthWeekdayRow}>
                  {weekdaysShort.map(d => (
                    <View key={d} style={styles.monthWeekdayCell}>
                      <Text style={[ds.dayLabel, { marginBottom: 0 }]}>{d}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.monthGrid}>
                  {monthDates.map((item, i) => (
                    <TouchableOpacity
                      key={`${item.date}-${i}`}
                      style={[
                        styles.monthDayCell,
                        item.isSelected && ds.monthDayCellSelected,
                        item.isToday && !item.isSelected && ds.monthDayCellToday,
                      ]}
                      onPress={() => { setSelectedDate(item.date); void Haptics.selectionAsync(); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.monthDayNum,
                        { color: colors.text },
                        item.isSelected && styles.dayNumSelected,
                        item.isToday && !item.isSelected && ds.dayNumToday,
                        !item.isCurrentMonth && ds.dayNumOtherMonth,
                      ]}>{item.dayNum}</Text>
                      {item.isCurrentMonth && hasMealsOnDate(item.date) && !item.isSelected && (
                        <View style={ds.mealDot} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={ds.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.calories }]}>{Math.round(dateTotals.calories)}</Text>
              <Text style={ds.summaryLabel}>kkal</Text>
            </View>
            <View style={ds.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.protein }]}>{Math.round(dateTotals.protein)}g</Text>
              <Text style={ds.summaryLabel}>{tr('common', 'protein').toLowerCase()}</Text>
            </View>
            <View style={ds.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.carbs }]}>{Math.round(dateTotals.carbs)}g</Text>
              <Text style={ds.summaryLabel}>{tr('common', 'carbs').toLowerCase()}</Text>
            </View>
            <View style={ds.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.fats }]}>{Math.round(dateTotals.fats)}g</Text>
              <Text style={ds.summaryLabel}>{tr('common', 'fats').toLowerCase()}</Text>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
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
            {dateMeals.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={ds.emptyIconCircle}>
                  <UtensilsCrossed size={32} color={colors.textTertiary} />
                </View>
                <Text style={ds.emptyTitle}>{tr('log', 'nothingAdded')}</Text>
                <Text style={ds.emptySubtitle}>{tr('log', 'noRecords')}</Text>
                <TouchableOpacity
                  style={ds.emptyAddButton}
                  onPress={() => router.push('/scanner')}
                  activeOpacity={0.8}
                >
                  <Camera size={18} color={colors.white} />
                  <Text style={styles.emptyAddText}>{tr('meals', 'addMeal')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              MEAL_SECTION_KEYS.map(section => {
                const sectionMeals = getMealsForType(section.type);
                if (sectionMeals.length === 0) return null;
                return (
                  <View key={section.type} style={styles.mealTypeGroup}>
                    <View style={styles.mealTypeHeader}>
                      <Text style={styles.mealTypeEmoji}>{section.emoji}</Text>
                      <Text style={ds.mealTypeLabel}>{tr('meals', section.key)}</Text>
                      <View style={ds.mealTypeCalBadge}>
                        <Text style={ds.mealTypeCalText}>
                          {Math.round(sectionMeals.reduce((sum, m) => sum + m.foodItem.calories, 0))} kkal
                        </Text>
                      </View>
                    </View>
                    {sectionMeals.map(meal => (
                      <MealCard key={meal.id} entry={meal} onRemove={handleRemoveMeal} />
                    ))}
                  </View>
                );
              })
            )}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    padding: 4,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 14,
  },
  dayLabelSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  dayNumSelected: {
    color: '#FFFFFF',
    fontFamily: 'Outfit_700Bold',
  },
  monthWeekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  monthWeekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthDayCell: {
    width: '14.28%' as unknown as number,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 40,
  },
  monthDayNum: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 17,
    fontFamily: 'Outfit_700Bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  emptyAddText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },
  mealTypeGroup: {
    marginBottom: 16,
  },
  mealTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  mealTypeEmoji: {
    fontSize: 18,
  },
  bottomSpacer: {
    height: 20,
  },
});
