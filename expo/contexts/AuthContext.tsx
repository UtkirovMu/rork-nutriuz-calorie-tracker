import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

const AUTH_KEY = 'nutriuz_auth';

export interface AuthData {
  isLoggedIn: boolean;
  loginMethod: 'email' | 'phone' | null;
  identifier: string;
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

  const login = useCallback((method: 'email' | 'phone', identifier: string) => {
    const newAuth: AuthData = {
      isLoggedIn: true,
      loginMethod: method,
      identifier,
    };
    saveAuthMutation.mutate(newAuth);
  }, [saveAuthMutation]);

  const logout = useCallback(() => {
    saveAuthMutation.mutate(defaultAuth);
  }, [saveAuthMutation]);

  const isLoading = authQuery.isLoading;

  return useMemo(() => ({
    auth,
    login,
    logout,
    isLoading,
  }), [auth, login, logout, isLoading]);
});
