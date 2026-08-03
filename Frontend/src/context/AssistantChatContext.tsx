"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import {
  assistantChatStorageKey,
  clearAssistantChatStorage,
} from "@/lib/assistantChatStorage";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ChatSource = {
  id?: number | string | null;
  azure_id?: string | null;
  invoice_number?: string | null;
  vendor_name?: string | null;
  invoice_date?: string | null;
  currency?: string | null;
  original_currency?: string | null;
  total_amount?: number | string | null;
  processing_status?: string | null;
  blob_url?: string | null;
  blob_name?: string | null;
  score?: number | null;
  snippet?: string | null;
  line_items?: Array<{
    description?: string;
    quantity?: number;
    unit_price?: number;
    amount?: number;
  }>;
};

export type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  searchQuery?: string;
  sources?: ChatSource[];
  time: string;
};

type AssistantChatContextType = {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  clearMessages: () => void;
  hydrated: boolean;
  typing: boolean;
  status: string | null;
  sendMessage: (text: string) => Promise<void>;
};

const AssistantChatContext = createContext<AssistantChatContextType | undefined>(
  undefined,
);

export { clearAssistantChatStorage };

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function timeNow() {
  return new Date().toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function asText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return fallback || "Unexpected response";
  }
}

function formatApiError(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg?: string }).msg || item);
        }
        return asText(item);
      })
      .join(", ");
  }
  return asText(detail, "Assistant request failed.");
}

export function AssistantChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [typing, setTyping] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const sendingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const cancelIntentionalRef = useRef(false);

  useEffect(() => {
    setHydrated(false);
    try {
      const raw = window.sessionStorage.getItem(
        assistantChatStorageKey(user?.email),
      );
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          setHydrated(true);
          return;
        }
      }
    } catch {
      // ignore
    }
    setMessages([]);
    setHydrated(true);
  }, [user?.email]);

  useEffect(() => {
    if (!hydrated || !user) return;
    try {
      window.sessionStorage.setItem(
        assistantChatStorageKey(user.email),
        JSON.stringify(messages),
      );
    } catch {
      // ignore
    }
  }, [messages, hydrated, user]);

  const clearMessages = useCallback(() => {
    cancelIntentionalRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    sendingRef.current = false;
    setTyping(false);
    setStatus(null);
    setMessages([]);
    clearAssistantChatStorage(user?.email);
  }, [user?.email]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sendingRef.current) return;

    cancelIntentionalRef.current = false;
    sendingRef.current = true;
    setMessages((prev) => [
      ...prev,
      {
        id: newId(),
        role: "user",
        text: trimmed,
        time: timeNow(),
      },
    ]);

    setTyping(true);
    setStatus("Searching your invoice documents…");

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(`${API_URL}/azure-openai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
        }),
        signal: controller.signal,
      });

      window.clearTimeout(timeout);
      if (cancelIntentionalRef.current) return;

      setStatus("Writing answer…");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(formatApiError(data.detail));
      }

      if (cancelIntentionalRef.current) return;

      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "bot",
          text: asText(data.response, "No answer returned."),
          searchQuery: asText(data.search_query) || undefined,
          sources: Array.isArray(data.sources) ? data.sources : [],
          time: timeNow(),
        },
      ]);
    } catch (err) {
      if (cancelIntentionalRef.current) return;

      console.error(err);
      const message =
        err instanceof DOMException && err.name === "AbortError"
          ? "The assistant request timed out. Please try a shorter question."
          : err instanceof Error
            ? err.message
            : "Sorry, I couldn't process your request.";

      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "bot",
          text: message,
          time: timeNow(),
        },
      ]);
    } finally {
      window.clearTimeout(timeout);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      if (!cancelIntentionalRef.current) {
        setTyping(false);
        setStatus(null);
        sendingRef.current = false;
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      messages,
      setMessages,
      clearMessages,
      hydrated,
      typing,
      status,
      sendMessage,
    }),
    [messages, clearMessages, hydrated, typing, status, sendMessage],
  );

  return (
    <AssistantChatContext.Provider value={value}>
      {children}
    </AssistantChatContext.Provider>
  );
}

export function useAssistantChat() {
  const ctx = useContext(AssistantChatContext);
  if (!ctx) {
    throw new Error("useAssistantChat must be used within AssistantChatProvider");
  }
  return ctx;
}
