"use client";
import {
  login,
  register,
  getCurrentUser,
} from "@/services/api";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

type User = {
  username: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (
    username: string,
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ ok: boolean }>;
  signOut: () => void;
};

const STORAGE_KEY = "aiInvoicePo.session";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const loadUser = async () => {

        try {

            const token = localStorage.getItem("access_token");

            if (!token) {
                setLoading(false);
                return;
            }

            const user = await getCurrentUser();

            setUser(user);

        } catch {

            localStorage.removeItem("access_token");
            setUser(null);

        } finally {

            setLoading(false);

        }

    };

    loadUser();

}, []);

  const persist = (u: User | null) => {
    setUser(u);
    if (u) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const signIn = async (
    username: string,
    password: string
  ) => {

    try {

      const data = await login(username, password);

      localStorage.setItem(
        "access_token",
        data.access_token
      );

      const currentUser = await getCurrentUser();

      persist(currentUser);

      return {
        ok: true,
      };

    } catch (err: any) {

      return {
        ok: false,
        error: err.message,
      };

    }

  };

  const signUp = async (
    username: string,
    email: string,
    password: string
  ) => {

    try {

      await register(
        username,
        email,
        password
      );

      return await signIn(
        email,
        password
      );

    } catch (err: any) {

      return {
        ok: false,
        error: err.message,
      };

    }

  };

  const signInWithGoogle: AuthContextType["signInWithGoogle"] = async () => {
    await new Promise((r) => setTimeout(r, 500));
    persist({ username: "Google User", email: "google.user@company.com" });
    return { ok: true };
  };

  const signOut = () => {

    localStorage.removeItem("access_token");

    persist(null);

  };

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signInWithGoogle, signOut }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
