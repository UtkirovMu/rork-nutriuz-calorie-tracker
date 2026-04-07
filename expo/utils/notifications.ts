import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PUSH_TOKEN_KEY = 'nutriuz_push_token';
const NOTIFICATION_SETTINGS_KEY = 'nutriuz_notification_settings';

export interface NotificationSettings {
  enabled: boolean;
  mealReminders: boolean;
  waterReminders: boolean;
  dailySummary: boolean;
  mealReminderTimes: {
    breakfast: string;
    lunch: string;
    dinner: string;
  };
  dailySummaryTime: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  mealReminders: true,
  waterReminders: true,
  dailySummary: true,
  mealReminderTimes: {
    breakfast: '08:00',
    lunch: '13:00',
    dinner: '19:00',
  },
  dailySummaryTime: '21:00',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('[Notifications] Web platform, skipping push registration');
    return null;
  }

  if (!Device.isDevice) {
    console.log('[Notifications] Not a physical device, skipping push registration');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('[Notifications] Requesting permission...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return null;
    }

    const easProjectId = Constants.expoConfig?.extra?.eas?.projectId;
    const envProjectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const projectId = easProjectId || (envProjectId && uuidRegex.test(envProjectId) ? envProjectId : undefined);
    console.log('[Notifications] Getting push token with projectId:', projectId);

    if (!projectId) {
      console.log('[Notifications] No valid projectId found, skipping push token registration');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;
    console.log('[Notifications] Push token:', token);

    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0B8F6C',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('meal-reminders', {
        name: 'Meal Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250],
        lightColor: '#0B8F6C',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('daily-summary', {
        name: 'Daily Summary',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#0B8F6C',
        sound: 'default',
      });
    }

    return token;
  } catch (error) {
    console.error('[Notifications] Registration error:', error);
    return null;
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(stored) };
    }
    return DEFAULT_NOTIFICATION_SETTINGS;
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    console.log('[Notifications] Settings saved');
  } catch (error) {
    console.error('[Notifications] Failed to save settings:', error);
  }
}

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [hour, minute] = timeStr.split(':').map(Number);
  return { hour, minute };
}

export async function scheduleMealReminders(settings: NotificationSettings): Promise<void> {
  if (Platform.OS === 'web') return;

  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('[Notifications] Cleared all scheduled notifications');

  if (!settings.enabled) {
    console.log('[Notifications] Notifications disabled, skipping scheduling');
    return;
  }

  if (settings.mealReminders) {
    const mealData: { key: keyof typeof settings.mealReminderTimes; title: string; body: string }[] = [
      { key: 'breakfast', title: '🌅 Nonushta vaqti!', body: "Nonushta qilishni unutmang. Sog'lom kun sog'lom nonushtadan boshlanadi!" },
      { key: 'lunch', title: '☀️ Tushlik vaqti!', body: "Tushlik qilish vaqti keldi. Oqsil va vitaminlarga boy ovqat tanlang!" },
      { key: 'dinner', title: '🌙 Kechki ovqat vaqti!', body: "Kechki ovqat vaqti. Yengil va foydali ovqat iste'mol qiling!" },
    ];

    for (const meal of mealData) {
      const { hour, minute } = parseTime(settings.mealReminderTimes[meal.key]);

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: meal.title,
            body: meal.body,
            sound: 'default',
            ...(Platform.OS === 'android' ? { channelId: 'meal-reminders' } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          },
        });
        console.log(`[Notifications] Scheduled ${meal.key} reminder at ${hour}:${minute}`);
      } catch (error) {
        console.error(`[Notifications] Failed to schedule ${meal.key}:`, error);
      }
    }
  }

  if (settings.dailySummary) {
    const { hour, minute } = parseTime(settings.dailySummaryTime);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📊 Kunlik hisobot',
          body: "Bugungi ovqatlanish statistikangizni ko'rib chiqing!",
          sound: 'default',
          ...(Platform.OS === 'android' ? { channelId: 'daily-summary' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
      console.log(`[Notifications] Scheduled daily summary at ${hour}:${minute}`);
    } catch (error) {
      console.error('[Notifications] Failed to schedule daily summary:', error);
    }
  }

  if (settings.waterReminders) {
    const waterHours = [9, 11, 14, 16, 18];
    for (const hour of waterHours) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '💧 Suv ichish vaqti!',
            body: "Organizmingizni suv bilan ta'minlang. Kamida 1 stakan suv iching!",
            sound: 'default',
            ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute: 0,
          },
        });
        console.log(`[Notifications] Scheduled water reminder at ${hour}:00`);
      } catch (error) {
        console.error(`[Notifications] Failed to schedule water reminder at ${hour}:`, error);
      }
    }
  }
}

export async function sendLocalNotification(title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
      },
      trigger: null,
    });
    console.log('[Notifications] Local notification sent:', title);
  } catch (error) {
    console.error('[Notifications] Failed to send local notification:', error);
  }
}
