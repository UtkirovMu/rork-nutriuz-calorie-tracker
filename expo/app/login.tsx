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
import { ArrowLeft, ChevronRight, ChevronDown, Check, Search, X, Scan, BarChart3, Brain, Apple } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { COUNTRY_CODES, DEFAULT_COUNTRY, CountryCode } from '@/constants/countries';

type LoginMethod = 'email' | 'phone';
type Step = 'input' | 'otp';

const OTP_LENGTH = 6;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CAROUSEL_SLIDES = [
  {
    icon: Scan,
    color: '#34C759',
    bg: '#34C759' + '18',
    titleUz: 'AI Skaner',
    titleRu: 'AI Сканер',
    titleEn: 'AI Scanner',
    descUz: 'Ovqatingizni rasmga oling — AI tarkibini tahlil qiladi',
    descRu: 'Сфотографируйте еду — AI проанализирует состав',
    descEn: 'Take a photo of your food — AI analyzes nutrition',
  },
  {
    icon: BarChart3,
    color: '#FF9500',
    bg: '#FF9500' + '18',
    titleUz: 'Statistika',
    titleRu: 'Статистика',
    titleEn: 'Statistics',
    descUz: "Kaloriya, oqsil, uglevod va yog'larni kuzating",
    descRu: 'Отслеживайте калории, белки, углеводы и жиры',
    descEn: 'Track calories, protein, carbs and fats',
  },
  {
    icon: Brain,
    color: '#AF52DE',
    bg: '#AF52DE' + '18',
    titleUz: 'AI Maslahatchi',
    titleRu: 'AI Консультант',
    titleEn: 'AI Advisor',
    descUz: "Shaxsiy ovqatlanish bo'yicha maslahat oling",
    descRu: 'Получайте персональные советы по питанию',
    descEn: 'Get personalized nutrition advice',
  },
  {
    icon: Apple,
    color: '#FF2D55',
    bg: '#FF2D55' + '18',
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
  const slideUp = useRef(new Animated.Value(40)).current;
  const otpFadeAnim = useRef(new Animated.Value(0)).current;
  const otpSlideAnim = useRef(new Animated.Value(30)).current;
  const inputFadeAnim = useRef(new Animated.Value(1)).current;
  const inputSlideAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideUp]);

  useEffect(() => {
    if (step === 'input') {
      carouselTimer.current = setInterval(() => {
        setCarouselIndex((prev) => {
          const next = (prev + 1) % CAROUSEL_SLIDES.length;
          carouselRef.current?.scrollTo({ x: next * (SCREEN_WIDTH - 56), animated: true });
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
    Animated.spring(buttonScale, { toValue: 0.96, friction: 8, useNativeDriver: true }).start();
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
    const slideWidth = SCREEN_WIDTH - 56;
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

  const ds = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
    },
    topSection: {
      paddingHorizontal: 28,
      paddingTop: 20,
    },
    logoRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      marginBottom: 24,
    },
    logoMark: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    logoText: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text,
      letterSpacing: -0.5,
    },
    carouselWrap: {
      marginBottom: 24,
    },
    carouselSlide: {
      width: SCREEN_WIDTH - 56,
      paddingHorizontal: 4,
    },
    slideCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 16,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    slideIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    slideTextWrap: {
      flex: 1,
    },
    slideTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
      marginBottom: 4,
    },
    slideDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    dotsRow: {
      flexDirection: 'row' as const,
      justifyContent: 'center' as const,
      gap: 6,
      marginTop: 14,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
    },
    dotActive: {
      width: 20,
      backgroundColor: colors.primary,
    },
    heroTitle: {
      fontSize: 30,
      fontWeight: '800' as const,
      color: colors.text,
      letterSpacing: -0.8,
      lineHeight: 36,
    },
    heroSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: 8,
      lineHeight: 22,
      marginBottom: 20,
    },
    formSection: {
      paddingHorizontal: 28,
      paddingBottom: Platform.OS === 'ios' ? 16 : 28,
    },
    tabRow: {
      flexDirection: 'row' as const,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 12,
      padding: 3,
      marginBottom: 16,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center' as const,
    },
    tabButtonActive: {
      backgroundColor: colors.surface,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.textTertiary,
    },
    tabTextActive: {
      color: colors.text,
      fontWeight: '600' as const,
    },
    inputField: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      height: 54,
      paddingHorizontal: 18,
      fontSize: 17,
      color: colors.text,
      borderWidth: 1.5,
      borderColor: colors.border,
      marginBottom: 12,
    },
    inputFieldFocused: {
      borderColor: colors.primary,
    },
    inputFieldError: {
      borderColor: colors.danger,
    },
    errorText: {
      fontSize: 13,
      color: colors.danger,
      marginBottom: 10,
      marginLeft: 4,
    },
    mainButton: {
      height: 54,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
      gap: 8,
    },
    mainButtonDisabled: {
      backgroundColor: colors.border,
    },
    mainButtonText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    termsText: {
      fontSize: 11,
      color: colors.textTertiary,
      textAlign: 'center' as const,
      marginTop: 14,
      lineHeight: 16,
      paddingHorizontal: 16,
    },
    phoneInputRow: {
      flexDirection: 'row' as const,
      gap: 8,
      marginBottom: 12,
    },
    countrySelector: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      borderRadius: 14,
      height: 54,
      paddingHorizontal: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      gap: 4,
    },
    countrySelectorFocused: {
      borderColor: colors.primary,
    },
    countryFlag: {
      fontSize: 22,
    },
    countryDial: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    phoneInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 14,
      height: 54,
      paddingHorizontal: 16,
      fontSize: 17,
      color: colors.text,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    phoneInputFocused: {
      borderColor: colors.primary,
    },
    phoneInputError: {
      borderColor: colors.danger,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end' as const,
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%' as const,
      paddingTop: 12,
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center' as const,
      marginBottom: 12,
    },
    modalHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text,
    },
    modalCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceSecondary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    searchContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.surfaceSecondary,
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
      color: colors.text,
      paddingVertical: 0,
    },
    otpBackRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      marginBottom: 28,
    },
    otpBackText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '500' as const,
    },
    otpTitle: {
      fontSize: 26,
      fontWeight: '700' as const,
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    otpSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 4,
    },
    otpIdentifier: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 32,
    },
    otpRow: {
      flexDirection: 'row' as const,
      gap: 8,
      marginBottom: 20,
      justifyContent: 'center' as const,
    },
    otpBox: {
      width: (SCREEN_WIDTH - 56 - 40) / 6,
      height: 56,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      textAlign: 'center' as const,
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    otpVerifyingRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      paddingVertical: 8,
    },
    otpVerifyingText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500' as const,
    },
    resendRow: {
      alignItems: 'center' as const,
      marginTop: 20,
    },
    resendText: {
      fontSize: 15,
      color: colors.primary,
      fontWeight: '500' as const,
    },
    resendTextDisabled: {
      color: colors.textTertiary,
    },
    successOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background + 'F0',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      zIndex: 10,
    },
    successCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#34C759',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  }), [colors]);

  const renderInputStep = () => (
    <Animated.View style={{
      flex: 1,
      opacity: inputFadeAnim,
      transform: [{ translateY: inputSlideAnim }],
    }}>
      <View style={ds.topSection}>
        <View style={ds.logoRow}>
          <View style={ds.logoMark}>
            <Text style={{ fontSize: 20, color: '#FFF' }}>🍃</Text>
          </View>
          <Text style={ds.logoText}>NutriUZ</Text>
        </View>

        <Text style={ds.heroTitle}>{tr('login', 'welcome')}</Text>
        <Text style={ds.heroSubtitle}>{tr('login', 'appDescription')}</Text>
      </View>

      <View style={ds.carouselWrap}>
        <ScrollView
          ref={carouselRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleCarouselScroll}
          contentContainerStyle={{ paddingHorizontal: 28 }}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH - 56}
          snapToAlignment="start"
        >
          {CAROUSEL_SLIDES.map((slide, i) => {
            const IconComp = slide.icon;
            return (
              <View key={i} style={ds.carouselSlide}>
                <View style={ds.slideCard}>
                  <View style={[ds.slideIconWrap, { backgroundColor: slide.bg }]}>
                    <IconComp size={24} color={slide.color} />
                  </View>
                  <View style={ds.slideTextWrap}>
                    <Text style={ds.slideTitle}>{getSlideTitle(slide)}</Text>
                    <Text style={ds.slideDesc} numberOfLines={2}>{getSlideDesc(slide)}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
        <View style={ds.dotsRow}>
          {CAROUSEL_SLIDES.map((_, i) => (
            <View key={i} style={[ds.dot, i === carouselIndex && ds.dotActive]} />
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <View style={ds.formSection}>
        <View style={ds.tabRow}>
          <TouchableOpacity
            style={[ds.tabButton, activeTab === 'phone' && ds.tabButtonActive]}
            onPress={() => switchTab('phone')}
            activeOpacity={0.7}
            testID="tab-phone"
          >
            <Text style={[ds.tabText, activeTab === 'phone' && ds.tabTextActive]}>
              {tr('login', 'phoneTab')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[ds.tabButton, activeTab === 'email' && ds.tabButtonActive]}
            onPress={() => switchTab('email')}
            activeOpacity={0.7}
            testID="tab-email"
          >
            <Text style={[ds.tabText, activeTab === 'email' && ds.tabTextActive]}>
              {tr('login', 'emailTab')}
            </Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          {activeTab === 'phone' ? (
            <View style={ds.phoneInputRow}>
              <TouchableOpacity
                style={[
                  ds.countrySelector,
                  inputFocused && ds.countrySelectorFocused,
                ]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCountryPickerVisible(true);
                }}
                activeOpacity={0.7}
                testID="country-selector"
              >
                <Text style={ds.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={ds.countryDial}>{selectedCountry.dial}</Text>
                <ChevronDown size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              <TextInput
                style={[
                  ds.phoneInput,
                  inputFocused && ds.phoneInputFocused,
                  error ? ds.phoneInputError : null,
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
                ds.inputField,
                inputFocused && ds.inputFieldFocused,
                error ? ds.inputFieldError : null,
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

        {error ? <Text style={ds.errorText}>{error}</Text> : null}

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[ds.mainButton, (!isInputValid || isLoading) && ds.mainButtonDisabled]}
            onPress={handleSendCode}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            disabled={!isInputValid || isLoading}
            activeOpacity={0.8}
            testID="send-code-button"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={ds.mainButtonText}>{tr('login', 'sendCode')}</Text>
                <ChevronRight size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Text style={ds.termsText}>{tr('login', 'termsText')}</Text>
      </View>
    </Animated.View>
  );

  const renderOTPStep = () => (
    <Animated.View style={{
      flex: 1,
      opacity: otpFadeAnim,
      transform: [{ translateY: otpSlideAnim }],
    }}>
      <View style={ds.topSection}>
        <TouchableOpacity style={ds.otpBackRow} onPress={handleGoBack} activeOpacity={0.6} disabled={isVerifying}>
          <ArrowLeft size={20} color={colors.primary} />
          <Text style={ds.otpBackText}>{tr('login', 'changeMethod')}</Text>
        </TouchableOpacity>

        <Text style={ds.otpTitle}>{tr('login', 'otpTitle')}</Text>
        <Text style={ds.otpSubtitle}>
          {tr('login', 'otpSubtitle').replace('{target}', '')}
        </Text>
        <Text style={ds.otpIdentifier}>{currentIdentifier}</Text>

        <Animated.View style={[ds.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
          {otpDigits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { otpInputRefs.current[index] = ref; }}
              style={[
                ds.otpBox,
                {
                  borderColor: getOtpBoxBorderColor(index),
                  backgroundColor: otpSuccess ? '#34C759' + '12' : digit ? colors.surfaceSecondary : colors.surface,
                },
                focusedOtpIndex === index && !otpSuccess && !error && { borderWidth: 2.5 },
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
          <View style={ds.otpVerifyingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={ds.otpVerifyingText}>{tr('login', 'verifying')}</Text>
          </View>
        )}

        {error && !isVerifying ? (
          <Text style={[ds.errorText, { textAlign: 'center' as const, marginTop: 4 }]}>{error}</Text>
        ) : null}

        <View style={ds.resendRow}>
          <TouchableOpacity
            onPress={handleResendCode}
            disabled={resendTimer > 0 || isLoading || isVerifying}
            activeOpacity={0.6}
          >
            <Text style={[ds.resendText, (resendTimer > 0 || isVerifying) && ds.resendTextDisabled]}>
              {resendTimer > 0
                ? tr('login', 'resendIn').replace('{sec}', resendTimer.toString())
                : tr('login', 'resendCode')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {successAnim && (
        <View style={ds.successOverlay}>
          <Animated.View style={[ds.successCircle, { transform: [{ scale: successScale }] }]}>
            <Check size={40} color="#FFFFFF" strokeWidth={3} />
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );

  return (
    <View style={ds.container}>
      <SafeAreaView style={ds.safeArea}>
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
      </SafeAreaView>

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
          style={ds.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setCountryPickerVisible(false);
            setCountrySearch('');
          }}
        >
          <TouchableOpacity activeOpacity={1} style={ds.modalContent}>
            <View style={ds.modalHandle} />
            <View style={ds.modalHeader}>
              <Text style={ds.modalTitle}>Davlatni tanlang</Text>
              <TouchableOpacity
                style={ds.modalCloseBtn}
                onPress={() => {
                  setCountryPickerVisible(false);
                  setCountrySearch('');
                }}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={ds.searchContainer}>
              <Search size={18} color={colors.textTertiary} />
              <TextInput
                style={ds.searchInput}
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

const countryItemStyle: Record<string, string | number> = {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 14,
  paddingHorizontal: 20,
  borderBottomWidth: StyleSheet.hairlineWidth,
};
