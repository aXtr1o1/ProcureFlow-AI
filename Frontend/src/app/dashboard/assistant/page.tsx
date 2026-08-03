"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getInvoices } from "@/services/api";
import type { Invoice } from "@/lib/invoices";
import { formatRand } from "@/lib/currency";
import {
  useAssistantChat,
  type ChatSource,
} from "@/context/AssistantChatContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SUGGESTIONS = [
  "Summarize invoices this month",
  "Find duplicate invoices",
  "Upcoming deadlines",
  "List pending approvals",
];

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

function buildGreeting(invoices: Invoice[]): string {
  const pending = invoices.filter(
    (i) =>
      i.processing_status === "Pending Validation" ||
      i.processing_status === "Approval Pending" ||
      i.processing_status === "Validation Completed",
  ).length;
  if (pending === 0) {
    return "Your invoice queue looks clear. Ask me anything about vendors, amounts (in Rand), duplicates, or upcoming deadlines — I’ll search your indexed documents and answer from them.";
  }
  return `You have **${pending} invoice${
    pending === 1 ? "" : "s"
  }** in review. Ask about vendors, due dates, duplicates, or pending approvals — I’ll pull from your documents and show amounts in **South African Rand (R)**.`;
}

function shortenUrlLabel(url: string) {
  if (url.includes("/Invoices/")) return "Invoice PDF";
  if (url.includes("blob.core.windows.net")) return "Document";
  return "Open link";
}

