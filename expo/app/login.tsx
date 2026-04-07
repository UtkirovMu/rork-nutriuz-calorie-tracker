import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Dimensions,
  Easing,
  Modal,
  FlatList,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChevronRight, ChevronDown, Check, Search, X, Scan, BarChart3, Brain, Apple, Phone, Mail, Shield } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { COUNTRY_CODES, DEFAULT_COUNTRY, CountryCode } from '@/constants/countries';

type LoginMethod = 'email' | 'phone';
type Step = 'input' | 'otp';

const OTP_LENGTH = 6;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CAROUSEL_SLIDES = [
  {
    icon: Scan,
    color: '#FFFFFF',
    bg: 'rgba(255,255,255,0.15)',
    titleUz: 'AI Skaner',
    titleRu: 'AI Сканер',
    titleEn: 'AI Scanner',
    descUz: 'Ovqatingizni rasmga oling — AI tarkibini tahlil qiladi',
    descRu: 'Сфотографируйте еду — AI проанализирует состав',
    descEn: 'Take a photo of your food — AI analyzes nutrition',
  },
  {
    icon: BarChart3,
    color: '#FFFFFF',
    bg: 'rgba(255,255,255,0.15)',
    titleUz: 'Statistika',
    titleRu: 'Статистика',
    titleEn: 'Statistics',
    descUz: "Kaloriya, oqsil, uglevod va yog'larni kuzating",
    descRu: 'Отслеживайте калории, белки, углеводы и жиры',
    descEn: 'Track calories, protein, carbs and fats',
  },
  {
    icon: Brain,
    color: '#FFFFFF',
    bg: 'rgba(255,255,255,0.15)',
    titleUz: 'AI Maslahatchi',
    titleRu: 'AI Консультант',
    titleEn: 'AI Advisor',
    descUz: "Shaxsiy ovqatlanish bo'yicha maslahat oling",
    descRu: 'Получайте персональные советы по питанию',
    descEn: 'Get personalized nutrition advice',
  },
  {
    icon: Apple,
    color: '#FFFFFF',
    bg: 'rgba(255,255,255,0.15)',
    titleUz: 'Ovqat rejasi',
    titleRu: 'План питания',
    titleEn: 'Meal Plan',
    descUz: "AI haftalik ovqat rejangizni tuzib beradi",
    descRu: 'AI составит ваш недельный план питания',
    descEn: 'AI creates your weekly meal plan',
  },
];

