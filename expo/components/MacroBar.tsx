import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
  unit?: string;
}

export default function MacroBar({ label, current, target, color, unit = 'g' }: MacroBarProps) {
  const { colors } = useTheme();
  const widthAnim = useRef(new Animated.Value(0)).current;
  const progress = Math.min(current / Math.max(target, 1), 1);
  const remaining = Math.max(0, target - current);

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [progress, widthAnim]);

  const ds = useMemo(() => StyleSheet.create({
    label: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
      letterSpacing: -0.2,
    },
    separator: {
      color: colors.textTertiary,
      fontSize: 14,
    },
    targetValue: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600' as const,
    },
    track: {
      height: 14, // Thicker bar
      backgroundColor: color + '15', // Lighter background
      borderRadius: 7,
      overflow: 'hidden' as const,
      marginBottom: 6,
    },
    remaining: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 2,
    },
  }), [colors, color]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={ds.label}>{label}</Text>
        </View>
        <View style={styles.valuesRow}>
          <Text style={[styles.currentValue, { color }]}>{Math.round(current)}</Text>
          <Text style={ds.separator}>/</Text>
          <Text style={ds.targetValue}>{target}{unit}</Text>
        </View>
      </View>
      <View style={ds.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              borderRadius: 7, // Round edges of the fill too
              width: widthAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={ds.remaining}>{Math.round(remaining)}{unit} qolgan</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  valuesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  currentValue: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
