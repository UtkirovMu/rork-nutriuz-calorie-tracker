import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Linking,
  Dimensions,
} from 'react-native';
import { X, ExternalLink, Sparkles } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const AD_SESSION_KEY = 'nutriuz_ad_session';
const AD_LINK = 'https://nutriuz.app/premium';

export default function AdBanner() {
  const { colors } = useTheme();
  const { tr } = useLanguage();
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const checkAndShow = useCallback(async () => {
    try {
      const sessionShown = await AsyncStorage.getItem(AD_SESSION_KEY);
      if (sessionShown === 'true') {
        console.log('[AdBanner] Already shown this session');
        return;
      }
      await AsyncStorage.setItem(AD_SESSION_KEY, 'true');
      setTimeout(() => {
        setVisible(true);
        Animated.parallel([
          Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
        ]).start();
      }, 800);
    } catch (err) {
      console.error('[AdBanner] Error checking ad state:', err);
    }
  }, [overlayAnim, scaleAnim, slideAnim]);

  useEffect(() => {
    void checkAndShow();
  }, [checkAndShow]);

  const dismiss = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
    });
  }, [overlayAnim, scaleAnim]);

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(AD_LINK).catch((err) => {
      console.error('[AdBanner] Failed to open link:', err);
    });
    dismiss();
  }, [dismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity: overlayAnim },
      ]}
    >
      <TouchableOpacity
        style={styles.overlayTouch}
        activeOpacity={1}
        onPress={dismiss}
      />
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={dismiss}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            testID="ad-close"
          >
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
            <Sparkles size={28} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Oqsil Premium
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {tr('login', 'appDescription')}
          </Text>

          <View style={styles.featuresRow}>
            {['AI Tahlil', 'Cheksiz skan', 'Reklamasiz'].map((feat, i) => (
              <View key={i} style={[styles.featurePill, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.featureText, { color: colors.text }]}>{feat}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.text }]}
            onPress={handlePress}
            activeOpacity={0.8}
            testID="ad-link"
          >
            <Text style={[styles.ctaText, { color: colors.background }]}>
              Batafsil
            </Text>
            <ExternalLink size={16} color={colors.background} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTouch: {
    ...(StyleSheet.absoluteFill as any),
  },
  cardWrapper: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 380,
  },
  card: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    marginTop: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 24,
  },
  featurePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ctaButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
