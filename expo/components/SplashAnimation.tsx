import React, { useEffect, useRef, useCallback } from 'react';
import { View, Animated, StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');
const NATIVE = Platform.OS !== 'web';

interface SplashAnimationProps {
  onFinish: () => void;
}

export default function SplashAnimation({ onFinish }: SplashAnimationProps) {
  const containerOpacity = useRef(new Animated.Value(1)).current;

  const letterAnims = useRef(
    'Oqsil'.split('').map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(30),
    }))
  ).current;

  const lineWidth = useRef(new Animated.Value(0)).current;
  const lineOpacity = useRef(new Animated.Value(0)).current;

  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.6)).current;

  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(8)).current;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const handleFinish = useCallback(() => {
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    const letterEntries = letterAnims.map((anim, i) =>
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 220,
          delay: i * 90,
          useNativeDriver: NATIVE,
        }),
        Animated.spring(anim.translateY, {
          toValue: 0,
          tension: 120,
          friction: 12,
          delay: i * 90,
          useNativeDriver: NATIVE,
        }),
      ])
    );

    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(glowOpacity, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: NATIVE,
        }),
        Animated.spring(glowScale, {
          toValue: 1,
          tension: 40,
          friction: 10,
          useNativeDriver: NATIVE,
        }),
      ]),

      Animated.parallel(letterEntries),

      Animated.parallel([
        Animated.timing(lineOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: NATIVE,
        }),
        Animated.spring(lineWidth, {
          toValue: 1,
          tension: 60,
          friction: 12,
          useNativeDriver: NATIVE,
        }),
      ]),

      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: NATIVE,
        }),
        Animated.spring(taglineTranslateY, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: NATIVE,
        }),
      ]),

      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 300,
          useNativeDriver: NATIVE,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: NATIVE,
        }),
      ]),

      Animated.delay(250),

      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: NATIVE,
      }),
    ]);

    animRef.current = animation;
    animation.start(({ finished }) => {
      if (finished) handleFinish();
    });

    return () => {
      animRef.current?.stop();
    };
  }, [handleFinish]);

  const letters = 'Oqsil'.split('');

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} pointerEvents="none">
      <View style={styles.bgGradientTop} />
      <View style={styles.bgGradientBottom} />

      <Animated.View
        style={[
          styles.glowOrb,
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
                i === 0 && styles.firstLetter,
                {
                  opacity: letterAnims[i].opacity,
                  transform: [{ translateY: letterAnims[i].translateY }],
                },
              ]}
            >
              {char}
            </Animated.Text>
          ))}
        </View>

        <View style={styles.lineContainer}>
          <Animated.View
            style={[
              styles.accentLine,
              {
                opacity: lineOpacity,
                transform: [{ scaleX: lineWidth }],
              },
            ]}
          />
        </View>

        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          Sog'lom ovqatlanish yordamchisi
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050506',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgGradientTop: {
    position: 'absolute',
    top: -height * 0.2,
    left: -width * 0.3,
    width: width * 1.6,
    height: height * 0.5,
    borderRadius: height * 0.25,
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  bgGradientBottom: {
    position: 'absolute',
    bottom: -height * 0.15,
    right: -width * 0.3,
    width: width * 1.2,
    height: height * 0.4,
    borderRadius: height * 0.2,
    backgroundColor: 'rgba(16, 185, 129, 0.025)',
  },
  glowOrb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  center: {
    alignItems: 'center',
  },
  letterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  letter: {
    fontSize: 52,
    fontWeight: '300' as const,
    color: '#E8ECE9',
    letterSpacing: 2,
  },
  firstLetter: {
    fontWeight: '600' as const,
    color: '#34D399',
    fontSize: 56,
  },
  lineContainer: {
    marginTop: 14,
    width: 48,
    height: 2,
    overflow: 'hidden',
  },
  accentLine: {
    width: 48,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#34D399',
  },
  tagline: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '400' as const,
    color: 'rgba(232, 236, 233, 0.4)',
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
});
