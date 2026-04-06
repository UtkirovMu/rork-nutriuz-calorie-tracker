import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';

interface CalorieRingProps {
  consumed: number;
  target: number;
  size?: number;
}

export default function CalorieRing({ consumed, target, size = 220 }: CalorieRingProps) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const remaining = Math.max(0, target - consumed);
  const progress = Math.min(consumed / Math.max(target, 1), 1);
  const overTarget = consumed > target;

  const strokeWidth = 14;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const innerStrokeWidth = 6;
  const innerRadius = radius - 18;
  const innerCircumference = 2 * Math.PI * innerRadius;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  const ringColor = overTarget ? colors.danger : colors.primary;
  const bgRingColor = overTarget ? colors.danger + '15' : colors.borderLight;

  const ds = useMemo(() => StyleSheet.create({
    remainingNumber: {
      fontSize: 48,
      fontWeight: '800' as const,
      color: overTarget ? colors.danger : colors.text,
      letterSpacing: -2,
    },
    remainingLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500' as const,
      marginTop: 2,
    },
    progressPill: {
      marginTop: 10,
      backgroundColor: overTarget ? colors.danger + '15' : colors.primaryLight,
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 14,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
    },
    progressPillText: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: overTarget ? colors.danger : colors.primary,
    },
  }), [colors, overTarget]);

  return (
    <Animated.View
      style={[
        styles.container,
        { width: size, height: size, opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgRingColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          stroke={colors.borderLight}
          strokeWidth={innerStrokeWidth}
          fill="none"
          opacity={0.5}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          stroke={ringColor}
          strokeWidth={innerStrokeWidth}
          fill="none"
          strokeDasharray={`${innerCircumference}`}
          strokeDashoffset={innerCircumference * (1 - progress)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          opacity={0.3}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.centerContent}>
        <Text style={ds.remainingNumber}>
          {overTarget ? '+' : ''}{overTarget ? Math.round(consumed - target) : Math.round(remaining)}
        </Text>
        <Text style={ds.remainingLabel}>
          {overTarget ? 'ortiqcha kkal' : 'qolgan kkal'}
        </Text>
        <View style={ds.progressPill}>
          <Text style={ds.progressPillText}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute' as const,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
