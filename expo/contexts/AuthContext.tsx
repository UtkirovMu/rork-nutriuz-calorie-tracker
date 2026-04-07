import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { authApi, clearStoredToken, syncStoredToken } from '@/utils/api';

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
  const [initialized, setInitialized] = useState(false);

  const authQuery = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(AUTH_KEY);
      const parsedAuth = stored ? (JSON.parse(stored) as AuthData) : defaultAuth;

      if (parsedAuth.isLoggedIn && parsedAuth.token) {
        await syncStoredToken(parsedAuth.token);
      } else if (!parsedAuth.isLoggedIn) {
        await clearStoredToken();
      }

      return parsedAuth;
    },
  });

  useEffect(() => {
    if (authQuery.data) {
      setAuth(authQuery.data);
      setInitialized(true);
    }
  }, [authQuery.data]);

  const saveAuthMutation = useMutation({
    mutationFn: async (data: AuthData) => {
      if (data.isLoggedIn && data.token) {
        await syncStoredToken(data.token);
      } else {
        await clearStoredToken();
      }

      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(data));
      return data;
    },
    onSuccess: (data) => {
      setAuth(data);
      void queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  const sendCodeMutation = useMutation({
    mutationFn: async (params: { method: 'email' | 'phone'; identifier: string }) => {
      console.log('[Auth] Sending code to:', params.identifier);
      const result = await authApi.sendCode(params.method, params.identifier);
      return result;
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async (params: { method: 'email' | 'phone'; identifier: string; code: string }) => {
      console.log('[Auth] Verifying code for:', params.identifier);
      const result = await authApi.verifyCode(params.method, params.identifier, params.code);
      return result;
    },
  });

  const sendCode = useCallback(async (method: 'email' | 'phone', identifier: string) => {
    return sendCodeMutation.mutateAsync({ method, identifier });
  }, [sendCodeMutation]);

  const verifyCode = useCallback(async (method: 'email' | 'phone', identifier: string, code: string) => {
    const result = await verifyCodeMutation.mutateAsync({ method, identifier, code });
    const newAuth: AuthData = {
      isLoggedIn: true,
      loginMethod: method,
      identifier,
      token: result.token,
    };
    await saveAuthMutation.mutateAsync(newAuth);
    return result;
  }, [verifyCodeMutation, saveAuthMutation]);

  const login = useCallback(async (method: 'email' | 'phone', identifier: string, token?: string) => {
    const newAuth: AuthData = {
      isLoggedIn: true,
      loginMethod: method,
      identifier,
      token,
    };
    await saveAuthMutation.mutateAsync(newAuth);
  }, [saveAuthMutation]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.log('[Auth] API logout error (ignored):', e);
    }
    await saveAuthMutation.mutateAsync(defaultAuth);
  }, [saveAuthMutation]);

  const isLoading = authQuery.isLoading || !initialized;
  const isSendingCode = sendCodeMutation.isPending;
  const isVerifying = verifyCodeMutation.isPending;
  const sendCodeError = sendCodeMutation.error?.message || null;
  const verifyError = verifyCodeMutation.error?.message || null;

  return useMemo(() => ({
    auth,
    login,
    logout,
    sendCode,
    verifyCode,
    isLoading,
    isSendingCode,
    isVerifying,
    sendCodeError,
    verifyError,
  }), [auth, login, logout, sendCode, verifyCode, isLoading, isSendingCode, isVerifying, sendCodeError, verifyError]);
});
