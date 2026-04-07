import { useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import Colors, { ThemeColors } from '@/constants/colors';
import { settingsApi } from '@/utils/api';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'nutriuz_theme_mode';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  const themeQuery = useQuery({
    queryKey: ['themeMode'],
    queryFn: async () => {
      try {
        const apiSettings = await settingsApi.get();
        if (apiSettings?.theme) {
          const mode = apiSettings.theme as ThemeMode;
          await AsyncStorage.setItem(THEME_KEY, mode);
          return mode;
        }
      } catch (e) {
        console.log('[Theme] API fetch failed, using local:', e);
      }
      const stored = await AsyncStorage.getItem(THEME_KEY);
      return (stored as ThemeMode) || 'system';
    },
  });

  useEffect(() => {
    if (themeQuery.data) {
      setThemeMode(themeQuery.data);
    }
  }, [themeQuery.data]);

  const saveThemeMutation = useMutation({
    mutationFn: async (mode: ThemeMode) => {
      await AsyncStorage.setItem(THEME_KEY, mode);
      try {
        await settingsApi.update({ theme: mode });
        console.log('[Theme] Synced to API:', mode);
      } catch (e) {
        console.log('[Theme] API sync failed:', e);
      }
      return mode;
    },
    onSuccess: (data) => {
      setThemeMode(data);
    },
  });

  const setMode = useCallback((mode: ThemeMode) => {
    saveThemeMutation.mutate(mode);
  }, [saveThemeMutation]);

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemScheme]);

  const colors: ThemeColors = useMemo(() => {
    return isDark ? Colors.dark : Colors.light;
  }, [isDark]);

  return useMemo(() => ({
    themeMode,
    isDark,
    colors,
    setMode,
  }), [themeMode, isDark, colors, setMode]);
});
