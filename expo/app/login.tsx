import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft, 
  ChevronDown, 
  Check, 
  Search, 
  X, 
  Phone, 
  Mail, 
  Lock, 
  Leaf, 
  Sparkles, 
  TrendingUp, 
  Camera, 
  Heart, 
  Shield,
  ArrowRight
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { COUNTRY_CODES, DEFAULT_COUNTRY, CountryCode } from '@/constants/countries';

type LoginMethod = 'email' | 'phone';
type Step = 'input' | 'otp';

const OTP_LENGTH = 6;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80',
];

const FEATURES = [
  {
    icon: Camera,
    color: '#22c55e',
    bgColor: '#22c55e15',
    titleUz: 'AI Skaner',
    titleRu: 'AI Сканер',
    titleEn: 'AI Scanner',
  },
  {
    icon: TrendingUp,
    color: '#3b82f6',
    bgColor: '#3b82f615',
    titleUz: 'Statistika',
    titleRu: 'Статистика',
    titleEn: 'Statistics',
  },
  {
    icon: Sparkles,
    color: '#f59e0b',
    bgColor: '#f59e0b15',
    titleUz: 'AI Maslahat',
    titleRu: 'AI Советы',
    titleEn: 'AI Advice',
  },
  {
    icon: Heart,
    color: '#ef4444',
    bgColor: '#ef444415',
    titleUz: "Sog'lom hayot",
    titleRu: 'Здоровая жизнь',
    titleEn: 'Healthy Life',
  },
];

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
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
  const [heroIndex, setHeroIndex] = useState(0);

  const otpInputRefs = useRef<(TextInput | null)[]>([]);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const heroScrollRef = useRef<ScrollView>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const otpFadeAnim = useRef(new Animated.Value(0)).current;
  const otpSlideAnim = useRef(new Animated.Value(30)).current;
  const inputFadeAnim = useRef(new Animated.Value(1)).current;
  const inputSlideAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const featureAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.timing(heroOpacity, { toValue: 1, duration: 800, useNativeDriver: true }).start();

    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(slideUp, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }),
      ]),
      ...featureAnims.map((anim) =>
        Animated.spring(anim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true })
      ),
    ]).start();
  }, [fadeAnim, slideUp, heroOpacity, featureAnims]);

  useEffect(() => {
    if (step !== 'input') return;
    const timer = setInterval(() => {
      setHeroIndex((prev) => {
        const next = (prev + 1) % HERO_IMAGES.length;
        heroScrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => interval && clearInterval(interval);
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
      setStep('otp');
      setResendTimer(60);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setOtpSuccess(false);
      setError('');
      animateToOTP();

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 500);
    } catch (err: any) {
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
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)/(home)');
      }
    } catch (err: any) {
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
      setResendTimer(60);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setOtpSuccess(false);
      setError('');
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      console.error(err);
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

  const getFeatureTitle = useCallback((f: typeof FEATURES[0]) => {
    const lang = getLang();
    if (lang === 'ru') return f.titleRu;
    if (lang === 'en') return f.titleEn;
    return f.titleUz;
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
    if (otpSuccess) return { borderColor: '#22c55e', backgroundColor: '#22c55e10' };
    if (error) return { borderColor: colors.danger, backgroundColor: colors.danger + '08' };
    if (focusedOtpIndex === index) return { borderColor: '#22c55e', backgroundColor: '#22c55e08' };
    if (otpDigits[index]) return { borderColor: colors.border, backgroundColor: colors.surfaceSecondary };
    return { borderColor: colors.border, backgroundColor: colors.surface };
  }, [otpSuccess, error, focusedOtpIndex, otpDigits, colors]);

  const renderInputStep = () => (
    <Animated.View style={{
      flex: 1,
      opacity: inputFadeAnim,
      transform: [{ translateY: inputSlideAnim }],
    }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <Animated.View style={[styles.heroSection, { opacity: heroOpacity }]}>
          <ScrollView
            ref={heroScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
          >
            {HERO_IMAGES.map((uri, i) => (
              <View key={i} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.4 }}>
                <Image
                  source={{ uri }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              </View>
            ))}
          </ScrollView>
          <LinearGradient
            colors={['transparent', isDark ? '#050506' : '#FFFFFF']}
            style={styles.heroGradient}
          />
          <View style={styles.heroOverlay}>
            <View style={styles.heroDots}>
              {HERO_IMAGES.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.heroDot,
                    { backgroundColor: i === heroIndex ? '#22c55e' : 'rgba(255,255,255,0.4)' },
                    i === heroIndex && styles.heroDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
          <SafeAreaView edges={['top']} style={styles.heroTopBar}>
            <View style={styles.logoBadge}>
              <Leaf size={18} color="#FFFFFF" strokeWidth={2.5} />
            </View>
            <Text style={styles.logoLabel}>Oqsil</Text>
          </SafeAreaView>
        </Animated.View>

        <Animated.View style={[styles.contentSection, {
          opacity: fadeAnim,
          transform: [{ translateY: slideUp }],
        }]}>
          <View style={styles.badgeContainer}>
             <Sparkles size={14} color="#22c55e" />
             <Text style={styles.badgeText}>AI Dietolog & Sog'lom hayot</Text>
          </View>
          
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>
             Xush kelibsiz!
          </Text>
          <Text style={[styles.welcomeDesc, { color: colors.textSecondary }]}>
            Sun'iy intellekt yordamida sog'lom turmush tarzini shakllantiring.
          </Text>

          <View style={styles.featuresGrid}>
            {FEATURES.map((feature, i) => {
              const IconComp = feature.icon;
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.featureItem,
                    {
                      opacity: featureAnims[i],
                      transform: [{ translateY: featureAnims[i].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                    },
                  ]}
                >
                  <View style={[styles.featureIconCircle, { backgroundColor: feature.bgColor }]}>
                    <IconComp size={20} color={feature.color} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.featureLabel, { color: colors.text }]} numberOfLines={1}>
                    {getFeatureTitle(feature)}
                  </Text>
                </Animated.View>
              );
            })}
          </View>

          <View style={styles.formSection}>
            <View style={[styles.segmentControl, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  activeTab === 'phone' && [styles.segmentBtnActive, { backgroundColor: isDark ? '#0f172a' : '#FFFFFF' }],
                ]}
                onPress={() => switchTab('phone')}
                activeOpacity={0.7}
              >
                <Phone size={14} color={activeTab === 'phone' ? '#22c55e' : '#64748b'} style={{ marginRight: 6 }} />
                <Text style={[
                  styles.segmentText,
                  { color: activeTab === 'phone' ? colors.text : '#64748b' },
                  activeTab === 'phone' && styles.segmentTextActive,
                ]}>
                  Telefon
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  activeTab === 'email' && [styles.segmentBtnActive, { backgroundColor: isDark ? '#0f172a' : '#FFFFFF' }],
                ]}
                onPress={() => switchTab('email')}
                activeOpacity={0.7}
              >
                <Mail size={14} color={activeTab === 'email' ? '#22c55e' : '#64748b'} style={{ marginRight: 6 }} />
                <Text style={[
                  styles.segmentText,
                  { color: activeTab === 'email' ? colors.text : '#64748b' },
                  activeTab === 'email' && styles.segmentTextActive,
                ]}>
                  Email
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
                        backgroundColor: isDark ? '#0f172a' : '#FFFFFF',
                        borderColor: inputFocused ? '#22c55e' : (isDark ? '#334155' : '#e2e8f0'),
                      },
                    ]}
                    onPress={() => setCountryPickerVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.flagText}>{selectedCountry.flag}</Text>
                    <Text style={[styles.dialText, { color: colors.text }]}>{selectedCountry.dial}</Text>
                    <ChevronDown size={12} color="#64748b" />
                  </TouchableOpacity>
                  <TextInput
                    style={[
                      styles.phoneInput,
                      {
                        backgroundColor: isDark ? '#0f172a' : '#FFFFFF',
                        borderColor: inputFocused ? '#22c55e' : (isDark ? '#334155' : '#e2e8f0'),
                        color: colors.text,
                      },
                      error ? { borderColor: colors.danger } : null,
                    ]}
                    value={phone}
                    onChangeText={(val) => { setPhone(val); setError(''); }}
                    placeholder="90 123 45 67"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                  />
                </View>
              ) : (
                <TextInput
                  style={[
                    styles.emailInput,
                    {
                      backgroundColor: isDark ? '#0f172a' : '#FFFFFF',
                      borderColor: inputFocused ? '#22c55e' : (isDark ? '#334155' : '#e2e8f0'),
                      color: colors.text,
                    },
                    error ? { borderColor: colors.danger } : null,
                  ]}
                  value={email}
                  onChangeText={(val) => { setEmail(val); setError(''); }}
                  placeholder="example@mail.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                />
              )}
            </Animated.View>

            {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!isInputValid || isLoading) && { opacity: 0.6 },
                ]}
                onPress={handleSendCode}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                disabled={!isInputValid || isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#22c55e', '#16a34a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sendBtnGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View style={styles.btnRow}>
                       <Text style={styles.sendBtnText}>Kodni yuborish</Text>
                       <ArrowRight size={18} color="#FFFFFF" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.termsRow}>
              <Shield size={12} color="#64748b" />
              <Text style={[styles.termsText, { color: '#64748b' }]}>
                Xavfsiz va ishonchli kirish
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );

  const renderOTPStep = () => (
    <Animated.View style={{
      flex: 1,
      opacity: otpFadeAnim,
      transform: [{ translateY: otpSlideAnim }],
    }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.otpContainer}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
            onPress={handleGoBack}
            activeOpacity={0.6}
            disabled={isVerifying}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.otpHeader}>
            <View style={[styles.otpIconWrap, { backgroundColor: '#22c55e15' }]}>
              <Lock size={32} color="#22c55e" strokeWidth={2} />
            </View>
            <Text style={[styles.otpTitle, { color: colors.text }]}>Tasdiqlash kodi</Text>
            <Text style={[styles.otpSubtitle, { color: colors.textSecondary }]}>
              Kodni quyidagi manzilga yubordik:
            </Text>
            <View style={[styles.identifierChip, {
              backgroundColor: isDark ? '#1e293b' : '#22c55e08',
              borderColor: '#22c55e20',
            }]}>
              <Text style={[styles.identifierText, { color: '#22c55e' }]}>{currentIdentifier}</Text>
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
                      color: otpSuccess ? '#22c55e' : colors.text,
                    },
                    focusedOtpIndex === index && !otpSuccess && !error && {
                      borderColor: '#22c55e',
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
                  editable={!isVerifying && !otpSuccess}
                />
              );
            })}
          </Animated.View>

          {isVerifying && (
            <View style={styles.verifyingRow}>
              <ActivityIndicator size="small" color="#22c55e" />
              <Text style={[styles.verifyingText, { color: colors.textSecondary }]}>Tekshirilmoqda...</Text>
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
              { color: resendTimer > 0 || isVerifying ? colors.textTertiary : '#22c55e' },
            ]}>
              {resendTimer > 0
                ? `Kodni qayta yuborish (${resendTimer}s)`
                : 'Kodni qayta yuborish'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {successAnim && (
        <View style={[styles.successOverlay, { backgroundColor: colors.background + 'F2' }]}>
          <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
            <Check size={40} color="#FFFFFF" strokeWidth={3} />
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#050506' : '#FFFFFF' }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {step === 'input' ? renderInputStep() : renderOTPStep()}
      </KeyboardAvoidingView>

      <Modal
        visible={countryPickerVisible}
        animationType="slide"
        transparent
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCountryPickerVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.modalSheet, { backgroundColor: isDark ? '#0f172a' : '#FFFFFF' }]}>
            <View style={[styles.modalHandle, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]} />
            <View style={styles.modalTop}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Davlatni tanlang</Text>
              <TouchableOpacity
                style={[styles.modalClose, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                onPress={() => setCountryPickerVisible(false)}
              >
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
              <Search size={16} color="#64748b" />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="Qidirish..."
                placeholderTextColor="#94a3b8"
              />
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={renderCountryItem}
              keyboardShouldPersistTaps="handled"
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
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    height: SCREEN_HEIGHT * 0.4,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.4,
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  heroDots: {
    flexDirection: 'row',
    gap: 8,
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroDotActive: {
    width: 24,
    borderRadius: 4,
  },
  heroTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  contentSection: {
    paddingHorizontal: 24,
    marginTop: -20,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22c55e',
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 8,
  },
  welcomeDesc: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 36,
  },
  featureItem: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 48 - 40) / 4,
  },
  featureIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  featureLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  formSection: {
    paddingBottom: 40,
  },
  segmentControl: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    fontWeight: '700',
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  flagText: {
    fontSize: 20,
  },
  dialText: {
    fontSize: 15,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
    fontSize: 17,
    borderWidth: 1.5,
  },
  emailInput: {
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
    fontSize: 17,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  sendBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  sendBtnGradient: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  termsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  otpContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 10,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  otpHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  otpIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  otpTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  identifierChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  identifierText: {
    fontSize: 15,
    fontWeight: '700',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 24,
  },
  otpBox: {
    width: (SCREEN_WIDTH - 64 - 50) / 6,
    height: 60,
    borderRadius: 16,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '800',
  },
  verifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  verifyingText: {
    fontSize: 15,
    fontWeight: '600',
  },
  otpError: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
  resendBtn: {
    alignSelf: 'center',
    marginTop: 32,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 15,
    fontWeight: '700',
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  countryItemFlag: {
    fontSize: 28,
    marginRight: 16,
  },
  countryItemInfo: {
    flex: 1,
  },
  countryItemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  countryItemCode: {
    fontSize: 13,
    marginTop: 2,
  },
  countryItemDial: {
    fontSize: 16,
    fontWeight: '700',
  },
});