import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Camera, ImageIcon, X, Check, Flame, Beef, Wheat, Droplets, Sparkles, RotateCcw } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { MealType, FoodItem, AIFoodResult } from '@/types';
import { getTodayDateString } from '@/utils/calculations';

const PORTION_KEYS = [
  { key: 'small', grams: 100, icon: 'S' },
  { key: 'medium', grams: 200, icon: 'M' },
  { key: 'large', grams: 350, icon: 'L' },
];

const MEAL_OPTION_KEYS: { type: MealType; key: string; imageUrl: string }[] = [
  { type: 'breakfast', key: 'breakfast', imageUrl: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Sunrise/3D/sunrise_3d.png' },
  { type: 'lunch', key: 'lunch', imageUrl: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Sun/3D/sun_3d.png' },
  { type: 'dinner', key: 'dinner', imageUrl: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Crescent%20moon/3D/crescent_moon_3d.png' },
  { type: 'snack', key: 'snack', imageUrl: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Red%20apple/3D/red_apple_3d.png' },
];

const foodResultSchema = z.object({
  foods: z.array(z.object({
    name: z.string().describe('English name of the food'),
    nameUz: z.string().describe('Uzbek name of the food if applicable'),
    caloriesPer100g: z.number().describe('Calories per 100g'),
    proteinPer100g: z.number().describe('Protein in grams per 100g'),
    carbsPer100g: z.number().describe('Carbs in grams per 100g'),
    fatsPer100g: z.number().describe('Fat in grams per 100g'),
    estimatedPortionGrams: z.number().describe('Estimated portion size in grams from the photo'),
    confidence: z.number().min(0).max(1).describe('Confidence score 0-1'),
  })),
});

function PulsingDot({ color, delay }: { color: string; delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, delay]);

  return (
    <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity }} />
  );
}

export default function ScannerScreen() {
  const { addMeal } = useUser();
  const { colors, isDark } = useTheme();
  const { tr } = useLanguage();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [_imageBase64, setImageBase64] = useState<string | null>(null);
  const [results, setResults] = useState<AIFoodResult[]>([]);
  const [selectedFood, setSelectedFood] = useState<number>(0);
  const [portionGrams, setPortionGrams] = useState('200');
  const [selectedMealType, setSelectedMealType] = useState<MealType>(() => {
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 15) return 'lunch';
    if (hour < 20) return 'dinner';
    return 'snack';
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const resultFade = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const animateResults = useCallback(() => {
    resultFade.setValue(0);
    resultSlide.setValue(40);
    scaleAnim.setValue(0.95);
    Animated.parallel([
      Animated.timing(resultFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(resultSlide, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }),
    ]).start();
  }, [resultFade, resultSlide, scaleAnim]);

  const analyzeImageMutation = useMutation({
    mutationFn: async (base64: string) => {
      console.log('[Scanner] Analyzing image with AI...');
      const result = await generateObject({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this food photo and identify all food items. For each food item, provide:
- name (English)
- nameUz (Uzbek name, especially for Uzbek dishes like Plov, Somsa, Lagman, Manti, Shashlik, Non, Shurva, Chuchvara, Norin, Tandir kabob, Dimlama, etc.)
- caloriesPer100g
- proteinPer100g (grams)
- carbsPer100g (grams)
- fatsPer100g (grams)
- estimatedPortionGrams (estimate from the photo)
- confidence (0-1)

Be accurate with nutritional values. If you recognize Uzbek cuisine, use proper Uzbek names.`,
              },
              {
                type: 'image',
                image: base64,
              },
            ],
          },
        ],
        schema: foodResultSchema,
      });
      console.log('[Scanner] AI result:', JSON.stringify(result));
      return result.foods;
    },
    onSuccess: (data) => {
      setResults(data);
      if (data.length > 0) {
        setPortionGrams(String(data[0].estimatedPortionGrams));
      }
      animateResults();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      console.error('[Scanner] AI analysis error:', error);
      Alert.alert(tr('common', 'error'), tr('scanner', 'analyzeError'));
    },
  });

  const pickImage = useCallback(async (useCamera: boolean) => {
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      };

      let result: ImagePicker.ImagePickerResult;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(tr('scanner', 'permissionNeeded'), tr('scanner', 'cameraPermission'));
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setResults([]);
        if (asset.base64) {
          setImageBase64(asset.base64);
          analyzeImageMutation.mutate(asset.base64);
        }
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.error('[Scanner] Image pick error:', error);
      Alert.alert(tr('common', 'error'), tr('scanner', 'imageError'));
    }
  }, [analyzeImageMutation, tr]);

  const handleSave = useCallback(() => {
    if (results.length === 0) return;
    const food = results[selectedFood];
    const grams = parseFloat(portionGrams) || 200;
    const mult = grams / 100;

    const foodItem: FoodItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      name: food.name,
      nameUz: food.nameUz,
      calories: Math.round(food.caloriesPer100g * mult),
      protein: Math.round(food.proteinPer100g * mult * 10) / 10,
      carbs: Math.round(food.carbsPer100g * mult * 10) / 10,
      fats: Math.round(food.fatsPer100g * mult * 10) / 10,
      portionSize: grams,
      portionUnit: 'g',
      imageUri: imageUri ?? undefined,
    };

    addMeal({
      id: foodItem.id,
      foodItem,
      mealType: selectedMealType,
      date: getTodayDateString(),
      timestamp: Date.now(),
    });

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [results, selectedFood, portionGrams, selectedMealType, addMeal, imageUri]);

  const currentFood = results[selectedFood];
  const grams = parseFloat(portionGrams) || 0;
  const multiplier = grams / 100;

  const macroData = useMemo(() => {
    if (!currentFood) return null;
    return {
      calories: Math.round(currentFood.caloriesPer100g * multiplier),
      protein: Math.round(currentFood.proteinPer100g * multiplier * 10) / 10,
      carbs: Math.round(currentFood.carbsPer100g * multiplier * 10) / 10,
      fats: Math.round(currentFood.fatsPer100g * multiplier * 10) / 10,
    };
  }, [currentFood, multiplier]);

  const ds = useMemo(() => createDynamicStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={ds.screen}>
      <SafeAreaView style={staticStyles.safeArea}>
        <Animated.View style={[staticStyles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity
            style={ds.closeButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            testID="close-scanner"
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={staticStyles.headerCenter}>
            <Sparkles size={18} color={colors.primary} />
            <Text style={ds.headerTitle}>{tr('scanner', 'title')}</Text>
          </View>
          <View style={staticStyles.closePlaceholder} />
        </Animated.View>

        <ScrollView
          style={staticStyles.scrollView}
          contentContainerStyle={[staticStyles.scrollContent, imageUri ? staticStyles.scrollContentWithImage : null]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {!imageUri ? (
            <Animated.View style={[staticStyles.pickSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={ds.illustrationOuter}>
                <View style={ds.illustrationInner}>
                  <Camera size={40} color={colors.primary} />
                </View>
              </View>
              <Text style={ds.pickTitle}>{tr('scanner', 'scanFood')}</Text>
              <Text style={ds.pickSubtitle}>
                {tr('scanner', 'scanSubtitle')}
              </Text>

              <View style={staticStyles.pickButtonsCol}>
                <TouchableOpacity
                  style={ds.primaryButton}
                  onPress={() => pickImage(true)}
                  activeOpacity={0.85}
                  testID="camera-button"
                >
                  <View style={ds.primaryButtonIcon}>
                    <Camera size={22} color={colors.white} />
                  </View>
                  <View style={staticStyles.buttonTextCol}>
                    <Text style={ds.primaryButtonTitle}>{tr('scanner', 'camera')}</Text>
                    <Text style={ds.primaryButtonSub}>{tr('scanner', 'takePhoto')}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={ds.secondaryButton}
                  onPress={() => pickImage(false)}
                  activeOpacity={0.85}
                  testID="gallery-button"
                >
                  <View style={ds.secondaryButtonIcon}>
                    <ImageIcon size={22} color={colors.primary} />
                  </View>
                  <View style={staticStyles.buttonTextCol}>
                    <Text style={ds.secondaryButtonTitle}>{tr('scanner', 'gallery')}</Text>
                    <Text style={ds.secondaryButtonSub}>{tr('scanner', 'pickImage')}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : (
            <>
              <View style={ds.imageCard}>
                <Image
                  source={{ uri: imageUri }}
                  style={staticStyles.foodImage}
                  contentFit="cover"
                />
                <View style={ds.imageOverlayGradient}>
                  <TouchableOpacity
                    style={staticStyles.retakeButton}
                    onPress={() => {
                      setImageUri(null);
                      setImageBase64(null);
                      setResults([]);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.8}
                  >
                    <RotateCcw size={16} color="#FFFFFF" />
                    <Text style={staticStyles.retakeText}>{tr('scanner', 'retake')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {analyzeImageMutation.isPending && (
                <View style={ds.loadingCard}>
                  <View style={staticStyles.loadingDots}>
                    <PulsingDot color={colors.primary} delay={0} />
                    <PulsingDot color={colors.primary} delay={150} />
                    <PulsingDot color={colors.primary} delay={300} />
                  </View>
                  <Text style={ds.loadingTitle}>{tr('scanner', 'aiAnalyzing')}</Text>
                  <Text style={ds.loadingSubtitle}>{tr('scanner', 'analyzingContent')}</Text>
                </View>
              )}

              {results.length > 0 && currentFood && macroData && (
                <Animated.View style={[ds.resultSection, {
                  opacity: resultFade,
                  transform: [{ translateY: resultSlide }, { scale: scaleAnim }],
                }]}>
                  {results.length > 1 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={staticStyles.foodTabsContent}
                    >
                      {results.map((food, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[ds.foodTab, i === selectedFood && ds.foodTabActive]}
                          onPress={() => {
                            setSelectedFood(i);
                            setPortionGrams(String(food.estimatedPortionGrams));
                            void Haptics.selectionAsync();
                          }}
                        >
                          <Text style={[ds.foodTabText, i === selectedFood && ds.foodTabTextActive]}>
                            {food.nameUz || food.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  <View style={ds.resultCard}>
                    <View style={staticStyles.resultHeader}>
                      <View style={staticStyles.resultHeaderLeft}>
                        <Text style={ds.resultName}>{currentFood.nameUz || currentFood.name}</Text>
                        {currentFood.nameUz && (
                          <Text style={ds.resultNameEn}>{currentFood.name}</Text>
                        )}
                      </View>
                      <View style={ds.confidenceBadge}>
                        <Text style={ds.confidenceText}>
                          {Math.round(currentFood.confidence * 100)}%
                        </Text>
                      </View>
                    </View>

                    <View style={ds.calorieHighlight}>
                      <Flame size={20} color={colors.calories} />
                      <Text style={ds.calorieHighlightValue}>{macroData.calories}</Text>
                      <Text style={ds.calorieHighlightUnit}>kkal</Text>
                    </View>

                    <View style={staticStyles.macroRow}>
                      <View style={[ds.macroCard, { backgroundColor: colors.proteinLight }]}>
                        <View style={[staticStyles.macroIconWrap, { backgroundColor: colors.protein + '20' }]}>
                          <Beef size={16} color={colors.protein} />
                        </View>
                        <Text style={[ds.macroValue, { color: colors.protein }]}>{macroData.protein}g</Text>
                        <Text style={ds.macroLabel}>{tr('common', 'protein')}</Text>
                      </View>
                      <View style={[ds.macroCard, { backgroundColor: colors.carbsLight }]}>
                        <View style={[staticStyles.macroIconWrap, { backgroundColor: colors.carbs + '20' }]}>
                          <Wheat size={16} color={colors.carbs} />
                        </View>
                        <Text style={[ds.macroValue, { color: colors.carbs }]}>{macroData.carbs}g</Text>
                        <Text style={ds.macroLabel}>{tr('common', 'carbs')}</Text>
                      </View>
                      <View style={[ds.macroCard, { backgroundColor: colors.fatsLight }]}>
                        <View style={[staticStyles.macroIconWrap, { backgroundColor: colors.fats + '20' }]}>
                          <Droplets size={16} color={colors.fats} />
                        </View>
                        <Text style={[ds.macroValue, { color: colors.fats }]}>{macroData.fats}g</Text>
                        <Text style={ds.macroLabel}>{tr('common', 'fats')}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={ds.sectionCard}>
                    <Text style={ds.sectionTitle}>{tr('scanner', 'portionSize')}</Text>
                    <View style={staticStyles.portionOptions}>
                      {PORTION_KEYS.map(opt => {
                        const isActive = portionGrams === String(opt.grams);
                        return (
                          <TouchableOpacity
                            key={opt.key}
                            style={[ds.portionChip, isActive && ds.portionChipActive]}
                            onPress={() => {
                              setPortionGrams(String(opt.grams));
                              void Haptics.selectionAsync();
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[ds.portionChipIcon, isActive && ds.portionChipIconActive]}>{opt.icon}</Text>
                            <Text style={[ds.portionChipText, isActive && ds.portionChipTextActive]}>{tr('scanner', opt.key)}</Text>
                            <Text style={[ds.portionChipGrams, isActive && ds.portionChipGramsActive]}>{opt.grams}g</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View style={ds.customGramsRow}>
                      <Text style={ds.customGramsLabel}>{tr('scanner', 'exactGrams')}</Text>
                      <View style={ds.gramsInputWrapper}>
                        <TextInput
                          style={ds.gramsInput}
                          value={portionGrams}
                          onChangeText={setPortionGrams}
                          keyboardType="numeric"
                          placeholder="200"
                          placeholderTextColor={colors.textTertiary}
                          testID="grams-input"
                          selectTextOnFocus
                        />
                        <Text style={ds.gramsUnit}>g</Text>
                      </View>
                    </View>

                    <View style={ds.per100gBadge}>
                      <Text style={ds.per100gText}>100g = {currentFood.caloriesPer100g} kkal</Text>
                    </View>
                  </View>

                  <View style={ds.sectionCard}>
                    <Text style={ds.sectionTitle}>{tr('scanner', 'mealType')}</Text>
                    <View style={staticStyles.mealTypeGrid}>
                      {MEAL_OPTION_KEYS.map(opt => {
                        const isActive = selectedMealType === opt.type;
                        return (
                          <TouchableOpacity
                            key={opt.type}
                            style={[ds.mealTypeCard, isActive && ds.mealTypeCardActive]}
                            onPress={() => {
                              setSelectedMealType(opt.type);
                              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={[ds.mealTypeIconWrap, isActive && ds.mealTypeIconWrapActive]}>
                              <Image source={{ uri: opt.imageUrl }} style={staticStyles.mealTypeImage} />
                            </View>
                            <Text style={[ds.mealTypeLabel, isActive && ds.mealTypeLabelActive]}>{tr('meals', opt.key)}</Text>
                            {isActive && <View style={ds.mealTypeActiveDot} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={ds.saveButton}
                    onPress={handleSave}
                    activeOpacity={0.85}
                    testID="save-meal-button"
                  >
                    <Check size={22} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={ds.saveButtonText}>{tr('scanner', 'addToLog')}</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </>
          )}

          <View style={staticStyles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createDynamicStyles(colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    closeButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: 'Outfit_700Bold',
      color: colors.text,
      letterSpacing: -0.3,
    },
    illustrationOuter: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: colors.primaryLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 28,
    },
    illustrationInner: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDark ? colors.primary + '30' : colors.primary + '18',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    pickTitle: {
      fontSize: 28,
      fontFamily: 'Outfit_800ExtraBold',
      color: colors.text,
      marginBottom: 12,
      textAlign: 'center' as const,
      letterSpacing: -0.5,
    },
    pickSubtitle: {
      fontSize: 16,
      fontFamily: 'Outfit_400Regular',
      color: colors.textSecondary,
      textAlign: 'center' as const,
      lineHeight: 24,
      marginBottom: 36,
      paddingHorizontal: 16,
    },
    primaryButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.primary,
      borderRadius: 18,
      padding: 18,
      gap: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 4,
    },
    primaryButtonIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    primaryButtonTitle: {
      fontSize: 18,
      fontFamily: 'Outfit_700Bold',
      color: '#FFFFFF',
    },
    primaryButtonSub: {
      fontSize: 14,
      fontFamily: 'Outfit_500Medium',
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
    },
    secondaryButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 18,
      gap: 16,
      borderWidth: 1.5,
      borderColor: colors.borderLight,
    },
    secondaryButtonIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.primaryLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    secondaryButtonTitle: {
      fontSize: 18,
      fontFamily: 'Outfit_700Bold',
      color: colors.text,
    },
    secondaryButtonSub: {
      fontSize: 14,
      fontFamily: 'Outfit_500Medium',
      color: colors.textSecondary,
      marginTop: 2,
    },
    imageCard: {
      width: '100%',
      height: 300,
      marginTop: -20, // Negative margin to go behind header if possible, or just start high
      marginBottom: -40, // Let the bottom sheet overlap it
      zIndex: 0,
    },
    imageOverlayGradient: {
      position: 'absolute',
      bottom: 40,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
      paddingVertical: 20,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      // We could add a LinearGradient here for a real gradient, but background color is fine for now
    },
    resultSection: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
      paddingTop: 32,
      paddingHorizontal: 20,
      gap: 16,
      zIndex: 1,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: -10 },
      shadowOpacity: 1,
      shadowRadius: 20,
      elevation: 20,
    },
    loadingCard: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingVertical: 28,
      paddingHorizontal: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    loadingTitle: {
      fontSize: 16,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.text,
      marginTop: 16,
    },
    loadingSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },
    foodTab: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.borderLight,
    },
    foodTabActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    foodTabText: {
      fontSize: 14,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.textSecondary,
    },
    foodTabTextActive: {
      color: colors.primary,
    },
    resultCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    resultName: {
      fontSize: 26,
      fontFamily: 'Outfit_800ExtraBold',
      color: colors.text,
      letterSpacing: -0.5,
    },
    resultNameEn: {
      fontSize: 14,
      fontFamily: 'Outfit_500Medium',
      color: colors.textTertiary,
      marginTop: 4,
    },
    confidenceBadge: {
      backgroundColor: colors.caloriesLight,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    confidenceText: {
      fontSize: 14,
      fontFamily: 'Outfit_700Bold',
      color: colors.calories,
    },
    calorieHighlight: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      backgroundColor: colors.caloriesLight,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 16,
    },
    calorieHighlightValue: {
      fontSize: 32,
      fontFamily: 'Outfit_800ExtraBold',
      color: colors.calories,
      letterSpacing: -1,
    },
    calorieHighlightUnit: {
      fontSize: 18,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.calories,
      opacity: 0.7,
    },
    macroCard: {
      flex: 1,
      alignItems: 'center' as const,
      paddingVertical: 14,
      paddingHorizontal: 8,
      borderRadius: 16,
      gap: 6,
    },
    macroValue: {
      fontSize: 18,
      fontFamily: 'Outfit_700Bold',
      letterSpacing: -0.3,
    },
    macroLabel: {
      fontSize: 11,
      fontFamily: 'Outfit_500Medium',
      color: colors.textSecondary,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Outfit_700Bold',
      color: colors.text,
      marginBottom: 16,
      letterSpacing: -0.2,
    },
    portionChip: {
      flex: 1,
      alignItems: 'center' as const,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: colors.surfaceSecondary,
      gap: 4,
    },
    portionChipActive: {
      backgroundColor: colors.primaryLight,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    portionChipIcon: {
      fontSize: 18,
      fontFamily: 'Outfit_800ExtraBold',
      color: colors.textTertiary,
    },
    portionChipIconActive: {
      color: colors.primary,
    },
    portionChipText: {
      fontSize: 13,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.textSecondary,
    },
    portionChipTextActive: {
      color: colors.primary,
    },
    portionChipGrams: {
      fontSize: 11,
      color: colors.textTertiary,
    },
    portionChipGramsActive: {
      color: colors.primary,
    },
    customGramsRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    customGramsLabel: {
      fontSize: 14,
      fontFamily: 'Outfit_500Medium',
      color: colors.textSecondary,
    },
    gramsInputWrapper: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    gramsInput: {
      fontSize: 18,
      fontFamily: 'Outfit_700Bold',
      color: colors.primary,
      width: 56,
      textAlign: 'right' as const,
      padding: 0,
    },
    gramsUnit: {
      fontSize: 14,
      fontFamily: 'Outfit_500Medium',
      color: colors.textTertiary,
    },
    per100gBadge: {
      alignSelf: 'flex-start' as const,
      marginTop: 12,
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
    },
    per100gText: {
      fontSize: 12,
      fontFamily: 'Outfit_500Medium',
      color: colors.textTertiary,
    },
    mealTypeCard: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'flex-end' as const,
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderRadius: 22,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 2,
      borderColor: 'transparent',
      height: 72,
    },
    mealTypeCardActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
    mealTypeIconWrap: {
      position: 'absolute' as const,
      top: -18,
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 2,
      borderColor: colors.borderLight,
    },
    mealTypeIconWrapActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    mealTypeLabel: {
      fontSize: 12,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.textSecondary,
      marginBottom: 2,
    },
    mealTypeLabelActive: {
      color: colors.primary,
      fontFamily: 'Outfit_700Bold',
    },
    mealTypeActiveDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.primary,
      position: 'absolute' as const,
      bottom: 6,
    },
    saveButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      height: 58,
      backgroundColor: colors.primary,
      borderRadius: 18,
      gap: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 6,
    },
    saveButtonText: {
      fontSize: 18,
      fontFamily: 'Outfit_700Bold',
      color: '#FFFFFF',
      letterSpacing: -0.2,
    },
  });
}

const staticStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  closePlaceholder: {
    width: 38,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  scrollContentWithImage: {
    paddingHorizontal: 0, // Remove padding for image to stretch
  },
  pickSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  pickButtonsCol: {
    width: '100%',
    gap: 12,
  },
  buttonTextCol: {
    flex: 1,
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,

  },
  retakeText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },

  foodTabsContent: {
    gap: 8,
    paddingBottom: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  resultHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portionOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  mealTypeGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 18,
    paddingBottom: 4,
  },
  mealTypeImage: {
    width: 32,
    height: 32,
  },
  bottomSpacer: {
    height: 60,
  },
});
