import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Line, Text as SvgText, Circle, Polyline } from 'react-native-svg';
import { BarChart3, TrendingUp, Scale, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';

const CHART_WIDTH = 320;
const CHART_HEIGHT = 160;
const BAR_WIDTH = 28;
const CHART_PADDING_LEFT = 40;
const CHART_PADDING_BOTTOM = 28;
const CHART_PADDING_TOP = 12;

export default function StatsScreen() {
  const { colors } = useTheme();
  const { tr } = useLanguage();
  const {
    dailyTargets,
    getLast7DaysCalories,
    getLast30DaysCalories,
    weightHistory,
    addWeightEntry,
    streak,
    todayTotals,
    meals,
  } = useUser();

  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [refreshing, setRefreshing] = useState(false);
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const weekData = useMemo(() => getLast7DaysCalories(), [getLast7DaysCalories]);
  const monthData = useMemo(() => getLast30DaysCalories(), [getLast30DaysCalories]);

  const chartData = period === 'week' ? weekData : monthData;
  const maxCalories = Math.max(...chartData.map(d => d.calories), dailyTargets.calories, 100);

  const avgCalories = useMemo(() => {
    const withData = chartData.filter(d => d.calories > 0);
    if (withData.length === 0) return 0;
    return Math.round(withData.reduce((s, d) => s + d.calories, 0) / withData.length);
  }, [chartData]);

  const totalMealsCount = meals.length;
  const todayPercent = dailyTargets.calories > 0 ? Math.round((todayTotals.calories / dailyTargets.calories) * 100) : 0;

  const recentWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : null;
  const weightChange = useMemo(() => {
    if (weightHistory.length < 2) return null;
    const first = weightHistory[0].weight;
    const last = weightHistory[weightHistory.length - 1].weight;
    return +(last - first).toFixed(1);
  }, [weightHistory]);

  const handleAddWeight = useCallback(() => {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w < 20 || w > 300) {
      Alert.alert(tr('common', 'error'), tr('stats', 'weightError'));
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addWeightEntry(w);
    setWeightInput('');
    setShowWeightInput(false);
  }, [weightInput, addWeightEntry, tr]);

  const weightPoints = useMemo(() => {
    if (weightHistory.length < 2) return '';
    const last10 = weightHistory.slice(-10);
    const minW = Math.min(...last10.map(w => w.weight)) - 2;
    const maxW = Math.max(...last10.map(w => w.weight)) + 2;
    const range = maxW - minW || 1;
    const usableWidth = CHART_WIDTH - CHART_PADDING_LEFT - 10;
    const usableHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
    return last10.map((w, i) => {
      const x = CHART_PADDING_LEFT + (i / (last10.length - 1)) * usableWidth;
      const y = CHART_PADDING_TOP + usableHeight - ((w.weight - minW) / range) * usableHeight;
      return `${x},${y}`;
    }).join(' ');
  }, [weightHistory]);

  const ds = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    title: { fontSize: 28, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.5 },
    periodToggle: {
      flexDirection: 'row' as const,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 12,
      padding: 3,
    },
    periodBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
    },
    periodBtnActive: { backgroundColor: colors.primary },
    periodBtnText: { fontSize: 13, fontWeight: '600' as const, color: colors.textSecondary },
    periodBtnTextActive: { color: colors.white },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 20,
      marginBottom: 14,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    cardTitle: { fontSize: 16, fontWeight: '700' as const, color: colors.text, marginBottom: 14 },
    summaryValue: { fontSize: 28, fontWeight: '800' as const, color: colors.text, letterSpacing: -1 },
    summaryLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' as const, marginTop: 2 },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 16,
      padding: 14,
      alignItems: 'center' as const,
    },
    streakCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 20,
      marginBottom: 14,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    streakValue: { fontSize: 44, fontWeight: '800' as const, color: colors.primary, letterSpacing: -2 },
    streakLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' as const },
    weightBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
    },
    weightBtnText: { fontSize: 13, fontWeight: '600' as const, color: colors.primary },
    weightInput: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    weightSaveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    weightSaveText: { fontSize: 14, fontWeight: '600' as const, color: colors.white },
    emptyChartText: { fontSize: 14, color: colors.textTertiary, textAlign: 'center' as const, paddingVertical: 40 },
  }), [colors]);

  const renderBarChart = () => {
    if (period === 'week') {
      const usableHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
      const totalBarsWidth = weekData.length * (BAR_WIDTH + 8);
      const startX = CHART_PADDING_LEFT + ((CHART_WIDTH - CHART_PADDING_LEFT - totalBarsWidth) / 2);

      return (
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Line
            x1={CHART_PADDING_LEFT}
            y1={CHART_PADDING_TOP + usableHeight - (dailyTargets.calories / maxCalories) * usableHeight}
            x2={CHART_WIDTH}
            y2={CHART_PADDING_TOP + usableHeight - (dailyTargets.calories / maxCalories) * usableHeight}
            stroke={colors.primary + '40'}
            strokeWidth={1}
            strokeDasharray="5,5"
          />
          <SvgText
            x={4}
            y={CHART_PADDING_TOP + usableHeight - (dailyTargets.calories / maxCalories) * usableHeight + 4}
            fill={colors.primary}
            fontSize={9}
            fontWeight="600"
          >
            {dailyTargets.calories}
          </SvgText>
          {weekData.map((d, i) => {
            const barH = maxCalories > 0 ? (d.calories / maxCalories) * usableHeight : 0;
            const x = startX + i * (BAR_WIDTH + 8);
            const y = CHART_PADDING_TOP + usableHeight - barH;
            const isOverTarget = d.calories > dailyTargets.calories;
            const barColor = d.calories === 0 ? colors.borderLight : isOverTarget ? colors.warning : colors.primary;
            return (
              <React.Fragment key={d.date}>
                <Rect
                  x={x}
                  y={d.calories === 0 ? CHART_PADDING_TOP + usableHeight - 4 : y}
                  width={BAR_WIDTH}
                  height={d.calories === 0 ? 4 : barH}
                  rx={6}
                  fill={barColor}
                  opacity={d.calories === 0 ? 0.3 : 0.85}
                />
                <SvgText
                  x={x + BAR_WIDTH / 2}
                  y={CHART_HEIGHT - 6}
                  fill={colors.textSecondary}
                  fontSize={11}
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {d.label}
                </SvgText>
                {d.calories > 0 && (
                  <SvgText
                    x={x + BAR_WIDTH / 2}
                    y={y - 4}
                    fill={colors.textSecondary}
                    fontSize={9}
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {d.calories}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
        </Svg>
      );
    }

    const usableHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
    const barW = (CHART_WIDTH - CHART_PADDING_LEFT - 10) / monthData.length;

    return (
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Line
          x1={CHART_PADDING_LEFT}
          y1={CHART_PADDING_TOP + usableHeight - (dailyTargets.calories / maxCalories) * usableHeight}
          x2={CHART_WIDTH}
          y2={CHART_PADDING_TOP + usableHeight - (dailyTargets.calories / maxCalories) * usableHeight}
          stroke={colors.primary + '40'}
          strokeWidth={1}
          strokeDasharray="5,5"
        />
        {monthData.map((d, i) => {
          const barH = maxCalories > 0 ? (d.calories / maxCalories) * usableHeight : 0;
          const x = CHART_PADDING_LEFT + i * barW;
          const y = CHART_PADDING_TOP + usableHeight - barH;
          const barColor = d.calories > dailyTargets.calories ? colors.warning : colors.primary;
          return (
            <Rect
              key={d.date}
              x={x + 1}
              y={d.calories === 0 ? CHART_PADDING_TOP + usableHeight - 2 : y}
              width={Math.max(barW - 2, 2)}
              height={d.calories === 0 ? 2 : barH}
              rx={2}
              fill={barColor}
              opacity={d.calories === 0 ? 0.15 : 0.75}
            />
          );
        })}
      </Svg>
    );
  };

  const renderWeightChart = () => {
    if (weightHistory.length < 2) return null;
    const last10 = weightHistory.slice(-10);
    const minW = Math.min(...last10.map(w => w.weight)) - 2;
    const maxW = Math.max(...last10.map(w => w.weight)) + 2;
    const usableHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
    const usableWidth = CHART_WIDTH - CHART_PADDING_LEFT - 10;
    const range = maxW - minW || 1;

    return (
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <SvgText x={4} y={CHART_PADDING_TOP + 10} fill={colors.textTertiary} fontSize={9}>{maxW.toFixed(0)}</SvgText>
        <SvgText x={4} y={CHART_PADDING_TOP + usableHeight} fill={colors.textTertiary} fontSize={9}>{minW.toFixed(0)}</SvgText>
        {weightPoints && (
          <Polyline
            points={weightPoints}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {last10.map((w, i) => {
          const x = CHART_PADDING_LEFT + (i / (last10.length - 1)) * usableWidth;
          const y = CHART_PADDING_TOP + usableHeight - ((w.weight - minW) / range) * usableHeight;
          return (
            <Circle
              key={w.date}
              cx={x}
              cy={y}
              r={4}
              fill={colors.primary}
              stroke={colors.surface}
              strokeWidth={2}
            />
          );
        })}
      </Svg>
    );
  };

  return (
    <View style={ds.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
            }
          >
            <View style={styles.header}>
              <View>
                <Text style={ds.title}>{tr('stats', 'title')}</Text>
              </View>
              <View style={ds.periodToggle}>
                <TouchableOpacity
                  style={[ds.periodBtn, period === 'week' && ds.periodBtnActive]}
                  onPress={() => { setPeriod('week'); void Haptics.selectionAsync(); }}
                >
                  <Text style={[ds.periodBtnText, period === 'week' && ds.periodBtnTextActive]}>{tr('stats', 'week')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ds.periodBtn, period === 'month' && ds.periodBtnActive]}
                  onPress={() => { setPeriod('month'); void Haptics.selectionAsync(); }}
                >
                  <Text style={[ds.periodBtnText, period === 'month' && ds.periodBtnTextActive]}>{tr('stats', 'month')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={ds.summaryCard}>
                <Text style={styles.summaryEmoji}>🔥</Text>
                <Text style={ds.summaryValue}>{todayPercent}%</Text>
                <Text style={ds.summaryLabel}>{tr('stats', 'today')}</Text>
              </View>
              <View style={ds.summaryCard}>
                <Text style={styles.summaryEmoji}>📊</Text>
                <Text style={ds.summaryValue}>{avgCalories}</Text>
                <Text style={ds.summaryLabel}>{tr('stats', 'avgKcal')}</Text>
              </View>
              <View style={ds.summaryCard}>
                <Text style={styles.summaryEmoji}>📝</Text>
                <Text style={ds.summaryValue}>{totalMealsCount}</Text>
                <Text style={ds.summaryLabel}>{tr('stats', 'totalMeals')}</Text>
              </View>
            </View>

            <View style={ds.streakCard}>
              <View style={styles.streakRow}>
                <View>
                  <Text style={ds.streakValue}>{streak.currentStreak}</Text>
                  <Text style={ds.streakLabel}>{tr('stats', 'streak')} 🔥</Text>
                </View>
                <View style={styles.streakRight}>
                  <View style={[ds.summaryCard, { padding: 10 }]}>
                    <Text style={[ds.summaryValue, { fontSize: 20 }]}>{streak.longestStreak}</Text>
                    <Text style={[ds.summaryLabel, { fontSize: 10 }]}>{tr('stats', 'highest')}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={ds.card}>
              <View style={styles.cardTitleRow}>
                <BarChart3 size={18} color={colors.primary} />
                <Text style={ds.cardTitle}>{tr('stats', 'caloriesLabel')} ({period === 'week' ? tr('stats', 'week') : tr('stats', 'month')})</Text>
              </View>
              <View style={styles.chartContainer}>
                {renderBarChart()}
              </View>
            </View>

            <View style={ds.card}>
              <View style={styles.cardTitleRow}>
                <TrendingUp size={18} color={colors.primary} />
                <Text style={ds.cardTitle}>{tr('stats', 'weightChange')}</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                  style={ds.weightBtn}
                  onPress={() => { setShowWeightInput(!showWeightInput); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Plus size={14} color={colors.primary} />
                  <Text style={ds.weightBtnText}>{tr('stats', 'addWeight')}</Text>
                </TouchableOpacity>
              </View>

              {showWeightInput && (
                <View style={styles.weightInputRow}>
                  <TextInput
                    style={ds.weightInput}
                    value={weightInput}
                    onChangeText={setWeightInput}
                    placeholder={tr('stats', 'enterWeight')}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    testID="weight-input"
                  />
                  <TouchableOpacity style={ds.weightSaveBtn} onPress={handleAddWeight} testID="weight-save">
                    <Text style={ds.weightSaveText}>{tr('common', 'save')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {weightHistory.length >= 2 ? (
                <View style={styles.chartContainer}>
                  {renderWeightChart()}
                </View>
              ) : (
                <Text style={ds.emptyChartText}>
                  {tr('stats', 'minWeightEntries')}
                </Text>
              )}

              {recentWeight && (
                <View style={styles.weightSummaryRow}>
                  <View style={styles.weightSummaryItem}>
                    <Scale size={14} color={colors.textSecondary} />
                    <Text style={[ds.summaryLabel, { marginTop: 0 }]}>{tr('stats', 'current')}: {recentWeight.weight} kg</Text>
                  </View>
                  {weightChange !== null && (
                    <View style={styles.weightSummaryItem}>
                      <Text style={[ds.summaryLabel, { marginTop: 0, color: weightChange > 0 ? colors.warning : colors.calories }]}>
                        {weightChange > 0 ? '+' : ''}{weightChange} kg {tr('stats', 'total')}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={ds.card}>
              <Text style={ds.cardTitle}>{tr('stats', 'macroDistribution')}</Text>
              <View style={styles.macroRow}>
                {[
                  { label: tr('common', 'protein'), current: todayTotals.protein, target: dailyTargets.protein, color: colors.protein, unit: 'g' },
                  { label: tr('common', 'carbs'), current: todayTotals.carbs, target: dailyTargets.carbs, color: colors.carbs, unit: 'g' },
                  { label: tr('common', 'fats'), current: todayTotals.fats, target: dailyTargets.fats, color: colors.fats, unit: 'g' },
                ].map(m => {
                  const pct = m.target > 0 ? Math.min(100, (m.current / m.target) * 100) : 0;
                  return (
                    <View key={m.label} style={styles.macroItem}>
                      <View style={[styles.macroCircle, { borderColor: m.color + '30' }]}>
                        <Text style={[styles.macroCircleValue, { color: m.color }]}>{Math.round(pct)}%</Text>
                      </View>
                      <Text style={[ds.summaryLabel, { textAlign: 'center' as const }]}>
                        {Math.round(m.current)}/{m.target}{m.unit}
                      </Text>
                      <Text style={[ds.summaryLabel, { fontSize: 10 }]}>{m.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryEmoji: { fontSize: 20, marginBottom: 4 },
  streakRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streakRight: { width: 90 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  chartContainer: { alignItems: 'center', marginHorizontal: -10 },
  weightInputRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  weightSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  weightSummaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around' },
  macroItem: { alignItems: 'center', gap: 6 },
  macroCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroCircleValue: { fontSize: 18, fontWeight: '800' as const },
  bottomSpacer: { height: 20 },
});
