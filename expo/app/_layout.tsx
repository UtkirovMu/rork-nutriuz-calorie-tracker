import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { UserProvider } from "@/contexts/UserContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";

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

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <UserProvider>
                <RootLayoutNav />
              </UserProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
