"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { authAPI, tokenUtils, userUtils } from "@/lib/auth";
import { useAuthSession } from "@/context/AuthSessionContext";

type AuthContextValue = {
  user: any;
  loading: boolean;
  isAuthenticated: boolean;
  login: (userData: any) => Promise<any>;
  verifyLogin: (data: any) => Promise<any>;
  logout: () => Promise<void>;
  register: (data: any) => Promise<any>;
  verifyEmail: (data: any) => Promise<any>;
  verifyPhone: (data: any) => Promise<any>;
  getGoogleConfig: () => Promise<any>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { sessionUser, isLoggedIn, logout: sessionLogout } = useAuthSession();
  const [loading, setLoading] = useState(false);

  const user = useMemo(() => {
    return sessionUser ?? userUtils.getUser();
  }, [sessionUser]);

  const isAuthenticated = Boolean(isLoggedIn || tokenUtils.isTokenValid() || user);

  const withLoading = useCallback(async (fn: () => Promise<any>) => {
    setLoading(true);
    try {
      return await fn();
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async (userData: any) =>
      withLoading(async () => {
        if (userData?.token) tokenUtils.setToken(userData.token);
        if (userData?.user) userUtils.setUser(userData.user);
        return { success: true, data: userData };
      }),
    [withLoading]
  );

  const verifyLogin = useCallback(
    async (data: any) =>
      withLoading(async () => {
        const res = await authAPI.verifyLogin(data);
        const token = res?.data?.token;
        const nextUser = res?.data?.user;
        if (token) tokenUtils.setToken(token);
        if (nextUser) userUtils.setUser(nextUser);
        return res;
      }),
    [withLoading]
  );

  const logout = useCallback(async () => {
    tokenUtils.removeToken();
    userUtils.removeUser();
    await sessionLogout();
  }, [sessionLogout]);

  const register = useCallback(
    async (data: any) =>
      withLoading(async () => {
        return authAPI.registerInitiate(data);
      }),
    [withLoading]
  );

  const verifyEmail = useCallback(
    async (data: any) =>
      withLoading(async () => {
        return authAPI.verifyEmail(data);
      }),
    [withLoading]
  );

  const verifyPhone = useCallback(
    async (data: any) =>
      withLoading(async () => {
        return authAPI.verifyPhone(data);
      }),
    [withLoading]
  );

  const getGoogleConfig = useCallback(async () => {
    return authAPI.getGoogleConfig();
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated,
    login,
    verifyLogin,
    logout,
    register,
    verifyEmail,
    verifyPhone,
    getGoogleConfig,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};