function renderAssistantText(text: string) {
  const cleaned = asText(text)
    .replace(
      /https?:\/\/\S+/g,
      (url) => `[${shortenUrlLabel(url)}](${url})`,
    )
    .trim();

  const blocks = cleaned.split(/\n{2,}/);

  return (
    <div className="flex flex-col gap-3 font-body-md text-body-md leading-relaxed text-on-surface">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").map((line) => line.trimEnd());
        const heading = lines[0]?.match(/^#{1,3}\s+(.+)$/);
        if (heading && lines.length === 1) {
          return (
            <h3
              key={blockIndex}
              className="font-title-md text-title-md text-on-surface"
            >
              {renderInline(heading[1])}
            </h3>
          );
        }

        const isList = lines.every(
          (line) => !line.trim() || /^[-*•]\s+|^\d+[.)]\s+/.test(line.trim()),
        );

        if (isList) {
          return (
            <ul key={blockIndex} className="list-disc space-y-1.5 pl-5">
              {lines
                .filter((line) => line.trim())
                .map((line, lineIndex) => (
                  <li key={`${blockIndex}-${lineIndex}`}>
                    {renderInline(
                      line.replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, ""),
                    )}
                  </li>
                ))}
            </ul>
          );
        }

        return (
          <div key={blockIndex} className="space-y-1.5">
            {lines.map((line, lineIndex) => {
              const h = line.match(/^#{1,3}\s+(.+)$/);
              if (h) {
                return (
                  <h3
                    key={`${blockIndex}-${lineIndex}`}
                    className="pt-1 font-title-md text-title-md text-on-surface"
                  >
                    {renderInline(h[1])}
                  </h3>
                );
              }
              return (
                <p
                  key={`${blockIndex}-${lineIndex}`}
                  className="whitespace-pre-wrap text-on-surface-variant"
                >
                  {line ? renderInline(line) : <br />}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary underline break-all"
        >
          {linkMatch[1]}
        </a>
      );
    }

    const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch) {
      return (
        <strong key={index} className="font-semibold text-on-surface">
          {boldMatch[1]}
        </strong>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function documentHref(source: ChatSource) {
  if (source.blob_name) {
    return `${API_URL}/invoices/${source.blob_name}`;
  }
  if (source.blob_url) {
    return source.blob_url;
  }
  return null;
}

function SourceCard({
  source,
  index,
  onOpen,
}: {
  source: ChatSource;
  index: number;
  onOpen: (id: string | number) => void;
}) {
  const href = documentHref(source);
  const canOpenInvoice = source.id != null && String(source.id).trim() !== "";
  const lineItems = Array.isArray(source.line_items) ? source.line_items : [];

  return (
    <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest/80 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-title-md text-body-md text-on-surface">
            {asText(
              source.invoice_number || source.vendor_name || `Source ${index + 1}`,
            )}
          </p>
          <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            <p className="font-label-sm text-label-sm text-outline">
              Vendor:{" "}
              <span className="text-on-surface">
                {asText(source.vendor_name, "—")}
              </span>
            </p>
            <p className="font-label-sm text-label-sm text-outline">
              Date:{" "}
              <span className="text-on-surface">
                {asText(source.invoice_date, "—")}
              </span>
            </p>
            <p className="font-label-sm text-label-sm text-outline">
              Amount:{" "}
              <span className="text-on-surface">
                {formatRand(source.total_amount, source.currency || "ZAR")}
              </span>
            </p>
            <p className="font-label-sm text-label-sm text-outline">
              Status:{" "}
              <span className="text-on-surface">
                {asText(source.processing_status, "—")}
              </span>
            </p>
          </div>

          {lineItems.length > 0 && (
            <ul className="mt-2 space-y-1 border-t border-outline-variant/10 pt-2">
              {lineItems.slice(0, 4).map((item, itemIndex) => (
                <li
                  key={`${source.azure_id ?? source.invoice_number}-${itemIndex}`}
                  className="font-body-sm text-body-sm text-on-surface-variant"
                >
                  {asText(item.description, "Item")} · Qty{" "}
                  {asText(item.quantity, "0")} ·{" "}
                  {formatRand(item.amount ?? item.unit_price, source.currency || "ZAR")}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {canOpenInvoice && (
            <button
              type="button"
              onClick={() => onOpen(source.id as string | number)}
              className="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-[18px]">
                visibility
              </span>
              Open
            </button>
          )}
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-[18px]">
                picture_as_pdf
              </span>
              PDF
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const router = useRouter();
  const {
    messages,
    setMessages,
    clearMessages,
    hydrated,
    typing,
    status,
    sendMessage,
  } = useAssistantChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetingLoaded = useRef(false);

  useEffect(() => {
    if (!hydrated || greetingLoaded.current) return;
    if (messages.length > 0) {
      greetingLoaded.current = true;
      return;
    }

    const loadInvoices = async () => {
      greetingLoaded.current = true;
      try {
        const data = await getInvoices();
        const list = Array.isArray(data?.data) ? data.data : [];
        setMessages([
          {
            id: newId(),
            role: "bot",
            text: buildGreeting(list),
            time: timeNow(),
          },
        ]);
      } catch (err) {
        console.error(err);
        setMessages([
          {
            id: newId(),
            role: "bot",
            text: "Hello! Ask me about invoices — I’ll search your documents and answer with amounts in Rand (R).",
            time: timeNow(),
          },
        ]);
      }
    };

    void loadInvoices();
  }, [hydrated, messages.length, setMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing, status]);

  const send = async (text: string) => {
    setInput("");
    await sendMessage(text);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void send(input);
  };

  const showEmptyHero = hydrated && messages.length <= 1 && !typing;

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-3xl flex-col px-4 sm:px-6">
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant/10 py-4">
        <div className="min-w-0">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Assistant
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            ChatGPT-style answers from your invoice documents · amounts in R (ZAR)
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            greetingLoaded.current = false;
            clearMessages();
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container"
          title="New chat"
        >
          <span className="material-symbols-outlined text-[18px]">add_comment</span>
          New chat
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-6 overflow-y-auto py-6"
      >
        {showEmptyHero && (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[28px]">
                auto_awesome
              </span>
            </div>
            <p className="font-title-lg text-title-lg text-on-surface">
              How can I help with AP today?
            </p>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === "bot" ? (
            <div key={msg.id} className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary shadow-sm">
                <span className="material-symbols-outlined text-[18px] text-on-primary">
                  auto_awesome
                </span>
              </div>
              <div className="min-w-0 max-w-[min(100%,42rem)] flex-1">
                <div className="rounded-2xl rounded-tl-md bg-surface-container-high/60 px-4 py-3.5">
                  {renderAssistantText(asText(msg.text))}

                  {msg.searchQuery && (
                    <p className="mt-3 border-t border-outline-variant/10 pt-2 font-label-sm text-label-sm text-outline">
                      Search query:{" "}
                      <span className="text-on-surface-variant">
                        {asText(msg.searchQuery)}
                      </span>
                    </p>
                  )}

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                      <p className="font-label-md text-label-md text-on-surface">
                        Sources ({msg.sources.length})
                      </p>
                      {msg.sources.map((source, index) => (
                        <SourceCard
                          key={`${source.id ?? source.azure_id ?? source.invoice_number ?? index}`}
                          source={source}
                          index={index}
                          onOpen={(id) =>
                            router.push(`/dashboard/invoices/${id}`)
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
                <span className="mt-1.5 block px-1 font-label-sm text-label-sm text-outline">
                  {msg.time}
                </span>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="ml-auto flex max-w-[min(100%,36rem)] gap-3">
              <div className="min-w-0 flex-1 text-right">
                <div className="inline-block rounded-2xl rounded-tr-md bg-primary px-4 py-3.5 text-left text-on-primary shadow-sm">
                  <p className="whitespace-pre-wrap font-body-md text-body-md">
                    {asText(msg.text)}
                  </p>
                </div>
                <span className="mt-1.5 block px-1 font-label-sm text-label-sm text-outline">
                  {msg.time}
                </span>
              </div>
            </div>
          ),
        )}

        {typing && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high">
              <span className="material-symbols-outlined text-[18px] text-outline">
                auto_awesome
              </span>
            </div>
            <div className="rounded-2xl rounded-tl-md bg-surface-container px-4 py-3.5">
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-outline [animation-delay:-0.3s]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-outline [animation-delay:-0.15s]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-outline" />
              </div>
              {status && (
                <p className="mt-2 font-label-sm text-label-sm text-outline">
                  {status}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-surface/95 pb-6 pt-2 backdrop-blur-md">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={typing}
              onClick={() => void send(s)}
              className="whitespace-nowrap rounded-full border border-outline-variant/20 bg-surface-container-lowest px-3.5 py-1.5 font-label-md text-label-md text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={handleSubmit}
          action="#"
          className="flex items-end gap-2 rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-md"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            disabled={typing}
            rows={1}
            className="max-h-36 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 font-body-md text-body-md text-on-surface outline-none disabled:opacity-60"
            placeholder="Message Assistant…"
          />
          <button
            type="submit"
            disabled={typing || !input.trim()}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
            aria-label="Send"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
          </button>
        </form>
        <p className="mt-2 text-center font-label-sm text-label-sm text-outline">
          Session kept until logout · amounts shown in Rand (ZAR)
        </p>
      </div>
    </div>
  );
}
