import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { Sun, Moon, Smartphone, Trash2, Info, Shield, ChevronRight, Bell, BellOff, Utensils, Droplets, BarChart3, Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemeMode } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  loadNotificationSettings,
  saveNotificationSettings,
  scheduleMealReminders,
  registerForPushNotificationsAsync,
  sendLocalNotification,
} from '@/utils/notifications';

export default function SettingsScreen() {
  const { colors, themeMode, setMode } = useTheme();
  const { profile } = useUser();
  const { tr } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => {
    loadNotificationSettings().then(setNotifSettings);
  }, []);

  const updateNotifSetting = useCallback(async (key: keyof NotificationSettings, value: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (key === 'enabled' && value && Platform.OS !== 'web') {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        Alert.alert(tr('notifications', 'permissionRequired'), tr('notifications', 'permissionMsg'));
        return;
      }
    }

    const updated = { ...notifSettings, [key]: value };
    setNotifSettings(updated);
    await saveNotificationSettings(updated);
    await scheduleMealReminders(updated);
    console.log('[Settings] Notification setting updated:', key, value);
  }, [notifSettings, tr]);

  const handleTestNotification = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === 'web') {
      Alert.alert(tr('notifications', 'testTitle'), tr('notifications', 'testBody'));
      return;
    }
    await sendLocalNotification(tr('notifications', 'testTitle'), tr('notifications', 'testBody'));
    Alert.alert(tr('common', 'done'), tr('notifications', 'testSent'));
  }, [tr]);

  const handleThemeChange = useCallback((mode: ThemeMode) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(mode);
  }, [setMode]);

  const handleClearData = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      tr('data', 'clearData'),
      tr('data', 'clearDataMsg'),
      [
        { text: tr('common', 'cancel'), style: 'cancel' },
        {
          text: tr('common', 'delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'nutriuz_meals',
                'nutriuz_weight_history',
                'nutriuz_progress_photos',
                'nutriuz_streak',
              ]);
              Alert.alert(tr('common', 'done'), tr('data', 'dataCleared'));
            } catch (e) {
              console.log('Clear data error:', e);
            }
          },
        },
      ]
    );
  }, [tr]);

  const handleResetAll = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      tr('data', 'resetAll'),
      tr('data', 'resetAllMsg'),
      [
        { text: tr('common', 'cancel'), style: 'cancel' },
        {
          text: tr('data', 'deleteAll'),
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert(tr('common', 'done'), tr('data', 'allDataCleared'));
            } catch (e) {
              console.log('Reset all error:', e);
            }
          },
        },
      ]
    );
  }, [tr]);

  const themeOptions: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
    { mode: 'light', label: tr('theme', 'light'), icon: Sun },
    { mode: 'dark', label: tr('theme', 'dark'), icon: Moon },
    { mode: 'system', label: tr('theme', 'system'), icon: Smartphone },
  ];

  const ds = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      marginHorizontal: 20,
      marginBottom: 16,
      overflow: 'hidden' as const,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      paddingHorizontal: 20,
      marginBottom: 8,
      marginTop: 20,
    },
    themeRow: {
      flexDirection: 'row' as const,
      gap: 10,
      padding: 16,
    },
    themeOption: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.surfaceSecondary,
      gap: 6,
    },
    themeOptionActive: {
      backgroundColor: colors.primaryLight,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    themeOptionText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    themeOptionTextActive: { color: colors.primary },
    settingItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 14,
    },
    settingIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    settingLabel: { fontSize: 16, fontWeight: '500' as const, color: colors.text, flex: 1 },
    settingValue: { fontSize: 14, color: colors.textSecondary },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderLight, marginLeft: 66 },
    dangerItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 14,
    },
    dangerText: { fontSize: 16, fontWeight: '500' as const, color: colors.danger, flex: 1 },
    versionText: {
      fontSize: 13,
      color: colors.textTertiary,
      textAlign: 'center' as const,
      marginTop: 20,
      marginBottom: 40,
    },
  }), [colors]);

  return (
    <View style={ds.screen}>
      <Stack.Screen options={{ title: tr('settings', 'title'), headerBackTitle: tr('nav', 'back') }} />
      <Animated.ScrollView style={{ opacity: fadeAnim }} showsVerticalScrollIndicator={false}>
        <Text style={ds.sectionTitle}>{tr('theme', 'appearance')}</Text>
        <View style={ds.section}>
          <View style={ds.themeRow}>
            {themeOptions.map(opt => {
              const isActive = themeMode === opt.mode;
              const IconComp = opt.icon;
              return (
                <TouchableOpacity
                  key={opt.mode}
                  style={[ds.themeOption, isActive && ds.themeOptionActive]}
                  onPress={() => handleThemeChange(opt.mode)}
                  activeOpacity={0.7}
                  testID={`settings-theme-${opt.mode}`}
                >
                  <IconComp size={20} color={isActive ? colors.primary : colors.textSecondary} />
                  <Text style={[ds.themeOptionText, isActive && ds.themeOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={ds.sectionTitle}>{tr('notifications', 'title')}</Text>
        <View style={ds.section}>
          <View style={ds.settingItem}>
            <View style={[ds.settingIconWrap, { backgroundColor: notifSettings.enabled ? colors.primaryLight : colors.surfaceSecondary }]}>
              {notifSettings.enabled ? <Bell size={18} color={colors.primary} /> : <BellOff size={18} color={colors.textTertiary} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ds.settingLabel}>{tr('notifications', 'enabled')}</Text>
            </View>
            <Switch
              value={notifSettings.enabled}
              onValueChange={(v) => { void updateNotifSetting('enabled', v); }}
              trackColor={{ false: colors.borderLight, true: colors.primary + '60' }}
              thumbColor={notifSettings.enabled ? colors.primary : colors.textTertiary}
            />
          </View>

          {notifSettings.enabled && (
            <>
              <View style={ds.divider} />
              <View style={ds.settingItem}>
                <View style={[ds.settingIconWrap, { backgroundColor: colors.caloriesLight }]}>
                  <Utensils size={18} color={colors.calories} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ds.settingLabel}>{tr('notifications', 'mealReminders')}</Text>
                  <Text style={[ds.settingValue, { fontSize: 12, marginTop: 2 }]}>{tr('notifications', 'mealRemindersDesc')}</Text>
                </View>
                <Switch
                  value={notifSettings.mealReminders}
                  onValueChange={(v) => { void updateNotifSetting('mealReminders', v); }}
                  trackColor={{ false: colors.borderLight, true: colors.calories + '60' }}
                  thumbColor={notifSettings.mealReminders ? colors.calories : colors.textTertiary}
                />
              </View>
              <View style={ds.divider} />
              <View style={ds.settingItem}>
                <View style={[ds.settingIconWrap, { backgroundColor: colors.fatsLight }]}>
                  <Droplets size={18} color={colors.fats} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ds.settingLabel}>{tr('notifications', 'waterReminders')}</Text>
                  <Text style={[ds.settingValue, { fontSize: 12, marginTop: 2 }]}>{tr('notifications', 'waterRemindersDesc')}</Text>
                </View>
                <Switch
                  value={notifSettings.waterReminders}
                  onValueChange={(v) => { void updateNotifSetting('waterReminders', v); }}
                  trackColor={{ false: colors.borderLight, true: colors.fats + '60' }}
                  thumbColor={notifSettings.waterReminders ? colors.fats : colors.textTertiary}
                />
              </View>
              <View style={ds.divider} />
              <View style={ds.settingItem}>
                <View style={[ds.settingIconWrap, { backgroundColor: colors.carbsLight }]}>
                  <BarChart3 size={18} color={colors.carbs} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ds.settingLabel}>{tr('notifications', 'dailySummary')}</Text>
                  <Text style={[ds.settingValue, { fontSize: 12, marginTop: 2 }]}>{tr('notifications', 'dailySummaryDesc')}</Text>
                </View>
                <Switch
                  value={notifSettings.dailySummary}
                  onValueChange={(v) => { void updateNotifSetting('dailySummary', v); }}
                  trackColor={{ false: colors.borderLight, true: colors.carbs + '60' }}
                  thumbColor={notifSettings.dailySummary ? colors.carbs : colors.textTertiary}
                />
              </View>
              <View style={ds.divider} />
              <TouchableOpacity style={ds.settingItem} onPress={() => { void handleTestNotification(); }} activeOpacity={0.7}>
                <View style={[ds.settingIconWrap, { backgroundColor: colors.proteinLight }]}>
                  <Send size={18} color={colors.protein} />
                </View>
                <Text style={ds.settingLabel}>Test bildirishnoma</Text>
                <ChevronRight size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={ds.sectionTitle}>{tr('settings', 'account')}</Text>
        <View style={ds.section}>
          <View style={ds.settingItem}>
            <View style={[ds.settingIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Info size={18} color={colors.primary} />
            </View>
            <Text style={ds.settingLabel}>{tr('settings', 'profileLabel')}</Text>
            <Text style={ds.settingValue}>{profile.name || tr('settings', 'notConfigured')}</Text>
            <ChevronRight size={16} color={colors.textTertiary} />
          </View>
          <View style={ds.divider} />
          <View style={ds.settingItem}>
            <View style={[ds.settingIconWrap, { backgroundColor: colors.fatsLight }]}>
              <Shield size={18} color={colors.fats} />
            </View>
            <Text style={ds.settingLabel}>{tr('common', 'version')}</Text>
            <Text style={ds.settingValue}>1.0.0</Text>
          </View>
        </View>

        <Text style={ds.sectionTitle}>{tr('profile', 'dataSection')}</Text>
        <View style={ds.section}>
          <TouchableOpacity style={ds.dangerItem} onPress={handleClearData} activeOpacity={0.7}>
            <View style={[ds.settingIconWrap, { backgroundColor: colors.warning + '15' }]}>
              <Trash2 size={18} color={colors.warning} />
            </View>
            <Text style={[ds.dangerText, { color: colors.warning }]}>{tr('data', 'clearRecords')}</Text>
          </TouchableOpacity>
          <View style={ds.divider} />
          <TouchableOpacity style={ds.dangerItem} onPress={handleResetAll} activeOpacity={0.7}>
            <View style={[ds.settingIconWrap, { backgroundColor: colors.danger + '15' }]}>
              <Trash2 size={18} color={colors.danger} />
            </View>
            <Text style={ds.dangerText}>{tr('data', 'resetAll')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={ds.versionText}>Oqsil v1.0.0</Text>
      </Animated.ScrollView>
    </View>
  );
}
