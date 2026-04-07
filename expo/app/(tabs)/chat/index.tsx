import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Pressable,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bot, Send, Sparkles, RotateCcw, Apple, Dumbbell, Flame, Heart, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRorkAgent } from '@rork-ai/toolkit-sdk';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { calculateTDEE, calculateDailyTargets, calculateBMR } from '@/utils/calculations';
import ChatMarkdown from '@/components/ChatMarkdown';

const CONTEXT_PREFIX_REGEX = /^\[KONTEKST:[\s\S]*?\]\n\nFoydalanuvchi savoli:\s*/;

function cleanUserMessage(text: string): string {
  return text.replace(CONTEXT_PREFIX_REGEX, '');
}

interface QuickQuestion {
  text: string;
  icon: typeof Apple;
  color: string;
  bg: string;
}

interface TypingDotsProps {
  isDark: boolean;
  ds: ReturnType<typeof StyleSheet.create>;
  accentColor: string;
}

function TypingDots({ isDark, ds, accentColor }: TypingDotsProps) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;
  const scale1 = useRef(new Animated.Value(0.8)).current;
  const scale2 = useRef(new Animated.Value(0.8)).current;
  const scale3 = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, scale: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(dot, { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1.2, tension: 200, friction: 8, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(dot, { toValue: 0.3, duration: 350, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 0.8, tension: 200, friction: 8, useNativeDriver: true }),
          ]),
          Animated.delay(600 - delay),
        ])
      ).start();
    };
    animate(dot1, scale1, 0);
    animate(dot2, scale2, 150);
    animate(dot3, scale3, 300);
  }, [dot1, dot2, dot3, scale1, scale2, scale3]);

  const dotBase = {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: isDark ? '#636366' : '#AEAEB2',
  };

  return (
    <View style={(ds as any).typingRow}>
      <View style={(ds as any).aiAvatarSmall}>
        <Sparkles size={12} color={accentColor} />
      </View>
      <View style={(ds as any).typingBubble}>
        <Animated.View style={[dotBase, { opacity: dot1, transform: [{ scale: scale1 }], marginRight: 4 }]} />
        <Animated.View style={[dotBase, { opacity: dot2, transform: [{ scale: scale2 }], marginRight: 4 }]} />
        <Animated.View style={[dotBase, { opacity: dot3, transform: [{ scale: scale3 }] }]} />
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { profile, dailyTargets, todayTotals, todayMeals, meals } = useUser();
  const { colors, isDark } = useTheme();
  const { tr } = useLanguage();
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [inputFocused, setInputFocused] = useState(false);

  const headerFade = useRef(new Animated.Value(0)).current;
  const emptyFade = useRef(new Animated.Value(0)).current;
  const emptySlide = useRef(new Animated.Value(40)).current;
  const inputBarSlide = useRef(new Animated.Value(20)).current;
  const inputBarFade = useRef(new Animated.Value(0)).current;
  const sendBtnScale = useRef(new Animated.Value(1)).current;

  const messageAnimations = useRef<Map<string, Animated.Value>>(new Map());

  const accentColor = isDark ? '#0A84FF' : '#007AFF';

  const ds = useMemo(() => {
    const userBubbleColor = isDark ? '#0A84FF' : '#007AFF';
    const aiBubbleColor = isDark ? '#1C1C1E' : '#FFFFFF';

    return StyleSheet.create({
      screen: {
        flex: 1,
        backgroundColor: colors.background,
      },
      headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      },
      headerLeft: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: isDark ? 'rgba(10,132,255,0.12)' : 'rgba(0,122,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
      },
      headerInfo: {
        flex: 1,
        marginLeft: 12,
      },
      headerTitle: {
        fontSize: 17,
        fontWeight: '600' as const,
        color: colors.text,
        letterSpacing: -0.4,
      },
      headerStatus: {
        fontSize: 12,
        color: colors.textTertiary,
        fontWeight: '400' as const,
        marginTop: 1,
      },
      headerStatusActive: {
        color: '#34C759',
        fontWeight: '500' as const,
      },
      headerStatusTyping: {
        color: isDark ? '#0A84FF' : '#007AFF',
        fontWeight: '500' as const,
      },
      clearBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
        alignItems: 'center',
        justifyContent: 'center',
      },
      emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingBottom: 60,
      },
      emptyIconOuter: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: isDark ? 'rgba(10,132,255,0.08)' : 'rgba(0,122,255,0.04)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
      },
      emptyIconInner: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: isDark ? 'rgba(10,132,255,0.15)' : 'rgba(0,122,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
      },
      emptyTitle: {
        fontSize: 24,
        fontWeight: '700' as const,
        color: colors.text,
        marginBottom: 8,
        letterSpacing: -0.6,
      },
      emptySubtitle: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
        letterSpacing: -0.2,
      },
      quickGrid: {
        width: '100%',
        gap: 6,
      },
      quickCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      },
      quickCardPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }],
      },
      quickIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
      },
      quickText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '400' as const,
        color: colors.text,
        letterSpacing: -0.2,
      },
      userRow: {
        alignItems: 'flex-end',
        marginBottom: 6,
        paddingLeft: 48,
      },
      userBubble: {
        backgroundColor: userBubbleColor,
        borderRadius: 20,
        borderBottomRightRadius: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
      },
      userBubbleText: {
        fontSize: 16,
        color: '#FFFFFF',
        lineHeight: 22,
        letterSpacing: -0.2,
      },
      aiRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 6,
        paddingRight: 32,
        gap: 8,
      },
      aiAvatarSmall: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: isDark ? 'rgba(10,132,255,0.12)' : 'rgba(0,122,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
      },
      aiBubble: {
        flex: 1,
        backgroundColor: aiBubbleColor,
        borderRadius: 20,
        borderBottomLeftRadius: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: isDark ? 0 : StyleSheet.hairlineWidth,
        borderColor: isDark ? 'transparent' : 'rgba(0,0,0,0.04)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0 : 0.04,
        shadowRadius: 3,
        elevation: isDark ? 0 : 1,
      },
      typingRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 6,
        paddingRight: 32,
        gap: 8,
      },
      typingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: aiBubbleColor,
        borderRadius: 20,
        borderBottomLeftRadius: 6,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderWidth: isDark ? 0 : StyleSheet.hairlineWidth,
        borderColor: isDark ? 'transparent' : 'rgba(0,0,0,0.04)',
      },
      inputBarOuter: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        backgroundColor: isDark ? '#0E0E10' : '#F5F5F7',
      },
      inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
      },
      inputFieldWrap: {
        flex: 1,
        borderRadius: 22,
        overflow: 'hidden',
      },
      inputField: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
        borderRadius: 22,
        paddingHorizontal: 18,
        paddingTop: Platform.OS === 'ios' ? 11 : 9,
        paddingBottom: Platform.OS === 'ios' ? 11 : 9,
        maxHeight: 130,
        fontSize: 16,
        color: colors.text,
        letterSpacing: -0.2,
        borderWidth: 1.5,
      },
      sendBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 1,
      },
      sendBtnActive: {
        backgroundColor: isDark ? '#0A84FF' : '#007AFF',
      },
      sendBtnInactive: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      },
    });
  }, [colors, isDark]);

  const getMessageAnim = useCallback((id: string) => {
    if (!messageAnimations.current.has(id)) {
      const anim = new Animated.Value(0);
      messageAnimations.current.set(id, anim);
      Animated.spring(anim, {
        toValue: 1,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }).start();
    }
    return messageAnimations.current.get(id) as Animated.Value;
  }, []);

  const systemContext = useMemo(() => {
    const tdee = profile.onboardingComplete ? calculateTDEE(profile) : 2000;
    const bmr = profile.onboardingComplete ? calculateBMR(profile.gender, profile.weight, profile.height, profile.age) : 1600;
    const targets = profile.onboardingComplete ? calculateDailyTargets(profile) : dailyTargets;
    const goalLabels = { lose: "vazn yo'qotish", maintain: 'vaznni saqlash', gain: 'vazn olish' };
    const activityLabels = { sedentary: 'kam harakatli (ofis ishi, kam yurish)', moderate: "o'rtacha faol (haftada 3-5 marta mashq)", active: 'juda faol (har kuni mashq, jismoniy ish)' };

    const weightDiff = (profile.targetWeight || profile.weight) - profile.weight;
    const weightDirection = weightDiff > 0 ? 'oshirish' : weightDiff < 0 ? 'kamaytirish' : 'saqlash';
    const weightDiffAbs = Math.abs(weightDiff);

    const caloriesUsedPercent = targets.calories > 0 ? Math.round((todayTotals.calories / targets.calories) * 100) : 0;
    const proteinUsedPercent = targets.protein > 0 ? Math.round((todayTotals.protein / targets.protein) * 100) : 0;
    const carbsUsedPercent = targets.carbs > 0 ? Math.round((todayTotals.carbs / targets.carbs) * 100) : 0;
    const fatsUsedPercent = targets.fats > 0 ? Math.round((todayTotals.fats / targets.fats) * 100) : 0;

    const remainingCalories = Math.max(0, targets.calories - todayTotals.calories);
    const remainingProtein = Math.max(0, targets.protein - todayTotals.protein);
    const remainingCarbs = Math.max(0, targets.carbs - todayTotals.carbs);
    const remainingFats = Math.max(0, targets.fats - todayTotals.fats);

    const todayMealsByType: Record<string, string[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    const mealTypeLabelsUz: Record<string, string> = {
      breakfast: 'Nonushta',
      lunch: 'Tushlik',
      dinner: 'Kechki ovqat',
      snack: 'Gazak',
    };

    todayMeals.forEach(m => {
      const name = m.foodItem.nameUz || m.foodItem.name;
      const info = `${name} (${Math.round(m.foodItem.calories)} kkal, O:${Math.round(m.foodItem.protein)}g, U:${Math.round(m.foodItem.carbs)}g, Y:${Math.round(m.foodItem.fats)}g, ${m.foodItem.portionSize}${m.foodItem.portionUnit})`;
      if (todayMealsByType[m.mealType]) {
        todayMealsByType[m.mealType].push(info);
      }
    });

    let mealsDetail = '';
    for (const [type, items] of Object.entries(todayMealsByType)) {
      if (items.length > 0) {
        mealsDetail += `\n${mealTypeLabelsUz[type] || type}:\n${items.map(i => `  - ${i}`).join('\n')}`;
      }
    }

    const totalMealsAllTime = meals.length;
    const last7DaysMeals = meals.filter(m => {
      const mDate = new Date(m.date);
      const now = new Date();
      const diff = (now.getTime() - mDate.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    });
    const avgCalories7Days = last7DaysMeals.length > 0
      ? Math.round(last7DaysMeals.reduce((sum, m) => sum + m.foodItem.calories, 0) / 7)
      : 0;

    const bmiValue = profile.height > 0 ? (profile.weight / ((profile.height / 100) ** 2)).toFixed(1) : '0';
    let bmiCategory = '';
    const bmiNum = parseFloat(bmiValue);
    if (bmiNum < 18.5) bmiCategory = "kam vaznli (underweight)";
    else if (bmiNum < 25) bmiCategory = "normal vazn";
    else if (bmiNum < 30) bmiCategory = "ortiqcha vazn (overweight)";
    else bmiCategory = "semizlik (obese)";

    const weeksToGoal = weightDiffAbs > 0 ? Math.ceil(weightDiffAbs / 0.5) : 0;

    return `Sen Oqsil ilovasining professional AI ovqatlanish maslahatchisisan. Foydalanuvchiga faqat o'zbek tilida javob berasan. Sen dietolog va nutritsiolog sifatida maslahat berasan.

=== FOYDALANUVCHI PROFILI ===
Ism: ${profile.name || 'Noma\'lum'}
Jins: ${profile.gender === 'male' ? 'Erkak' : 'Ayol'}
Yosh: ${profile.age} yosh
Bo'y: ${profile.height} sm
Hozirgi vazn: ${profile.weight} kg
Maqsad vazn: ${profile.targetWeight || profile.weight} kg (${weightDiffAbs > 0 ? `${weightDiffAbs} kg ${weightDirection} kerak` : 'maqsadga yetgan'})
${weeksToGoal > 0 ? `Taxminiy muddat: ${weeksToGoal} hafta (haftada 0.5 kg tezlikda)` : ''}
BMI: ${bmiValue} (${bmiCategory})
BMR: ${Math.round(bmr)} kkal
Maqsad: ${goalLabels[profile.goal] || 'vaznni saqlash'}
Faollik darajasi: ${activityLabels[profile.activityLevel] || "o'rtacha faol"}
TDEE (kunlik energiya sarfi): ${tdee} kkal

=== KUNLIK MAQSADLAR ===
Kaloriya maqsadi: ${targets.calories} kkal
Oqsil (protein) maqsadi: ${targets.protein}g (${Math.round(targets.protein * 4)} kkal)
Uglevod (carbs) maqsadi: ${targets.carbs}g (${Math.round(targets.carbs * 4)} kkal)
Yog' (fats) maqsadi: ${targets.fats}g (${Math.round(targets.fats * 9)} kkal)

=== BUGUNGI HOLAT ===
Iste'mol qilingan kaloriya: ${Math.round(todayTotals.calories)} / ${targets.calories} kkal (${caloriesUsedPercent}%)
Iste'mol qilingan oqsil: ${Math.round(todayTotals.protein)} / ${targets.protein}g (${proteinUsedPercent}%)
Iste'mol qilingan uglevod: ${Math.round(todayTotals.carbs)} / ${targets.carbs}g (${carbsUsedPercent}%)
Iste'mol qilingan yog': ${Math.round(todayTotals.fats)} / ${targets.fats}g (${fatsUsedPercent}%)

Qolgan kaloriya bugun: ${remainingCalories} kkal
Qolgan oqsil: ${remainingProtein}g
Qolgan uglevod: ${remainingCarbs}g
Qolgan yog': ${remainingFats}g

=== BUGUNGI OVQATLAR ===${mealsDetail || '\nHali ovqat qo\'shilmagan'}

=== STATISTIKA ===
Jami yozilgan ovqatlar: ${totalMealsAllTime} ta
Oxirgi 7 kun o'rtacha kunlik kaloriya: ${avgCalories7Days} kkal

=== JAVOB QOIDALARI ===
1. Har doim o'zbek tilida javob ber
2. Foydalanuvchining shaxsiy ma'lumotlari, BMI, maqsadi va bugungi holati asosida maslahat ber
3. Aniq va foydali javob ber, kerak bo'lsa raqamlar bilan
4. Ovqat tavsiya qilganda kaloriya va makronutrientlarni ko'rsat
5. Ilmiy asoslangan maslahatlar ber
6. Agar foydalanuvchi bugun ko'p kaloriya iste'mol qilgan bo'lsa, ogohlantir va yengil alternativalar tavsiya qil
7. Agar oqsil yetarli bo'lmasa, oqsilga boy ovqatlar tavsiya qil
8. Oddiy, tushunarli tilda yoz
9. Kerak bo'lsa ro'yxat (bullet points) ishlat
10. Javobni qisqa paragraflar bilan yoz, har bir fikrni alohida qatorda yoz
11. Haddan tashqari uzun javob berma - muhim ma'lumotlarni qisqa va aniq yetkazib ber
12. Emoji ishlatishni minimal darajada tut`;
  }, [profile, dailyTargets, todayTotals, todayMeals, meals]);

  const { messages, sendMessage, setMessages, status } = useRorkAgent({
    tools: {},
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(emptyFade, { toValue: 1, duration: 700, delay: 200, useNativeDriver: true }),
      Animated.spring(emptySlide, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      Animated.timing(inputBarFade, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true }),
      Animated.spring(inputBarSlide, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
  }, [headerFade, emptyFade, emptySlide, inputBarFade, inputBarSlide]);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [messages]);


  const handleSend = useCallback((text?: string) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isLoading) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(sendBtnScale, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.spring(sendBtnScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();

    if (!text) setInput('');
    const contextPrefix = messages.length === 0 ? `[KONTEKST: ${systemContext}]\n\nFoydalanuvchi savoli: ` : '';
    sendMessage(contextPrefix + trimmed);
  }, [input, isLoading, sendMessage, messages.length, systemContext, sendBtnScale]);

  const handleClear = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    messageAnimations.current.clear();
    setMessages([]);
  }, [setMessages]);

  const quickQuestions: QuickQuestion[] = useMemo(() => [
    { text: tr('chat', 'q1'), icon: Apple, color: '#34C759', bg: isDark ? 'rgba(52,199,89,0.12)' : 'rgba(52,199,89,0.08)' },
    { text: tr('chat', 'q2'), icon: Dumbbell, color: '#FF6B6B', bg: isDark ? 'rgba(255,107,107,0.12)' : 'rgba(255,107,107,0.08)' },
    { text: tr('chat', 'q3'), icon: Flame, color: '#FF9500', bg: isDark ? 'rgba(255,149,0,0.12)' : 'rgba(255,149,0,0.08)' },
    { text: tr('chat', 'q4'), icon: Heart, color: '#FF2D55', bg: isDark ? 'rgba(255,45,85,0.12)' : 'rgba(255,45,85,0.08)' },
  ], [isDark, tr]);

  const canSend = input.trim().length > 0 && !isLoading;

  const inputBorderColor = inputFocused
    ? (isDark ? 'rgba(10,132,255,0.5)' : 'rgba(0,122,255,0.4)')
    : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)');

  const renderMessage = useCallback(({ item: m }: ListRenderItemInfo<typeof messages[0]>) => {
    const anim = getMessageAnim(m.id);
    const isUser = m.role === 'user';

    return (
      <Animated.View
        style={{
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1],
              }),
            },
          ],
        }}
      >
        {isUser ? (
          <View style={ds.userRow}>
            <View style={ds.userBubble}>
              {m.parts.map((part, i) => {
                if (part.type === 'text') {
                  return (
                    <Text key={`${m.id}-${i}`} style={ds.userBubbleText}>
                      {cleanUserMessage(part.text)}
                    </Text>
                  );
                }
                return null;
              })}
            </View>
          </View>
        ) : m.role === 'assistant' ? (
          <View style={ds.aiRow}>
            <View style={ds.aiAvatarSmall}>
              <Sparkles size={12} color={accentColor} />
            </View>
            <View style={ds.aiBubble}>
              {m.parts.map((part, i) => {
                if (part.type === 'text') {
                  return (
                    <ChatMarkdown
                      key={`${m.id}-${i}`}
                      text={part.text}
                      colors={colors}
                    />
                  );
                }
                return null;
              })}
            </View>
          </View>
        ) : null}
      </Animated.View>
    );
  }, [colors, ds, accentColor, getMessageAnim]);

  const keyExtractor = useCallback((item: typeof messages[0]) => item.id, []);

  const showTyping = isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user';

  const ListFooter = useMemo(() => {
    if (showTyping) {
      return <TypingDots isDark={isDark} ds={ds} accentColor={accentColor} />;
    }
    return <View style={staticStyles.bottomSpacer} />;
  }, [showTyping, isDark, ds, accentColor]);

  const renderEmptyState = () => (
    <Animated.View style={[ds.emptyContainer, { opacity: emptyFade, transform: [{ translateY: emptySlide }] }]}>
      <View style={ds.emptyIconOuter}>
        <View style={ds.emptyIconInner}>
          <Sparkles size={28} color={accentColor} />
        </View>
      </View>
      <Text style={ds.emptyTitle}>{tr('chat', 'title')}</Text>
      <Text style={ds.emptySubtitle}>
        {tr('chat', 'subtitle')}
      </Text>
      <View style={ds.quickGrid}>
        {quickQuestions.map((q, i) => {
          const IconComp = q.icon;
          return (
            <Pressable
              key={i}
              style={({ pressed }) => [ds.quickCard, pressed && ds.quickCardPressed]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleSend(q.text);
              }}
              testID={`quick-q-${i}`}
            >
              <View style={[ds.quickIconWrap, { backgroundColor: q.bg }]}>
                <IconComp size={18} color={q.color} />
              </View>
              <Text style={ds.quickText} numberOfLines={1}>{q.text}</Text>
              <ChevronRight size={16} color={colors.textTertiary} />
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );

  return (
    <View style={ds.screen}>
      <SafeAreaView style={staticStyles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={staticStyles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <Animated.View style={[ds.headerBar, { opacity: headerFade }]}>
            <View style={ds.headerLeft}>
              <Bot size={20} color={accentColor} />
            </View>
            <View style={ds.headerInfo}>
              <Text style={ds.headerTitle}>{tr('chat', 'title')}</Text>
              <Text style={[
                ds.headerStatus,
                isLoading && ds.headerStatusTyping,
                !isLoading && messages.length > 0 && ds.headerStatusActive,
              ]}>
                {isLoading ? tr('chat', 'typing') : messages.length > 0 ? tr('chat', 'online') : tr('chat', 'advisor')}
              </Text>
            </View>
            {messages.length > 0 && (
              <Pressable
                style={({ pressed }) => [ds.clearBtn, pressed && { opacity: 0.6 }]}
                onPress={handleClear}
                testID="chat-clear"
              >
                <RotateCcw size={16} color={colors.textSecondary} />
              </Pressable>
            )}
          </Animated.View>

          {messages.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={keyExtractor}
              contentContainerStyle={staticStyles.messagesContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
              ListFooterComponent={ListFooter}
            />
          )}

          <SafeAreaView edges={['bottom']} style={ds.inputBarOuter}>
            <Animated.View style={[ds.inputBar, { opacity: inputBarFade, transform: [{ translateY: inputBarSlide }] }]}>
              <View style={ds.inputFieldWrap}>
                <TextInput
                  style={[ds.inputField, { borderColor: inputBorderColor }]}
                  value={input}
                  onChangeText={setInput}
                  placeholder={tr('chat', 'placeholder')}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  returnKeyType="default"
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  testID="chat-input"
                />
              </View>
              <Animated.View style={{ transform: [{ scale: sendBtnScale }] }}>
                <Pressable
                  style={({ pressed }) => [
                    ds.sendBtn,
                    canSend ? ds.sendBtnActive : ds.sendBtnInactive,
                    pressed && canSend && { opacity: 0.8 },
                  ]}
                  onPress={() => handleSend()}
                  disabled={!canSend}
                  testID="chat-send"
                >
                  <Send
                    size={18}
                    color={canSend ? '#FFFFFF' : colors.textTertiary}
                    strokeWidth={2.5}
                  />
                </Pressable>
              </Animated.View>
            </Animated.View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  bottomSpacer: {
    height: 12,
  },
});
