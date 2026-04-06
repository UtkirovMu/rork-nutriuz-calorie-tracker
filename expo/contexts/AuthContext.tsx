import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { authApi, clearToken } from '@/utils/api';

const AUTH_KEY = 'nutriuz_auth';

export interface AuthData {
  isLoggedIn: boolean;
  loginMethod: 'email' | 'phone' | null;
  identifier: string;
  token?: string;
}

const defaultAuth: AuthData = {
  isLoggedIn: false,
  loginMethod: null,
  identifier: '',
};

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [auth, setAuth] = useState<AuthData>(defaultAuth);

  const authQuery = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(AUTH_KEY);
      return stored ? (JSON.parse(stored) as AuthData) : defaultAuth;
    },
  });

  useEffect(() => {
    if (authQuery.data) {
      setAuth(authQuery.data);
    }
  }, [authQuery.data]);

  const saveAuthMutation = useMutation({
    mutationFn: async (data: AuthData) => {
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(data));
      return data;
    },
    onSuccess: (data) => {
      setAuth(data);
      void queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  const sendOTP = useCallback(async (method: 'email' | 'phone', identifier: string) => {
    console.log('[Auth] Sending OTP to', method, identifier);
    const result = await authApi.sendOTP(method, identifier);
    console.log('[Auth] OTP sent:', result);
    return result;
  }, []);

  const verifyOTP = useCallback(async (method: 'email' | 'phone', identifier: string, otp: string) => {
    console.log('[Auth] Verifying OTP for', method, identifier);
    const result = await authApi.verifyOTP(method, identifier, otp);
    console.log('[Auth] OTP verified, token received, onboarding:', result.onboarding_complete);

    const newAuth: AuthData = {
      isLoggedIn: true,
      loginMethod: method,
      identifier,
      token: result.token,
    };
    saveAuthMutation.mutate(newAuth);
    return result;
  }, [saveAuthMutation]);

  const login = useCallback((method: 'email' | 'phone', identifier: string) => {
    const newAuth: AuthData = {
      isLoggedIn: true,
      loginMethod: method,
      identifier,
    };
    saveAuthMutation.mutate(newAuth);
  }, [saveAuthMutation]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.log('[Auth] Logout API error (ignored):', e);
    }
    await clearToken();
    saveAuthMutation.mutate(defaultAuth);
  }, [saveAuthMutation]);

  const isLoading = authQuery.isLoading;

  return useMemo(() => ({
    auth,
    login,
    logout,
    sendOTP,
    verifyOTP,
    isLoading,
  }), [auth, login, logout, sendOTP, verifyOTP, isLoading]);
});
