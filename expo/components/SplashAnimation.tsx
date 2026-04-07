import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

const NATIVE_DRIVER = Platform.OS !== 'web';

interface SplashAnimationProps {
  onFinish: () => void;
}

export default function SplashAnimation({ onFinish }: SplashAnimationProps) {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(12)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const dotOpacity1 = useRef(new Animated.Value(0)).current;
  const dotOpacity2 = useRef(new Animated.Value(0)).current;
  const dotOpacity3 = useRef(new Animated.Value(0)).current;
  const dotScale1 = useRef(new Animated.Value(0)).current;
  const dotScale2 = useRef(new Animated.Value(0)).current;
  const dotScale3 = useRef(new Animated.Value(0)).current;
  const shimmerTranslate = useRef(new Animated.Value(-width)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const handleFinish = useCallback(() => {
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]),

      Animated.parallel([
        Animated.timing(ringScale, {
          toValue: 1.8,
          duration: 700,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 700,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]),

      Animated.stagger(100, [
        Animated.parallel([
          Animated.spring(dotScale1, { toValue: 1, tension: 100, friction: 6, useNativeDriver: NATIVE_DRIVER }),
          Animated.timing(dotOpacity1, { toValue: 1, duration: 180, useNativeDriver: NATIVE_DRIVER }),
        ]),
        Animated.parallel([
          Animated.spring(dotScale2, { toValue: 1, tension: 100, friction: 6, useNativeDriver: NATIVE_DRIVER }),
          Animated.timing(dotOpacity2, { toValue: 1, duration: 180, useNativeDriver: NATIVE_DRIVER }),
        ]),
        Animated.parallel([
          Animated.spring(dotScale3, { toValue: 1, tension: 100, friction: 6, useNativeDriver: NATIVE_DRIVER }),
          Animated.timing(dotOpacity3, { toValue: 1, duration: 180, useNativeDriver: NATIVE_DRIVER }),
        ]),
      ]),

      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.spring(subtitleTranslateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]),

      Animated.timing(shimmerTranslate, {
        toValue: width,
        duration: 500,
        useNativeDriver: NATIVE_DRIVER,
      }),

      Animated.delay(350),

      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(logoScale, {
          toValue: 1.15,
          duration: 350,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]),
    ]);

    animationRef.current = animation;
    animation.start(({ finished }) => {
      if (finished) {
        handleFinish();
      }
    });

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [handleFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} pointerEvents="none">
      <View style={styles.bgPattern}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.bgCircle,
              {
                width: 200 + i * 120,
                height: 200 + i * 120,
                borderRadius: 100 + i * 60,
                opacity: 0.03 - i * 0.004,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.ringContainer,
            {
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]}
        >
          <View style={styles.ring} />
        </Animated.View>

        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            },
          ]}
        >
          <View style={styles.iconWrapper}>
            <View style={styles.iconInner}>
              <Text style={styles.iconLetter}>O</Text>
            </View>
          </View>

          <View style={styles.textRow}>
            <Text style={styles.logoText}>Oqsil</Text>
            <Animated.View
              style={[
                styles.shimmerOverlay,
                {
                  transform: [{ translateX: shimmerTranslate }, { skewX: '-20deg' }],
                },
              ]}
            />
          </View>
        </Animated.View>

        <View style={styles.dotsRow}>
          <Animated.View
            style={[
              styles.dot,
              styles.dot1,
              { opacity: dotOpacity1, transform: [{ scale: dotScale1 }] },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              styles.dot2,
              { opacity: dotOpacity2, transform: [{ scale: dotScale2 }] },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              styles.dot3,
              { opacity: dotOpacity3, transform: [{ scale: dotScale3 }] },
            ]}
          />
        </View>

        <Animated.View
          style={[
            styles.subtitleContainer,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            },
          ]}
        >
          <Text style={styles.subtitleText}>Sog'lom ovqatlanish yordamchisi</Text>
        </Animated.View>
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.bottomLine} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0C',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgPattern: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#2ECB96',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    position: 'absolute',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#2ECB96',
  },
  logoContainer: {
    alignItems: 'center',
  },
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: '#111113',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(46, 203, 150, 0.15)',
    shadowColor: '#2ECB96',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2ECB96',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconLetter: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#0A0A0C',
    letterSpacing: -1,
  },
  textRow: {
    overflow: 'hidden',
    position: 'relative' as const,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '700' as const,
    color: '#F5F5F7',
    letterSpacing: -1.5,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dot1: {
    backgroundColor: '#2ECB96',
  },
  dot2: {
    backgroundColor: '#25B882',
  },
  dot3: {
    backgroundColor: '#1A9E6E',
  },
  subtitleContainer: {
    marginTop: 16,
  },
  subtitleText: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: 'rgba(245, 245, 247, 0.5)',
    letterSpacing: 0.3,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  bottomLine: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(46, 203, 150, 0.2)',
  },
});
