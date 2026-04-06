import React, { useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { MealEntry } from '@/types';

interface MealCardProps {
  entry: MealEntry;
  onRemove: (id: string) => void;
}

export default function MealCard({ entry, onRemove }: MealCardProps) {
  const { colors } = useTheme();
  const { foodItem } = entry;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const displayName = foodItem.nameUz || foodItem.name;

  const ds = useMemo(() => StyleSheet.create({
    cardInner: {
      flexDirection: 'row' as const,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      alignItems: 'center' as const,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    caloriesBadge: {
      backgroundColor: colors.caloriesLight,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 8,
      alignItems: 'center' as const,
      minWidth: 56,
    },
    caloriesValue: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.calories,
    },
    caloriesUnit: {
      fontSize: 10,
      fontWeight: '500' as const,
      color: colors.calories,
      marginTop: 1,
    },
    name: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    nameSecondary: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    macroText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    portionText: {
      fontSize: 11,
      color: colors.textTertiary,
      fontWeight: '500' as const,
    },
  }), [colors]);

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={ds.cardInner}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.leftSection}>
          <View style={ds.caloriesBadge}>
            <Text style={ds.caloriesValue}>{Math.round(foodItem.calories)}</Text>
            <Text style={ds.caloriesUnit}>kkal</Text>
          </View>
        </View>
        <View style={styles.content}>
          <Text style={ds.name} numberOfLines={1}>{displayName}</Text>
          {foodItem.nameUz && foodItem.nameUz !== foodItem.name ? (
            <Text style={ds.nameSecondary} numberOfLines={1}>{foodItem.name}</Text>
          ) : null}
          <View style={styles.macroRow}>
            <View style={[styles.macroPill, { backgroundColor: colors.proteinLight }]}>
              <View style={[styles.macroDot, { backgroundColor: colors.protein }]} />
              <Text style={ds.macroText}>{Math.round(foodItem.protein)}g</Text>
            </View>
            <View style={[styles.macroPill, { backgroundColor: colors.carbsLight }]}>
              <View style={[styles.macroDot, { backgroundColor: colors.carbs }]} />
              <Text style={ds.macroText}>{Math.round(foodItem.carbs)}g</Text>
            </View>
            <View style={[styles.macroPill, { backgroundColor: colors.fatsLight }]}>
              <View style={[styles.macroDot, { backgroundColor: colors.fats }]} />
              <Text style={ds.macroText}>{Math.round(foodItem.fats)}g</Text>
            </View>
            <Text style={ds.portionText}>{foodItem.portionSize}{foodItem.portionUnit}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(entry.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          testID={`remove-meal-${entry.id}`}
        >
          <Trash2 size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
  },
  leftSection: {
    marginRight: 12,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  macroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  macroDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  removeButton: {
    padding: 8,
    marginLeft: 4,
  },
});