export default function LoginScreen() {
  const { colors } = useTheme();
  const { tr } = useLanguage();
  const { sendCode: apiSendCode, verifyCode: apiVerifyCode } = useAuth();
  const [activeTab, setActiveTab] = useState<LoginMethod>('phone');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [focusedOtpIndex, setFocusedOtpIndex] = useState<number | null>(null);
  const [successAnim, setSuccessAnim] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  const otpInputRefs = useRef<(TextInput | null)[]>([]);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const carouselRef = useRef<ScrollView>(null);
  const carouselTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(60)).current;
  const otpFadeAnim = useRef(new Animated.Value(0)).current;
  const otpSlideAnim = useRef(new Animated.Value(30)).current;
  const inputFadeAnim = useRef(new Animated.Value(1)).current;
  const inputSlideAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const heroScale = useRef(new Animated.Value(0.9)).current;
  const dotPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(heroScale, { toValue: 1, friction: 6, tension: 30, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideUp, heroScale]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 1.3, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [dotPulse]);

  useEffect(() => {
    if (step === 'input') {
      carouselTimer.current = setInterval(() => {
        setCarouselIndex((prev) => {
          const next = (prev + 1) % CAROUSEL_SLIDES.length;
          carouselRef.current?.scrollTo({ x: next * (SCREEN_WIDTH - 80), animated: true });
          return next;
        });
      }, 3500);
      return () => {
        if (carouselTimer.current) clearInterval(carouselTimer.current);
      };
    } else {
      if (carouselTimer.current) clearInterval(carouselTimer.current);
    }
  }, [step]);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRY_CODES;
    const q = countrySearch.toLowerCase();
    return COUNTRY_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  const switchTab = useCallback((tab: LoginMethod) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    setError('');
  }, []);

  const shakeInput = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const animateToOTP = useCallback(() => {
    Animated.parallel([
      Animated.timing(inputFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(inputSlideAnim, { toValue: -30, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      otpSlideAnim.setValue(30);
      otpFadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(otpFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(otpSlideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
      ]).start();
    });
  }, [otpSlideAnim, otpFadeAnim, inputSlideAnim, inputFadeAnim]);

  const animateToInput = useCallback(() => {
    Animated.parallel([
      Animated.timing(otpFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(otpSlideAnim, { toValue: 30, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      inputSlideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(inputFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(inputSlideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
      ]).start();
    });
  }, [otpSlideAnim, otpFadeAnim, inputSlideAnim, inputFadeAnim]);

  const validateEmail = (val: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  const validatePhone = (val: string): boolean => /^\d{5,15}$/.test(val.replace(/[\s\-()]/g, ''));

  const getFullPhoneNumber = useCallback(() => {
    return selectedCountry.dial + phone.replace(/[\s\-()]/g, '');
  }, [selectedCountry, phone]);

  const handleSendCode = useCallback(async () => {
    setError('');
    const identifier = activeTab === 'email' ? email.trim() : getFullPhoneNumber();

    if (activeTab === 'email' && !validateEmail(email.trim())) {
      setError(tr('login', 'invalidEmail'));
      shakeInput();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (activeTab === 'phone' && !validatePhone(phone.trim())) {
      setError(tr('login', 'invalidPhone'));
      shakeInput();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await apiSendCode(activeTab, identifier);
      console.log('[Login] Code sent to', identifier);

      setStep('otp');
      setResendTimer(60);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setOtpSuccess(false);
      setError('');
      animateToOTP();

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 500);
    } catch (err: unknown) {
      console.error('[Login] Send code error:', err);
      const errMsg = err instanceof Error ? err.message : tr('common', 'error');
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, email, phone, tr, shakeInput, animateToOTP, getFullPhoneNumber, apiSendCode]);

  const handleAutoVerify = useCallback(async (digits: string[]) => {
    const code = digits.join('');
    if (code.length !== OTP_LENGTH || isVerifying) return;

    setIsVerifying(true);
    setError('');

    try {
      const identifier = activeTab === 'email' ? email.trim() : getFullPhoneNumber();
      const result = await apiVerifyCode(activeTab, identifier, code);

      setOtpSuccess(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessAnim(true);
      Animated.spring(successScale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }).start();

      await new Promise((resolve) => setTimeout(resolve, 800));

      if (result.isNewUser || !result.profile?.onboardingComplete) {
        console.log('[Login] New user, going to onboarding');
        router.replace('/onboarding');
      } else {
        console.log('[Login] Existing account found');
        router.replace('/(tabs)/(home)');
      }
    } catch (err: unknown) {
      console.error('[Login] Verify error:', err);
      setOtpSuccess(false);
      setError(tr('login', 'invalidCode'));
      shakeInput();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      setTimeout(() => {
        setOtpDigits(Array(OTP_LENGTH).fill(''));
        setError('');
        otpInputRefs.current[0]?.focus();
      }, 800);
    } finally {
      setIsVerifying(false);
    }
  }, [activeTab, email, getFullPhoneNumber, apiVerifyCode, tr, shakeInput, successScale, isVerifying]);

  const handleOTPChange = useCallback((text: string, index: number) => {
    if (isVerifying || otpSuccess) return;

    const newDigits = [...otpDigits];
    if (text.length > 1) {
      const chars = text.split('').filter(c => /\d/.test(c)).slice(0, OTP_LENGTH - index);
      chars.forEach((char, i) => {
        if (index + i < OTP_LENGTH) newDigits[index + i] = char;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(index + chars.length, OTP_LENGTH - 1);
      otpInputRefs.current[nextIndex]?.focus();

      if (newDigits.join('').length === OTP_LENGTH) {
        void handleAutoVerify(newDigits);
      }
      return;
    }
    newDigits[index] = text;
    setOtpDigits(newDigits);
    setError('');
    if (text && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (newDigits.join('').length === OTP_LENGTH) {
      void handleAutoVerify(newDigits);
    }
  }, [otpDigits, isVerifying, otpSuccess, handleAutoVerify]);

  const handleOTPKeyPress = useCallback((key: string, index: number) => {
    if (isVerifying || otpSuccess) return;
    if (key === 'Backspace' && !otpDigits[index] && index > 0) {
      const newDigits = [...otpDigits];
      newDigits[index - 1] = '';
      setOtpDigits(newDigits);
      otpInputRefs.current[index - 1]?.focus();
    }
  }, [otpDigits, isVerifying, otpSuccess]);

  const handleResendCode = useCallback(async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const identifier = activeTab === 'email' ? email.trim() : getFullPhoneNumber();
      await apiSendCode(activeTab, identifier);
      console.log('[Login] Code resent to:', identifier);
      setResendTimer(60);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setOtpSuccess(false);
      setError('');
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      console.error('[Login] Resend error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [resendTimer, activeTab, email, getFullPhoneNumber, apiSendCode]);

  const handleGoBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('input');
    setError('');
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setOtpSuccess(false);
    setSuccessAnim(false);
    successScale.setValue(0);
    animateToInput();
  }, [animateToInput, successScale]);

  const isInputValid = useMemo(() => {
    if (activeTab === 'email') return email.trim().length > 0;
    return phone.trim().length > 0;
  }, [activeTab, email, phone]);

  const currentIdentifier = activeTab === 'email' ? email.trim() : getFullPhoneNumber();

  const handleButtonPressIn = useCallback(() => {
    Animated.spring(buttonScale, { toValue: 0.95, friction: 8, useNativeDriver: true }).start();
  }, [buttonScale]);

  const handleButtonPressOut = useCallback(() => {
    Animated.spring(buttonScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [buttonScale]);

  const handleSelectCountry = useCallback((country: CountryCode) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCountry(country);
    setCountryPickerVisible(false);
    setCountrySearch('');
  }, []);

  const handleCarouselScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const slideWidth = SCREEN_WIDTH - 80;
    const index = Math.round(offsetX / slideWidth);
    setCarouselIndex(index);
  }, []);

  const getSlideTitle = useCallback((slide: typeof CAROUSEL_SLIDES[0]) => {
    const lang = tr('common', 'save') === 'Saqlash' ? 'uz' : tr('common', 'save') === 'Сохранить' ? 'ru' : 'en';
    if (lang === 'ru') return slide.titleRu;
    if (lang === 'en') return slide.titleEn;
    return slide.titleUz;
  }, [tr]);

  const getSlideDesc = useCallback((slide: typeof CAROUSEL_SLIDES[0]) => {
    const lang = tr('common', 'save') === 'Saqlash' ? 'uz' : tr('common', 'save') === 'Сохранить' ? 'ru' : 'en';
    if (lang === 'ru') return slide.descRu;
    if (lang === 'en') return slide.descEn;
    return slide.descUz;
  }, [tr]);

  const renderCountryItem = useCallback(({ item }: { item: CountryCode }) => (
    <TouchableOpacity
      style={[
        countryItemStyle,
        { borderBottomColor: colors.border },
        item.code === selectedCountry.code && { backgroundColor: colors.primary + '10' },
      ]}
      onPress={() => handleSelectCountry(item)}
      activeOpacity={0.6}
    >
      <Text style={{ fontSize: 28, marginRight: 12 }}>{item.flag}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '500' as const, color: colors.text }}>{item.name}</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{item.code}</Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '600' as const, color: colors.textSecondary }}>{item.dial}</Text>
      {item.code === selectedCountry.code && (
        <Check size={18} color={colors.primary} style={{ marginLeft: 8 }} />
      )}
    </TouchableOpacity>
  ), [colors, selectedCountry, handleSelectCountry]);

  const getOtpBoxBorderColor = useCallback((index: number) => {
    if (otpSuccess) return '#34C759';
    if (error && otpDigits.join('').length === OTP_LENGTH) return colors.danger;
    if (error) return colors.danger;
    if (focusedOtpIndex === index) return colors.primary;
    if (otpDigits[index]) return colors.text + '40';
    return colors.border;
  }, [otpSuccess, error, otpDigits, focusedOtpIndex, colors]);

  const renderInputStep = () => (
    <Animated.View style={{
      flex: 1,
      opacity: inputFadeAnim,
      transform: [{ translateY: inputSlideAnim }],
    }}>
      <View style={styles.heroSection}>
        <LinearGradient
          colors={['#0A7B5C', '#0B8F6C', '#10A37F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBg}
        >
          <SafeAreaView edges={['top']} style={{ flex: 1 }}>
            <Animated.View style={[styles.heroContent, { transform: [{ scale: heroScale }] }]}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Text style={styles.logoEmoji}>🍃</Text>
                </View>
                <Text style={styles.brandName}>NutriUZ</Text>
              </View>

              <Text style={styles.heroTitle}>{tr('login', 'welcome')}</Text>
              <Text style={styles.heroSubtitle}>{tr('login', 'appDescription')}</Text>

              <View style={styles.carouselContainer}>
                <ScrollView
                  ref={carouselRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={handleCarouselScroll}
                  contentContainerStyle={{ paddingHorizontal: 0 }}
                  decelerationRate="fast"
                  snapToInterval={SCREEN_WIDTH - 80}
                  snapToAlignment="start"
                >
                  {CAROUSEL_SLIDES.map((slide, i) => {
                    const IconComp = slide.icon;
                    return (
                      <View key={i} style={[styles.carouselSlide, { width: SCREEN_WIDTH - 80 }]}>
                        <View style={styles.slideCard}>
                          <View style={[styles.slideIconWrap, { backgroundColor: slide.bg }]}>
                            <IconComp size={22} color={slide.color} />
                          </View>
                          <View style={styles.slideTextWrap}>
                            <Text style={styles.slideTitle}>{getSlideTitle(slide)}</Text>
                            <Text style={styles.slideDesc} numberOfLines={2}>{getSlideDesc(slide)}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
                <View style={styles.dotsRow}>
                  {CAROUSEL_SLIDES.map((_, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.dot,
                        i === carouselIndex && styles.dotActive,
                        i === carouselIndex && { transform: [{ scale: dotPulse }] },
                      ]}
                    />
                  ))}
                </View>
              </View>
            </Animated.View>
          </SafeAreaView>
        </LinearGradient>
      </View>

      <View style={[styles.formCard, { backgroundColor: colors.background }]}>
        <View style={[styles.tabRow, { backgroundColor: colors.surfaceSecondary }]}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'phone' && [styles.tabButtonActive, { backgroundColor: colors.surface }]]}
            onPress={() => switchTab('phone')}
            activeOpacity={0.7}
            testID="tab-phone"
          >
            <Phone size={15} color={activeTab === 'phone' ? colors.primary : colors.textTertiary} style={{ marginRight: 6 }} />
            <Text style={[styles.tabText, { color: colors.textTertiary }, activeTab === 'phone' && { color: colors.primary, fontWeight: '600' as const }]}>
              {tr('login', 'phoneTab')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'email' && [styles.tabButtonActive, { backgroundColor: colors.surface }]]}
            onPress={() => switchTab('email')}
            activeOpacity={0.7}
            testID="tab-email"
          >
            <Mail size={15} color={activeTab === 'email' ? colors.primary : colors.textTertiary} style={{ marginRight: 6 }} />
            <Text style={[styles.tabText, { color: colors.textTertiary }, activeTab === 'email' && { color: colors.primary, fontWeight: '600' as const }]}>
              {tr('login', 'emailTab')}
            </Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          {activeTab === 'phone' ? (
            <View style={styles.phoneInputRow}>
              <TouchableOpacity
                style={[
                  styles.countrySelector,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  inputFocused && { borderColor: colors.primary },
                ]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCountryPickerVisible(true);
                }}
                activeOpacity={0.7}
                testID="country-selector"
              >
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={[styles.countryDial, { color: colors.text }]}>{selectedCountry.dial}</Text>
                <ChevronDown size={14} color={colors.textTertiary} />
              </TouchableOpacity>
              <TextInput
                style={[
                  styles.phoneInput,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                  inputFocused && { borderColor: colors.primary },
                  error ? { borderColor: colors.danger } : null,
                ]}
                value={phone}
                onChangeText={(val) => { setPhone(val); setError(''); }}
                placeholder={tr('login', 'phonePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                testID="input-phone"
              />
            </View>
          ) : (
            <TextInput
              style={[
                styles.emailInput,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                inputFocused && { borderColor: colors.primary },
                error ? { borderColor: colors.danger } : null,
              ]}
              value={email}
              onChangeText={(val) => { setEmail(val); setError(''); }}
              placeholder={tr('login', 'emailPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              testID="input-email"
            />
          )}
        </Animated.View>

        {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[
              styles.mainButton,
              (!isInputValid || isLoading) && styles.mainButtonDisabled,
            ]}
            onPress={handleSendCode}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            disabled={!isInputValid || isLoading}
            activeOpacity={0.8}
            testID="send-code-button"
          >
            <LinearGradient
              colors={(!isInputValid || isLoading) ? ['#C8C8CC', '#AEAEB2'] : ['#0A7B5C', '#10A37F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.mainButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.mainButtonText}>{tr('login', 'sendCode')}</Text>
                  <ChevronRight size={20} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.secureRow}>
          <Shield size={12} color={colors.textTertiary} />
          <Text style={[styles.termsText, { color: colors.textTertiary }]}>{tr('login', 'termsText')}</Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderOTPStep = () => (
    <Animated.View style={{
      flex: 1,
      opacity: otpFadeAnim,
      transform: [{ translateY: otpSlideAnim }],
    }}>
      <View style={[styles.otpContainer, { backgroundColor: colors.background }]}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <View style={styles.otpInner}>
            <TouchableOpacity style={styles.otpBackRow} onPress={handleGoBack} activeOpacity={0.6} disabled={isVerifying}>
              <View style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}>
                <ArrowLeft size={20} color={colors.text} />
              </View>
            </TouchableOpacity>

            <View style={styles.otpHeader}>
              <View style={[styles.otpIconCircle, { backgroundColor: colors.primary + '15' }]}>
                <Mail size={28} color={colors.primary} />
              </View>
              <Text style={[styles.otpTitle, { color: colors.text }]}>{tr('login', 'otpTitle')}</Text>
              <Text style={[styles.otpSubtitle, { color: colors.textSecondary }]}>
                {tr('login', 'otpSubtitle').replace('{target}', '')}
              </Text>
              <View style={[styles.identifierBadge, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.otpIdentifier, { color: colors.text }]}>{currentIdentifier}</Text>
              </View>
            </View>

            <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
              {otpDigits.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { otpInputRefs.current[index] = ref; }}
                  style={[
                    styles.otpBox,
                    {
                      borderColor: getOtpBoxBorderColor(index),
                      backgroundColor: otpSuccess ? '#34C759' + '12' : digit ? colors.surfaceSecondary : colors.surface,
                      color: colors.text,
                    },
                    focusedOtpIndex === index && !otpSuccess && !error && { borderWidth: 2.5, borderColor: colors.primary },
                  ]}
                  value={digit}
                  onChangeText={(text) => handleOTPChange(text, index)}
                  onKeyPress={({ nativeEvent }) => handleOTPKeyPress(nativeEvent.key, index)}
                  onFocus={() => setFocusedOtpIndex(index)}
                  onBlur={() => setFocusedOtpIndex(null)}
                  keyboardType="number-pad"
                  maxLength={index === 0 ? OTP_LENGTH : 1}
                  selectTextOnFocus
                  editable={!isVerifying && !otpSuccess}
                  testID={`otp-input-${index}`}
                />
              ))}
            </Animated.View>

            {isVerifying && (
              <View style={styles.otpVerifyingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.otpVerifyingText, { color: colors.textSecondary }]}>{tr('login', 'verifying')}</Text>
              </View>
            )}

            {error && !isVerifying ? (
              <Text style={[styles.errorText, { textAlign: 'center' as const, marginTop: 4, color: colors.danger }]}>{error}</Text>
            ) : null}

            <View style={styles.resendRow}>
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={resendTimer > 0 || isLoading || isVerifying}
                activeOpacity={0.6}
                style={[styles.resendButton, { backgroundColor: resendTimer > 0 ? 'transparent' : colors.primary + '10' }]}
              >
                <Text style={[styles.resendText, { color: colors.primary }, (resendTimer > 0 || isVerifying) && { color: colors.textTertiary }]}>
                  {resendTimer > 0
                    ? tr('login', 'resendIn').replace('{sec}', resendTimer.toString())
                    : tr('login', 'resendCode')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {successAnim && (
        <View style={[styles.successOverlay, { backgroundColor: colors.background + 'F0' }]}>
          <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
            <Check size={40} color="#FFFFFF" strokeWidth={3} />
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideUp }],
        }}>
          {step === 'input' ? renderInputStep() : renderOTPStep()}
        </Animated.View>
      </KeyboardAvoidingView>

      <Modal
        visible={countryPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setCountryPickerVisible(false);
          setCountrySearch('');
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setCountryPickerVisible(false);
            setCountrySearch('');
          }}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Davlatni tanlang</Text>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => {
                  setCountryPickerVisible(false);
                  setCountrySearch('');
                }}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.surfaceSecondary }]}>
              <Search size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="Qidirish..."
                placeholderTextColor={colors.textTertiary}
                autoCorrect={false}
                testID="country-search"
              />
              {countrySearch.length > 0 && (
                <TouchableOpacity onPress={() => setCountrySearch('')}>
                  <X size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={renderCountryItem}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    flex: 1,
    minHeight: SCREEN_HEIGHT * 0.52,
  },
  heroBg: {
    flex: 1,
    overflow: 'hidden',
  },
  heroContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 16,
    justifyContent: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoEmoji: {
    fontSize: 22,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 40,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    marginBottom: 28,
  },
  carouselContainer: {
    marginBottom: 8,
  },
  carouselSlide: {
    paddingRight: 12,
  },
  slideCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  slideIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideTextWrap: {
    flex: 1,
  },
  slideTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  slideDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  formCard: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 11,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryDial: {
    fontSize: 15,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1.5,
  },
  emailInput: {
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 18,
    fontSize: 16,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 10,
    marginLeft: 4,
  },
  mainButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  mainButtonDisabled: {
    opacity: 0.7,
  },
  mainButtonGradient: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  mainButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  termsText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  otpContainer: {
    flex: 1,
  },
  otpInner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  otpBackRow: {
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpHeader: {
    alignItems: 'center',
    marginBottom: 36,
  },
  otpIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  otpTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  otpSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
  identifierBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  otpIdentifier: {
    fontSize: 15,
    fontWeight: '600',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  otpBox: {
    width: (SCREEN_WIDTH - 48 - 40) / 6,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  otpVerifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  otpVerifyingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 24,
  },
  resendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resendText: {
    fontSize: 15,
    fontWeight: '500',
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
});

const countryItemStyle: Record<string, string | number> = {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 14,
  paddingHorizontal: 20,
  borderBottomWidth: StyleSheet.hairlineWidth,
};
