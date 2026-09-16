import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface ScrollPickerProps {
  data: number[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  unit?: string;
  label?: string;
  accentColor?: string;
}

export default function ScrollPicker({
  data,
  selectedValue,
  onValueChange,
  unit = '',
  label,
  accentColor,
}: ScrollPickerProps) {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const lastIndex = useRef<number>(-1);
  const isUserScrolling = useRef(false);
  const accent = accentColor || colors.primary;

  const selectedIndex = data.indexOf(selectedValue);

  useEffect(() => {
    if (!isUserScrolling.current && selectedIndex >= 0) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: selectedIndex * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedIndex]);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isUserScrolling.current = false;
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, data.length - 1));

      if (clampedIndex !== lastIndex.current) {
        lastIndex.current = clampedIndex;
        onValueChange(data[clampedIndex]);
        void Haptics.selectionAsync();
      }

      scrollRef.current?.scrollTo({
        y: clampedIndex * ITEM_HEIGHT,
        animated: true,
      });
    },
    [data, onValueChange],
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isUserScrolling.current = true;
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, data.length - 1));

      if (clampedIndex !== lastIndex.current) {
        lastIndex.current = clampedIndex;
        onValueChange(data[clampedIndex]);
        if (Platform.OS !== 'web') {
          void Haptics.selectionAsync();
        }
      }
    },
    [data, onValueChange],
  );

  const paddingVertical = (PICKER_HEIGHT - ITEM_HEIGHT) / 2;

  const ds = useMemo(() => StyleSheet.create({
    wrapper: {
      height: PICKER_HEIGHT,
      overflow: 'hidden' as const,
      borderRadius: 18,
      backgroundColor: colors.surfaceSecondary,
      position: 'relative' as const,
    },
    highlightBar: {
      position: 'absolute' as const,
      top: (PICKER_HEIGHT - ITEM_HEIGHT) / 2,
      left: 5,
      right: 5,
      height: ITEM_HEIGHT,
      backgroundColor: accent + '14',
      borderRadius: 12,
      zIndex: 0,
      borderWidth: 1.5,
      borderColor: accent + '25',
    },
    label: {
      fontSize: 11,
      fontFamily: 'Outfit_700Bold',
      color: accent,
      textTransform: 'uppercase' as const,
      letterSpacing: 1.2,
      marginBottom: 8,
      textAlign: 'center' as const,
    },
    itemText: {
      fontSize: 18,
      fontFamily: 'Outfit_400Regular',
      color: colors.textTertiary,
    },
    itemTextSelected: {
      fontSize: 24,
      fontFamily: 'Outfit_800ExtraBold',
      color: accent,
    },
    unitText: {
      fontSize: 12,
      fontFamily: 'Outfit_700Bold',
      color: accent,
      opacity: 0.6,
      marginLeft: 2,
    },
  }), [colors, accent]);

  return (
    <View style={styles.container}>
      {label ? <Text style={ds.label}>{label}</Text> : null}
      <View style={ds.wrapper}>
        <View style={ds.highlightBar} pointerEvents="none" />
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={{ paddingVertical }}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={handleMomentumEnd}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          nestedScrollEnabled
        >
          {data.map((item, i) => {
            const isSelected = item === selectedValue;
            return (
              <View key={i} style={styles.item}>
                <Text style={[ds.itemText, isSelected && ds.itemTextSelected]}>
                  {item}
                </Text>
                {isSelected && unit ? (
                  <Text style={ds.unitText}>{unit}</Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    flexDirection: 'row',
    gap: 3,
  },
});
