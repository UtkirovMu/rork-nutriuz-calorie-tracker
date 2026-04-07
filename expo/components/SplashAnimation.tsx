import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Animated, StyleSheet, Dimensions, Platform, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

const { width, height } = Dimensions.get('window');
const NATIVE = Platform.OS !== 'web';

interface SplashAnimationProps {
  onFinish: () => void;
}

export default function SplashAnimation({ onFinish }: SplashAnimationProps) {
  const { isDark } = useTheme();
  const containerOpacity = useRef(new Animated.Value(1)).current;

  // Har bir harf uchun alohida animatsiya
  const letters = 'Oqsil'.split('');
  const letterAnims = useRef(
    letters.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(40),
      scale: new Animated.Value(0.5),
    }))
  ).current;

  const lineWidth = useRef(new Animated.Value(0)).current;
  const lineOpacity = useRef(new Animated.Value(0)).current;

  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.4)).current;

  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(15)).current;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const handleFinish = useCallback(() => {
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    // Harflarning ketma-ket chiqishi
    const letterEntries = letterAnims.map((anim, i) =>
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 300,
          delay: i * 100,
          useNativeDriver: NATIVE,
        }),
        Animated.spring(anim.translateY, {
          toValue: 0,
          tension: 100,
          friction: 8,
          delay: i * 100,
          useNativeDriver: NATIVE,
        }),
        Animated.spring(anim.scale, {
          toValue: 1,
          tension: 100,
          friction: 7,
          delay: i * 100,
          useNativeDriver: NATIVE,
        }),
      ])
    );

    const animation = Animated.sequence([
      // 1. Orqa fondagi "Aura" (Glow) chiqishi
      Animated.parallel([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: NATIVE,
        }),
        Animated.spring(glowScale, {
          toValue: 1.2,
          tension: 20,
          friction: 10,
          useNativeDriver: NATIVE,
        }),
      ]),

      // 2. Harflarning animatsiyasi
      Animated.parallel(letterEntries),

      // 3. Chiziq va Tagline
      Animated.parallel([
        Animated.timing(lineOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: NATIVE,
        }),
        Animated.spring(lineWidth, {
          toValue: 1,
          tension: 50,
          friction: 10,
          useNativeDriver: NATIVE,
        }),
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: NATIVE,
        }),
        Animated.spring(taglineTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 10,
          useNativeDriver: NATIVE,
        }),
      ]),

      // 4. Yakuniy pulsatsiya va g'oyib bo'lish
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: NATIVE,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 600,
          useNativeDriver: NATIVE,
        }),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished) handleFinish();
    });

    return () => animation.stop();
  }, [handleFinish]);

  const themedStyles = useMemo(() => ({
    container: {
      backgroundColor: isDark ? '#050506' : '#FFFFFF',
    },
    glowOrb: {
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.08)',
    },
    letter: {
      color: isDark ? '#F8FAFC' : '#0F172A',
    },
    brandLetter: {
      color: '#22c55e', // Oqsil Brand Green
    },
    accentLine: {
      backgroundColor: '#22c55e',
    },
    tagline: {
      color: isDark ? '#64748B' : '#94A3B8',
    },
  }), [isDark]);

  return (
    <Animated.View 
      style={[styles.container, themedStyles.container, { opacity: containerOpacity }]} 
      pointerEvents="none"
    >
      {/* Orqa fondagi sog'lom muhit aurasi */}
      <Animated.View
        style={[
          styles.glowOrb,
          themedStyles.glowOrb,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      <Animated.View style={[styles.center, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.letterRow}>
          {letters.map((char, i) => (
            <Animated.Text
              key={i}
              style={[
                styles.letter,
                themedStyles.letter,
                i === 0 && themedStyles.brandLetter, // "O" harfi brend rangida
                {
                  opacity: letterAnims[i].opacity,
                  transform: [
                    { translateY: letterAnims[i].translateY },
                    { scale: letterAnims[i].scale }
                  ],
                },
              ]}
            >
              {char}
            </Animated.Text>
          ))}
        </View>

        {/* Dekorativ chiziq */}
        <View style={styles.lineContainer}>
          <Animated.View
            style={[
              styles.accentLine,
              themedStyles.accentLine,
              {
                opacity: lineOpacity,
                transform: [{ scaleX: lineWidth }],
              },
            ]}
          />
        </View>

        {/* Tagline */}
        <Animated.Text
          style={[
            styles.tagline,
            themedStyles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          AI Dietolog & Sog'lom hayot
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowOrb: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
  },
  center: {
    alignItems: 'center',
  },
  letterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  letter: {
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
  },
  lineContainer: {
    marginTop: 10,
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  accentLine: {
    width: '100%',
    height: '100%',
  },
  tagline: {
    marginTop: 20,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});