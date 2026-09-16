import React, { useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
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
      borderRadius: 28, // Even more rounded
      padding: 18, 
      alignItems: 'center' as const,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 1, 
      shadowRadius: 20,
      elevation: 6,
    },
    emojiContainer: {
      width: 50,
      height: 50,
      borderRadius: 16,
      backgroundColor: colors.surfaceSecondary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginRight: 14,
    },
    emojiImage: {
      width: 32,
      height: 32,
    },
    caloriesBadge: {
      backgroundColor: colors.caloriesLight,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: 'center' as const,
      minWidth: 60,
    },
    caloriesValue: {
      fontSize: 18,
      fontWeight: '800' as const,
      color: colors.calories,
    },
    caloriesUnit: {
      fontSize: 10,
      fontFamily: 'Outfit_500Medium',
      color: colors.calories,
      marginTop: 1,
    },
    name: {
      fontSize: 17,
      fontWeight: '800' as const,
      color: colors.text,
      letterSpacing: -0.2,
    },
    nameSecondary: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: colors.textTertiary,
    },
    macroText: {
      fontSize: 11,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.textSecondary,
    },
    portionText: {
      fontSize: 11,
      color: colors.textTertiary,
      fontFamily: 'Outfit_500Medium',
    },
  }), [colors]);

  const getEmojiUrl = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('apple')) return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Red%20apple/3D/red_apple_3d.png';
    if (n.includes('bread')) return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Bread/3D/bread_3d.png';
    if (n.includes('chicken')) return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Poultry%20leg/3D/poultry_leg_3d.png';
    if (n.includes('salad')) return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Green%20salad/3D/green_salad_3d.png';
    if (n.includes('egg')) return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Egg/3D/egg_3d.png';
    if (n.includes('rice')) return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Cooked%20rice/3D/cooked_rice_3d.png';
    if (n.includes('meat') || n.includes('beef')) return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Cut%20of%20meat/3D/cut_of_meat_3d.png';
    if (n.includes('milk')) return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Glass%20of%20milk/3D/glass_of_milk_3d.png';
    if (n.includes('banana')) return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Banana/3D/banana_3d.png';
    if (n.includes('fish')) return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fish/3D/fish_3d.png';
    return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Pot%20of%20food/3D/pot_of_food_3d.png';
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={ds.cardInner}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={ds.emojiContainer}>
          <Image source={{ uri: getEmojiUrl(foodItem.name) }} style={ds.emojiImage} />
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
        <View style={styles.rightSection}>
          <Text style={ds.caloriesValue}>{Math.round(foodItem.calories)}</Text>
          <Text style={ds.caloriesUnit}>kkal</Text>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(entry.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          testID={`remove-meal-${entry.id}`}
        >
          <Trash2 size={18} color={colors.danger} opacity={0.6} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: 8,
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
