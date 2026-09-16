import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Animated, StyleSheet, Dimensions, Platform, Text, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');
const NATIVE = Platform.OS !== 'web';

interface SplashAnimationProps {
  onFinish: () => void;
}

export default function SplashAnimation({ onFinish }: SplashAnimationProps) {
  const { isDark, colors } = useTheme();

  // Container fade out
  const containerOpacity = useRef(new Animated.Value(1)).current;

  // Staggered intro animations
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  const taglineTranslateY = useRef(new Animated.Value(15)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  // Background glow
  const glowScale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const handleFinish = useCallback(() => {
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    const animation = Animated.sequence([
      // 1. Enter animations
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 1, duration: 800, useNativeDriver: NATIVE }),
        Animated.spring(glowScale, { toValue: 1.1, tension: 20, friction: 10, useNativeDriver: NATIVE }),
        
        Animated.stagger(150, [
          // Logo appears
          Animated.parallel([
            Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: NATIVE }),
            Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: NATIVE }),
          ]),
          // Brand text appears
          Animated.parallel([
            Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: NATIVE }),
            Animated.spring(textTranslateY, { toValue: 0, tension: 50, friction: 9, useNativeDriver: NATIVE }),
          ]),
          // Tagline appears
          Animated.parallel([
            Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: NATIVE }),
            Animated.spring(taglineTranslateY, { toValue: 0, tension: 40, friction: 9, useNativeDriver: NATIVE }),
          ]),
        ]),
      ]),

      // 2. Wait for a moment to show the beautiful screen
      Animated.delay(1200),

      // 3. Exit animation
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: NATIVE,
        }),
        Animated.timing(glowScale, {
          toValue: 2, // Expand before disappearing
          duration: 500,
          useNativeDriver: NATIVE,
        }),
        Animated.timing(logoScale, {
          toValue: 0.9,
          duration: 400,
          useNativeDriver: NATIVE,
        }),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished) handleFinish();
    });

    return () => animation.stop();
  }, [handleFinish, glowOpacity, glowScale, logoOpacity, logoScale, textOpacity, textTranslateY, taglineOpacity, taglineTranslateY, containerOpacity]);

  const ds = useMemo(() => StyleSheet.create({
    container: {
      ...(StyleSheet.absoluteFill as any),
      zIndex: 9999,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#050506' : '#F8FAFC',
    },
    glowOrb: {
      position: 'absolute',
      width: width * 0.9,
      height: width * 0.9,
      borderRadius: width * 0.45,
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)',
    },
    logoContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      shadowColor: '#22c55e',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.4)',
    },
    brandText: {
      fontSize: 48,
      fontFamily: 'Outfit_800ExtraBold',
      color: isDark ? '#FFFFFF' : '#0F172A',
      letterSpacing: -1,
      marginBottom: 8,
    },
    brandHighlight: {
      color: '#22c55e',
    },
    tagline: {
      fontSize: 22,
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      color: isDark ? '#94A3B8' : '#64748B',
      letterSpacing: 0,
    },
  }), [isDark]);

  return (
    <Animated.View 
      style={[ds.container, { opacity: containerOpacity }]} 
      pointerEvents="none"
    >
      <Animated.View
        style={[
          ds.glowOrb,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      <Animated.View style={{ alignItems: 'center' }}>
        <Animated.View
          style={[
            ds.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image 
            source={{ uri: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Red%20apple/3D/red_apple_3d.png' }}
            style={{ width: 64, height: 64 }}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text
          style={[
            ds.brandText,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={ds.brandHighlight}>O</Text>qsil
        </Animated.Text>

        <Animated.Text
          style={[
            ds.tagline,
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