"use client";

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
const USERS_KEY = "aiInvoicePo.users";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readUsers(): Record<string, { username: string; email: string; password: string }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeUsers(users: Record<string, { username: string; email: string; password: string }>) {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore corrupted storage
    } finally {
      setLoading(false);
    }
  }, []);

  const persist = (u: User | null) => {
    setUser(u);
    if (u) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const signIn: AuthContextType["signIn"] = async (email, password) => {
    await new Promise((r) => setTimeout(r, 500));
    const users = readUsers();
    const record = users[email.toLowerCase()];
    if (!record || record.password !== password) {
      return { ok: false, error: "Invalid email or password." };
    }
    persist({ username: record.username, email: record.email });
    return { ok: true };
  };

  const signUp: AuthContextType["signUp"] = async (username, email, password) => {
    await new Promise((r) => setTimeout(r, 500));
    const users = readUsers();
    const key = email.toLowerCase();
    if (users[key]) {
      return { ok: false, error: "An account with this email already exists." };
    }
    users[key] = { username, email, password };
    writeUsers(users);
    persist({ username, email });
    return { ok: true };
  };

  const signInWithGoogle: AuthContextType["signInWithGoogle"] = async () => {
    await new Promise((r) => setTimeout(r, 500));
    persist({ username: "Google User", email: "google.user@company.com" });
    return { ok: true };
  };

  const signOut = () => persist(null);

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
