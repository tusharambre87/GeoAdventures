import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Analytics } from "@/services/analytics/analytics";

export const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export type AuthUser = {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  profileImageUrl?: string;
  subscriptionTier?: string;
  purchasedCityIds?: string[];
};

type RegisterPlayer = {
  name: string;
  isParent: boolean;
  age: string;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    players: RegisterPlayer[]
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const results = await AsyncStorage.multiGet([
        "auth_token",
        "auth_user",
        "auth_expires_at",
      ]);
      const storedToken = results[0][1];
      const storedUser = results[1][1];
      const expiresAt = results[2][1];

      if (storedToken && storedUser) {
        const expired = expiresAt && Date.now() > parseInt(expiresAt, 10);
        if (!expired) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } else {
          await clearStoredAuth();
        }
      }
    } catch {
      // ignore storage errors — user stays logged out
    } finally {
      setIsLoading(false);
    }
  }

  async function clearStoredAuth() {
    await AsyncStorage.multiRemove(["auth_token", "auth_user", "auth_expires_at"]);
  }

  async function storeAuth(t: string, u: AuthUser, expiresIn: number) {
    const expiresAt = (Date.now() + expiresIn * 1000).toString();
    await AsyncStorage.multiSet([
      ["auth_token", t],
      ["auth_user", JSON.stringify(u)],
      ["auth_expires_at", expiresAt],
    ]);
    setToken(t);
    setUser(u);
    Analytics.identify(u.id, { email: u.email, created_at: (u as any).createdAt });

    // Dev-only: if the user's profile carries a dev_date_override (set server-side
    // via onboarding_completed JSONB), auto-seed AsyncStorage so the correct date
    // is active without manual modal entry.
    if (__DEV__) {
      const oc = (u as any).onboardingCompleted ?? (u as any).onboarding_completed;
      const devDate: string | undefined = oc?.dev_date_override ?? oc?.devDateOverride;
      if (devDate && typeof devDate === "string") {
        await AsyncStorage.setItem("dev_date_override", devDate);
      }
    }
  }

  async function login(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message || "Login failed" };
      await storeAuth(data.token, data.user, data.expiresIn);
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Check your connection." };
    }
  }

  async function register(
    name: string,
    email: string,
    password: string,
    players: RegisterPlayer[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const regRes = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, players }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) return { success: false, error: regData.message || "Registration failed" };

      // immediately exchange credentials for a JWT
      const tokenRes = await fetch(`${API_BASE}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) return { success: false, error: tokenData.message || "Login after register failed" };

      await storeAuth(tokenData.token, tokenData.user, tokenData.expiresIn);
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Check your connection." };
    }
  }

  async function logout() {
    await clearStoredAuth();
    setToken(null);
    setUser(null);
    Analytics.reset();
  }

  async function refreshUser() {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const u: AuthUser = data.user ?? data;
        setUser(u);
        await AsyncStorage.setItem("auth_user", JSON.stringify(u));
        // Dev-only: propagate dev_date_override from server profile to AsyncStorage
        if (__DEV__) {
          const oc = (u as any).onboardingCompleted ?? (u as any).onboarding_completed;
          const devDate: string | undefined = oc?.dev_date_override ?? oc?.devDateOverride;
          if (devDate && typeof devDate === "string") {
            await AsyncStorage.setItem("dev_date_override", devDate);
          }
        }
      }
    } catch {
      // non-fatal — context remains as-is
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
