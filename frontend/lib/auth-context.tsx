"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Models } from "appwrite";
import { account, ID } from "./appwrite";

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  loading: boolean;
  sendMagicLink: (email: string) => Promise<Models.Token>;
  verifyMagicLink: (userId: string, secret: string) => Promise<Models.Session>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const sendMagicLink = async (email: string): Promise<Models.Token> => {
    const redirectUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/verify`
        : "/verify";

    const token = await account.createMagicURLToken({
      userId: ID.unique(),
      email,
      url: redirectUrl,
    });

    return token;
  };

  const verifyMagicLink = async (
    userId: string,
    secret: string
  ): Promise<Models.Session> => {
    const session = await account.createSession({
      userId,
      secret,
    });

    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch {
      setUser(null);
    }

    return session;
  };

  const logout = async () => {
    try {
      await account.deleteSession("current");
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sendMagicLink,
        verifyMagicLink,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
