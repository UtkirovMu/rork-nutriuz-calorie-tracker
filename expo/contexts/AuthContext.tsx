import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { authApi, clearAuthData } from '@/utils/api';

const AUTH_KEY = 'nutriuz_auth';

export interface AuthData {
  isLoggedIn: boolean;
  loginMethod: 'email' | 'phone' | null;
  identifier: string;
  token?: string;
  userId?: number;
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

  const sendCode = useCallback(async (method: 'email' | 'phone', identifier: string) => {
    try {
      const result = await authApi.sendCode(method, identifier);
      console.log('[Auth] OTP sent:', result);
      return result;
    } catch (error) {
      console.error('[Auth] Send code error:', error);
      throw error;
    }
  }, []);

  const verifyCode = useCallback(async (method: 'email' | 'phone', identifier: string, code: string) => {
    try {
      const result = await authApi.verifyCode(method, identifier, code);
      console.log('[Auth] Verify result:', result);
      const newAuth: AuthData = {
        isLoggedIn: true,
        loginMethod: method,
        identifier,
        token: result.token,
        userId: result.user_id,
      };
      saveAuthMutation.mutate(newAuth);
      return result;
    } catch (error) {
      console.error('[Auth] Verify code error:', error);
      throw error;
    }
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
    await clearAuthData();
    saveAuthMutation.mutate(defaultAuth);
  }, [saveAuthMutation]);

  const isLoading = authQuery.isLoading;

  return useMemo(() => ({
    auth,
    login,
    logout,
    sendCode,
    verifyCode,
    isLoading,
  }), [auth, login, logout, sendCode, verifyCode, isLoading]);
});
