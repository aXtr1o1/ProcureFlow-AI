"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import {
  assistantChatStorageKey,
  clearAssistantChatStorage,
} from "@/lib/assistantChatStorage";

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
};

const AssistantChatContext = createContext<AssistantChatContextType | undefined>(
  undefined,
);

export { clearAssistantChatStorage };

export function AssistantChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);

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
    setMessages([]);
    clearAssistantChatStorage(user?.email);
  }, [user?.email]);

  const value = useMemo(
    () => ({ messages, setMessages, clearMessages, hydrated }),
    [messages, clearMessages, hydrated],
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
