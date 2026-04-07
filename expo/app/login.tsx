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
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, ChevronDown, Check, Search, X, Phone, Mail, Lock, Leaf, Sparkles, TrendingUp, Camera } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { COUNTRY_CODES, DEFAULT_COUNTRY, CountryCode } from '@/constants/countries';

type LoginMethod = 'email' | 'phone';
type Step = 'input' | 'otp';

const OTP_LENGTH = 6;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FEATURES = [
  {
    icon: Camera,
    titleUz: 'AI Skaner',
    titleRu: 'AI Сканер',
    titleEn: 'AI Scanner',
    descUz: 'Ovqatni rasmga oling',
    descRu: 'Сфотографируйте еду',
    descEn: 'Snap your food',
  },
  {
    icon: TrendingUp,
    titleUz: 'Statistika',
    titleRu: 'Статистика',
    titleEn: 'Statistics',
    descUz: 'Kaloriyani kuzating',
    descRu: 'Отслеживайте калории',
    descEn: 'Track calories',
  },
  {
    icon: Sparkles,
    titleUz: 'AI Maslahat',
    titleRu: 'AI Советы',
    titleEn: 'AI Advice',
    descUz: 'Shaxsiy tavsiyalar',
    descRu: 'Персональные советы',
    descEn: 'Personal tips',
  },
  {
    icon: Leaf,
    titleUz: 'Ovqat rejasi',
    titleRu: 'План питания',
    titleEn: 'Meal Plan',
    descUz: 'Haftalik reja',
    descRu: 'Недельный план',
    descEn: 'Weekly plan',
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
  const [isVerifying, setIsVerifying] = useState(false);
  const [featureIndex, setFeatureIndex] = useState(0);

  const otpInputRefs = useRef<(TextInput | null)[]>([]);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const featureScrollRef = useRef<ScrollView>(null);
  const featureTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const otpFadeAnim = useRef(new Animated.Value(0)).current;
  const otpSlideAnim = useRef(new Animated.Value(30)).current;
  const inputFadeAnim = useRef(new Animated.Value(1)).current;
  const inputSlideAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 9, tension: 40, useNativeDriver: true }),
    ]).start();

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, { toValue: -6, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(logoFloat, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    float.start();
    return () => float.stop();
  }, [fadeAnim, slideUp, logoFloat]);

  useEffect(() => {
    if (step === 'input') {
      featureTimer.current = setInterval(() => {
        setFeatureIndex((prev) => {
          const next = (prev + 1) % FEATURES.length;
          featureScrollRef.current?.scrollTo({ x: next * (SCREEN_WIDTH - 64), animated: true });
          return next;
        });
      }, 3000);
      return () => {
        if (featureTimer.current) clearInterval(featureTimer.current);
      };
    } else {
      if (featureTimer.current) clearInterval(featureTimer.current);
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

  const getLang = useCallback(() => {
    return tr('common', 'save') === 'Saqlash' ? 'uz' : tr('common', 'save') === 'Сохранить' ? 'ru' : 'en';
  }, [tr]);

  const switchTab = useCallback((tab: LoginMethod) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    setError('');
  }, []);

  const shakeInput = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
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

  const handleFeatureScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const slideWidth = SCREEN_WIDTH - 64;
    const index = Math.round(offsetX / slideWidth);
    setFeatureIndex(index);
  }, []);

  const getFeatureTitle = useCallback((f: typeof FEATURES[0]) => {
    const lang = getLang();
    if (lang === 'ru') return f.titleRu;
    if (lang === 'en') return f.titleEn;
    return f.titleUz;
  }, [getLang]);

  const getFeatureDesc = useCallback((f: typeof FEATURES[0]) => {
    const lang = getLang();
    if (lang === 'ru') return f.descRu;
    if (lang === 'en') return f.descEn;
    return f.descUz;
  }, [getLang]);

  const renderCountryItem = useCallback(({ item }: { item: CountryCode }) => (
    <TouchableOpacity
      style={[
        styles.countryItem,
        { borderBottomColor: colors.border },
        item.code === selectedCountry.code && { backgroundColor: colors.primary + '08' },
      ]}
      onPress={() => handleSelectCountry(item)}
      activeOpacity={0.6}
    >
      <Text style={styles.countryItemFlag}>{item.flag}</Text>
      <View style={styles.countryItemInfo}>
        <Text style={[styles.countryItemName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.countryItemCode, { color: colors.textTertiary }]}>{item.code}</Text>
      </View>
      <Text style={[styles.countryItemDial, { color: colors.textSecondary }]}>{item.dial}</Text>
      {item.code === selectedCountry.code && (
        <Check size={18} color={colors.primary} style={{ marginLeft: 8 }} />
      )}
    </TouchableOpacity>
  ), [colors, selectedCountry, handleSelectCountry]);

  const getOtpBoxStyle = useCallback((index: number) => {
    if (otpSuccess) return { borderColor: '#34C759', backgroundColor: '#34C759' + '08' };
    if (error) return { borderColor: colors.danger, backgroundColor: colors.danger + '06' };
    if (focusedOtpIndex === index) return { borderColor: colors.text, backgroundColor: colors.surface };
    if (otpDigits[index]) return { borderColor: colors.border, backgroundColor: colors.surfaceSecondary };
    return { borderColor: colors.border, backgroundColor: colors.surface };
  }, [otpSuccess, error, focusedOtpIndex, otpDigits, colors]);

  const accentColor = '#1A1A1A';
  const isDark = colors.background === '#0E0E10';

  const renderInputStep = () => (
    <Animated.View style={{
      flex: 1,
      opacity: inputFadeAnim,
      transform: [{ translateY: inputSlideAnim }],
    }}>
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: 'transparent' }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.inputScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.headerSection}>
            <Animated.View style={[styles.logoWrap, { transform: [{ translateY: logoFloat }] }]}>
              <View style={[styles.logoBox, { backgroundColor: isDark ? '#1C3D2E' : '#E8F5EE' }]}>
                <Leaf size={28} color={colors.primary} strokeWidth={2.5} />
              </View>
            </Animated.View>

            <Text style={[styles.appName, { color: colors.text }]}>NutriUZ</Text>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>{tr('login', 'welcome')}</Text>
            <Text style={[styles.welcomeDesc, { color: colors.textSecondary }]}>
              {tr('login', 'appDescription')}
            </Text>
          </View>

          <View style={styles.featuresSection}>
            <ScrollView
              ref={featureScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleFeatureScroll}
              decelerationRate="fast"
              snapToInterval={SCREEN_WIDTH - 64}
              snapToAlignment="start"
            >
              {FEATURES.map((feature, i) => {
                const IconComp = feature.icon;
                return (
                  <View key={i} style={[styles.featureSlide, { width: SCREEN_WIDTH - 64 }]}>
                    <View style={[styles.featureCard, {
                      backgroundColor: isDark ? colors.surface : '#F8F8FA',
                      borderColor: isDark ? colors.border : '#EFEFEF',
                    }]}>
                      <View style={[styles.featureIconBox, { backgroundColor: colors.primary + '12' }]}>
                        <IconComp size={18} color={colors.primary} strokeWidth={2} />
                      </View>
                      <View style={styles.featureTextWrap}>
                        <Text style={[styles.featureTitle, { color: colors.text }]}>{getFeatureTitle(feature)}</Text>
                        <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{getFeatureDesc(feature)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.dotsRow}>
              {FEATURES.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i === featureIndex ? colors.text : colors.border },
                    i === featureIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          <View style={styles.formSection}>
            <View style={[styles.segmentControl, { backgroundColor: isDark ? colors.surfaceSecondary : '#F0F0F2' }]}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  activeTab === 'phone' && [styles.segmentBtnActive, { backgroundColor: isDark ? colors.surface : '#FFFFFF' }],
                ]}
                onPress={() => switchTab('phone')}
                activeOpacity={0.7}
                testID="tab-phone"
              >
                <Phone size={14} color={activeTab === 'phone' ? colors.text : colors.textTertiary} style={{ marginRight: 5 }} />
                <Text style={[
                  styles.segmentText,
                  { color: activeTab === 'phone' ? colors.text : colors.textTertiary },
                  activeTab === 'phone' && styles.segmentTextActive,
                ]}>
                  {tr('login', 'phoneTab')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  activeTab === 'email' && [styles.segmentBtnActive, { backgroundColor: isDark ? colors.surface : '#FFFFFF' }],
                ]}
                onPress={() => switchTab('email')}
                activeOpacity={0.7}
                testID="tab-email"
              >
                <Mail size={14} color={activeTab === 'email' ? colors.text : colors.textTertiary} style={{ marginRight: 5 }} />
                <Text style={[
                  styles.segmentText,
                  { color: activeTab === 'email' ? colors.text : colors.textTertiary },
                  activeTab === 'email' && styles.segmentTextActive,
                ]}>
                  {tr('login', 'emailTab')}
                </Text>
              </TouchableOpacity>
            </View>

            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              {activeTab === 'phone' ? (
                <View style={styles.phoneRow}>
                  <TouchableOpacity
                    style={[
                      styles.countryBtn,
                      {
                        backgroundColor: isDark ? colors.surface : '#F8F8FA',
                        borderColor: inputFocused ? colors.text : (isDark ? colors.border : '#E8E8EC'),
                      },
                    ]}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCountryPickerVisible(true);
                    }}
                    activeOpacity={0.7}
                    testID="country-selector"
                  >
                    <Text style={styles.flagText}>{selectedCountry.flag}</Text>
                    <Text style={[styles.dialText, { color: colors.text }]}>{selectedCountry.dial}</Text>
                    <ChevronDown size={12} color={colors.textTertiary} />
                  </TouchableOpacity>
                  <TextInput
                    style={[
                      styles.phoneInput,
                      {
                        backgroundColor: isDark ? colors.surface : '#F8F8FA',
                        borderColor: inputFocused ? colors.text : (isDark ? colors.border : '#E8E8EC'),
                        color: colors.text,
                      },
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
                    {
                      backgroundColor: isDark ? colors.surface : '#F8F8FA',
                      borderColor: inputFocused ? colors.text : (isDark ? colors.border : '#E8E8EC'),
                      color: colors.text,
                    },
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
                  styles.sendBtn,
                  { backgroundColor: isDark ? '#FFFFFF' : accentColor },
                  (!isInputValid || isLoading) && { opacity: 0.35 },
                ]}
                onPress={handleSendCode}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                disabled={!isInputValid || isLoading}
                activeOpacity={0.8}
                testID="send-code-button"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={isDark ? '#000000' : '#FFFFFF'} />
                ) : (
                  <Text style={[styles.sendBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                    {tr('login', 'sendCode')}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.termsRow}>
              <Lock size={11} color={colors.textTertiary} />
              <Text style={[styles.termsText, { color: colors.textTertiary }]}>{tr('login', 'termsText')}</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );

  const renderOTPStep = () => (
    <Animated.View style={{
      flex: 1,
      opacity: otpFadeAnim,
      transform: [{ translateY: otpSlideAnim }],
    }}>
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: 'transparent' }}>
        <View style={styles.otpContainer}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: isDark ? colors.surfaceSecondary : '#F0F0F2' }]}
            onPress={handleGoBack}
            activeOpacity={0.6}
            disabled={isVerifying}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.otpHeader}>
            <View style={[styles.otpIconWrap, { backgroundColor: isDark ? colors.surfaceSecondary : '#F0F0F2' }]}>
              <Lock size={24} color={colors.text} strokeWidth={1.5} />
            </View>
            <Text style={[styles.otpTitle, { color: colors.text }]}>{tr('login', 'otpTitle')}</Text>
            <Text style={[styles.otpSubtitle, { color: colors.textSecondary }]}>
              {tr('login', 'otpSubtitle').replace('{target}', '')}
            </Text>
            <View style={[styles.identifierChip, { backgroundColor: isDark ? colors.surfaceSecondary : '#F0F0F2' }]}>
              <Text style={[styles.identifierText, { color: colors.text }]}>{currentIdentifier}</Text>
            </View>
          </View>

          <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
            {otpDigits.map((digit, index) => {
              const boxStyle = getOtpBoxStyle(index);
              return (
                <TextInput
                  key={index}
                  ref={(ref) => { otpInputRefs.current[index] = ref; }}
                  style={[
                    styles.otpBox,
                    {
                      borderColor: boxStyle.borderColor,
                      backgroundColor: boxStyle.backgroundColor,
                      color: colors.text,
                    },
                    focusedOtpIndex === index && !otpSuccess && !error && {
                      borderColor: colors.text,
                      borderWidth: 2,
                    },
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
              );
            })}
          </Animated.View>

          {isVerifying && (
            <View style={styles.verifyingRow}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
              <Text style={[styles.verifyingText, { color: colors.textSecondary }]}>{tr('login', 'verifying')}</Text>
            </View>
          )}

          {error && !isVerifying ? (
            <Text style={[styles.otpError, { color: colors.danger }]}>{error}</Text>
          ) : null}

          <TouchableOpacity
            onPress={handleResendCode}
            disabled={resendTimer > 0 || isLoading || isVerifying}
            activeOpacity={0.6}
            style={styles.resendBtn}
          >
            <Text style={[
              styles.resendText,
              { color: resendTimer > 0 || isVerifying ? colors.textTertiary : colors.primary },
            ]}>
              {resendTimer > 0
                ? tr('login', 'resendIn').replace('{sec}', resendTimer.toString())
                : tr('login', 'resendCode')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {successAnim && (
        <View style={[styles.successOverlay, { backgroundColor: colors.background + 'F2' }]}>
          <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
            <Check size={36} color="#FFFFFF" strokeWidth={3} />
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
          <TouchableOpacity activeOpacity={1} style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalTop}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Davlatni tanlang</Text>
              <TouchableOpacity
                style={[styles.modalClose, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => {
                  setCountryPickerVisible(false);
                  setCountrySearch('');
                }}
              >
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { backgroundColor: isDark ? colors.surfaceSecondary : '#F0F0F2' }]}>
              <Search size={16} color={colors.textTertiary} />
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
                  <X size={14} color={colors.textTertiary} />
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
  inputScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    paddingBottom: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoWrap: {
    marginBottom: 16,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    marginBottom: 20,
    opacity: 0.5,
  },
  welcomeTitle: {
    fontSize: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeDesc: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  featuresSection: {
    marginBottom: 32,
    marginHorizontal: -28,
    paddingHorizontal: 4,
  },
  featureSlide: {
    paddingHorizontal: 28,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 14,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotActive: {
    width: 18,
    borderRadius: 2.5,
  },
  formSection: {
    paddingBottom: 8,
  },
  segmentControl: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  segmentTextActive: {
    fontWeight: '600' as const,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 10,
    borderWidth: 1,
    gap: 4,
  },
  flagText: {
    fontSize: 18,
  },
  dialText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  phoneInput: {
    flex: 1,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  emailInput: {
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 10,
    marginLeft: 2,
  },
  sendBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 16,
  },
  termsText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  otpContainer: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  otpHeader: {
    alignItems: 'center',
    marginBottom: 36,
  },
  otpIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  otpTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  otpSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
  identifierChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  identifierText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
  },
  otpBox: {
    width: (SCREEN_WIDTH - 56 - 40) / 6,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700' as const,
  },
  verifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  verifyingText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  otpError: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  resendBtn: {
    alignSelf: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 10,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  modalClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 10,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  countryItemFlag: {
    fontSize: 26,
    marginRight: 12,
  },
  countryItemInfo: {
    flex: 1,
  },
  countryItemName: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  countryItemCode: {
    fontSize: 12,
    marginTop: 1,
  },
  countryItemDial: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
