const STORAGE_PREFIX = "aiInvoicePo.assistantChat.";

export function assistantChatStorageKey(email?: string | null) {
  return `${STORAGE_PREFIX}${email || "anon"}`;
}

export function clearAssistantChatStorage(email?: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (email) {
      window.sessionStorage.removeItem(assistantChatStorageKey(email));
    }
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // ignore storage errors
  }
}

export { STORAGE_PREFIX };
