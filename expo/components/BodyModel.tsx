import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, StyleSheet, ImageSourcePropType } from 'react-native';

export type Gender = 'male' | 'female';

export interface UserBodyStats {
  gender: Gender;
  age: number;        
  heightCm: number;    
  weightKg: number;    
}

export type BodyCategory =
  | 'very_lean'
  | 'lean'
  | 'normal'
  | 'overweight'
  | 'obese';

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function getBodyCategoryBlend(stats: UserBodyStats): {
  from: BodyCategory;
  to: BodyCategory;
  blend: number; 
  bmi: number;
} {
  const bmi = calculateBMI(stats.weightKg, stats.heightCm);

  const points: { category: BodyCategory; bmi: number }[] = [
    { category: 'very_lean', bmi: 16 },
    { category: 'lean', bmi: 20 },
    { category: 'normal', bmi: 23.5 },
    { category: 'overweight', bmi: 28 },
    { category: 'obese', bmi: 35 },
  ];

  const clampedBmi = Math.max(points[0].bmi, Math.min(points[points.length - 1].bmi, bmi));

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (clampedBmi >= a.bmi && clampedBmi <= b.bmi) {
      const blend = (clampedBmi - a.bmi) / (b.bmi - a.bmi);
      return { from: a.category, to: b.category, blend, bmi };
    }
  }

  return { from: 'normal', to: 'normal', blend: 0, bmi };
}

const ASSETS: Record<Gender, Record<BodyCategory, ImageSourcePropType>> = {
  male: {
    very_lean: require('../assets/images/male_very_lean.png'),
    lean: require('../assets/images/male_lean.png'),
    normal: require('../assets/images/male_normal.png'),
    overweight: require('../assets/images/male_overweight.png'),
    obese: require('../assets/images/male_obese.png'),
  },
  female: {
    very_lean: require('../assets/images/female_very_lean.png'),
    lean: require('../assets/images/female_lean.png'),
    normal: require('../assets/images/female_normal.png'),
    overweight: require('../assets/images/female_overweight.png'),
    obese: require('../assets/images/female_obese.png'),
  },
};

interface BodyModelProps {
  stats: UserBodyStats;
  width?: number;
  height?: number;
  animationDurationMs?: number;
}

export const BodyModel: React.FC<BodyModelProps> = ({
  stats,
  width = 220,
  height = 420,
  animationDurationMs = 500,
}) => {
  const { from, to, blend } = useMemo(() => getBodyCategoryBlend(stats), [stats]);

  const fromOpacity = useRef(new Animated.Value(1 - blend)).current;
  const toOpacity = useRef(new Animated.Value(blend)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fromOpacity, {
        toValue: 1 - blend,
        duration: animationDurationMs,
        useNativeDriver: true,
      }),
      Animated.timing(toOpacity, {
        toValue: blend,
        duration: animationDurationMs,
        useNativeDriver: true,
      }),
    ]).start();
  }, [blend, animationDurationMs, fromOpacity, toOpacity]);

  const fromSource = ASSETS[stats.gender][from];
  const toSource = ASSETS[stats.gender][to];

  return (
    <View style={[styles.container, { width, height }]}>
      <Animated.Image
        source={fromSource as any}
        style={[styles.image, { width, height, opacity: fromOpacity }]}
        resizeMode="contain"
      />
      <Animated.Image
        source={toSource as any}
        style={[styles.image, { width, height, opacity: toOpacity }]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    position: 'absolute',
  },
});

export default BodyModel;
