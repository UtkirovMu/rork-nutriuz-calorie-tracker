import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { Language, t, getMonths, getDaysOfWeek, getWeekdaysShort, getDayLabels } from '@/constants/translations';
import { settingsApi } from '@/utils/api';

const LANGUAGE_KEY = 'nutriuz_language';

export const [LanguageProvider, useLanguage] = createContextHook(() => {
  const [language, setLanguage] = useState<Language>('uz');

  const langQuery = useQuery({
    queryKey: ['language'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
      return (stored as Language) || 'uz';
    },
  });

  useEffect(() => {
    if (langQuery.data) {
      setLanguage(langQuery.data);
    }
  }, [langQuery.data]);

  const saveLangMutation = useMutation({
    mutationFn: async (lang: Language) => {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      try {
        await settingsApi.update({ language: lang });
        console.log('[Language] Synced to API:', lang);
      } catch (e) {
        console.log('[Language] API sync failed:', e);
      }
      return lang;
    },
    onSuccess: (data) => {
      setLanguage(data);
    },
  });

  const setLang = useCallback((lang: Language) => {
    saveLangMutation.mutate(lang);
  }, [saveLangMutation]);

  const tr = useCallback((section: string, key: string): string => {
    return t(section, key, language);
  }, [language]);

  const months = useMemo(() => getMonths(language), [language]);
  const daysOfWeek = useMemo(() => getDaysOfWeek(language), [language]);
  const weekdaysShort = useMemo(() => getWeekdaysShort(language), [language]);
  const dayLabels = useMemo(() => getDayLabels(language), [language]);

  return useMemo(() => ({
    language,
    setLang,
    tr,
    months,
    daysOfWeek,
    weekdaysShort,
    dayLabels,
  }), [language, setLang, tr, months, daysOfWeek, weekdaysShort, dayLabels]);
});
