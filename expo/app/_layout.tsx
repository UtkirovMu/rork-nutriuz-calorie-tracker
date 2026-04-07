import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { UserProvider } from "@/contexts/UserContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import SplashAnimation from "@/components/SplashAnimation";
import {
  registerForPushNotificationsAsync,
  loadNotificationSettings,
  scheduleMealReminders,
} from "@/utils/notifications";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 3000,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

function RootLayoutNav() {
  const { colors } = useTheme();
  const { tr } = useLanguage();

  return (
    <Stack
      screenOptions={{
        headerBackTitle: tr('nav', 'back'),
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="scanner" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="meal-plan" options={{ title: tr('nav', 'mealPlan') }} />
      <Stack.Screen name="achievements" options={{ title: tr('nav', 'achievements') }} />
      <Stack.Screen name="progress-photos" options={{ title: tr('nav', 'progressPhotos') }} />
      <Stack.Screen name="settings" options={{ title: tr('nav', 'settings') }} />
    </Stack>
  );
}

function useNotificationSetup() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        console.log('[App] Push token registered:', token);
      }
    });

    loadNotificationSettings().then((settings) => {
      if (settings.enabled) {
        scheduleMealReminders(settings);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[App] Notification received:', notification.request.content.title);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('[App] Notification tapped:', response.notification.request.content.title);
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  useNotificationSetup();

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <UserProvider>
                <RootLayoutNav />
                {showSplash && <SplashAnimation onFinish={handleSplashFinish} />}
              </UserProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
