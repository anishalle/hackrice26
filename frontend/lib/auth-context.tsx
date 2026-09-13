"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Models } from "appwrite";
import { account, ID } from "./appwrite";
import type { AccessibilityPreferences } from "./accessibility";

export interface UserPreferences extends Models.Preferences {
  persona_verified?: boolean;
  accessibility?: AccessibilityPreferences;
}

export interface SignupData {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface AuthContextType {
  user: Models.User<UserPreferences> | null;
  loading: boolean;
  sendMagicLink: (email: string, signupData?: SignupData) => Promise<Models.Token>;
  verifyMagicLink: (
    userId: string,
    secret: string,
    extraData?: SignupData
  ) => Promise<Models.Session>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateAccessibilityPreferences: (preferences: AccessibilityPreferences) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<UserPreferences> | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const currentUser = await account.get<UserPreferences>();
      setUser(currentUser);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await account.get<UserPreferences>();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const sendMagicLink = async (
    email: string,
    signupData?: SignupData
  ): Promise<Models.Token> => {
    let redirectUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/verify`
        : "/verify";

    if (signupData) {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            "pending_signup",
            JSON.stringify({
              email: email.trim().toLowerCase(),
              ...signupData,
            })
          );
        } catch {
          // ignore localStorage failure
        }
      }

      const params = new URLSearchParams();
      if (signupData.firstName) params.set("fn", signupData.firstName);
      if (signupData.lastName) params.set("ln", signupData.lastName);
      if (signupData.phone) params.set("ph", signupData.phone);
      const queryString = params.toString();
      if (queryString) {
        redirectUrl += `?${queryString}`;
      }
    }

    const token = await account.createMagicURLToken({
      userId: ID.unique(),
      email,
      url: redirectUrl,
    });

    return token;
  };

  const verifyMagicLink = async (
    userId: string,
    secret: string,
    extraData?: SignupData
  ): Promise<Models.Session> => {
    const session = await account.createSession({
      userId,
      secret,
    });

    let signupInfo: SignupData | null = extraData || null;
    if ((!signupInfo?.firstName && !signupInfo?.lastName) && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pending_signup");
        if (stored) {
          signupInfo = JSON.parse(stored);
          localStorage.removeItem("pending_signup");
        }
      } catch {
        // ignore
      }
    }

    if (signupInfo) {
      const fullName = `${signupInfo.firstName || ""} ${signupInfo.lastName || ""}`.trim();
      if (fullName) {
        try {
          await account.updateName({ name: fullName });
        } catch (err) {
          console.warn("Could not update name:", err);
        }
      }

      try {
        const existingPrefs = await account.getPrefs();
        await account.updatePrefs({
          prefs: {
            ...existingPrefs,
            firstName: signupInfo.firstName || "",
            lastName: signupInfo.lastName || "",
            phone: signupInfo.phone || "",
          },
        });
      } catch (err) {
        console.warn("Could not update preferences:", err);
      }
    }

    try {
      const currentUser = await account.get<UserPreferences>();
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

  const updateAccessibilityPreferences = async (preferences: AccessibilityPreferences) => {
    const existingPrefs = await account.getPrefs<UserPreferences>();
    await account.updatePrefs({
      prefs: {
        ...existingPrefs,
        accessibility: preferences,
      },
    });
    await refreshUser();
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
        updateAccessibilityPreferences,
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
