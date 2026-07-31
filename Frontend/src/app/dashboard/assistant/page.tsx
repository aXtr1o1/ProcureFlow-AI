"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getInvoices } from "@/services/api";
import type { Invoice } from "@/lib/invoices";

type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  cards?: Invoice[];
  time: string;
};

const SUGGESTIONS = [
  "Summarize invoices this month",
  "Find duplicate invoices",
  "Upcoming deadlines",
];

function timeNow() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildGreeting(invoices: Invoice[]): string {
  const pending = invoices.filter(
    (i) => i.processing_status === "Pending Validation" || i.processing_status === "Pending Approval"
  ).length;
  if (pending === 0) {
    return "Good morning! Your invoice queue is clear right now — nothing needs your attention. How can I help?";
  }
  return `Good morning! You have ${pending} invoice${
    pending === 1 ? "" : "s"
  } pending review. How can I help you today?`;
}

function answerQuestion(
  question: string,
  invoices: Invoice[]
): { text: string; cards?: Invoice[] } {
  const q = question.toLowerCase();

  // Try to match a vendor name mentioned in the question.
  const vendorMatch = invoices.find((inv) =>
    q.includes(inv.vendor_name.toLowerCase().split(" ")[0].toLowerCase())
  );

  if (q.includes("summar")) {
    const total = invoices.reduce((s, i) => s + i.total_amount, 0);
    return {
      text: `This month I found ${invoices.length} invoices totaling $${total.toFixed(
        2
      )}. ${invoices.filter((i) => i.processing_status === "Approved").length} are approved, ${
        invoices.filter(
          (i) => i.processing_status === "Pending Validation" || i.processing_status === "Pending Approval"
        ).length
      } are still in review.`,
    };
  }

  if (q.includes("duplicate")) {
    return {
      text: "Scanning for duplicates... I didn't find any exact matches on invoice number and amount, but I'll keep watching as new invoices come in.",
    };
  }

  if (q.includes("deadline") || q.includes("due")) {
    const upcoming = [...invoices]
      .filter((i) => i.processing_status !== "Approved" && i.processing_status !== "Rejected")
      .sort(
        (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      )
      .slice(0, 3);
    if (upcoming.length === 0) {
      return { text: "There are no open invoices with upcoming due dates." };
    }
    return {
      text: `Here are the closest upcoming due dates across your open invoices:`,
      cards: upcoming,
    };
  }

  if (q.includes("pending") || q.includes("review") || q.includes("flag")) {
    const pending = invoices.filter(
      (i) => i.processing_status === "Pending Validation" || i.processing_status === "Pending Approval"
    );
    if (pending.length === 0) {
      return { text: "Nothing is currently pending review — you're all caught up." };
    }
    return {
      text: `I found ${pending.length} invoice${
        pending.length === 1 ? "" : "s"
      } pending review:`,
      cards: pending.slice(0, 4),
    };
  }

  if (vendorMatch) {
    const vendorInvoices = invoices.filter(
      (i) => i.vendor_name === vendorMatch.vendor_name
    );
    return {
      text: `I found ${vendorInvoices.length} invoice${
        vendorInvoices.length === 1 ? "" : "s"
      } from ${vendorMatch.vendor_name}:`,
      cards: vendorInvoices.slice(0, 4),
    };
  }

  if (invoices.length === 0) {
    return {
      text: "You don't have any invoices uploaded yet — try uploading one and I can help you dig into it.",
    };
  }

  return {
    text: "I can help you search invoices, summarize spend, flag duplicates, or check upcoming due dates. Try asking about a specific vendor, or use one of the suggestions below.",
  };
}

export default function AssistantPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const response = await getInvoices();

        const invs = response.data;

        setInvoices(invs);

        setMessages([
          {
            id: crypto.randomUUID(),
            role: "bot",
            text: buildGreeting(invs),
            time: timeNow(),
          },
        ]);
      } catch (err) {
        console.error(err);
      }
    };

    loadInvoices();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: trimmed,
      time: timeNow(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      const { text: answer, cards } = answerQuestion(trimmed, invoices);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "bot",
          text: answer,
          cards,
          time: timeNow(),
        },
      ]);
      setTyping(false);
    }, 700);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="max-w-3xl mx-auto w-full min-h-[calc(100vh-80px)] flex flex-col px-margin-desktop">
      <div className="pt-8 pb-4">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">
          Invoice AI Assistant
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Ask about your invoices, vendors, and approvals in plain English.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex flex-col gap-6 py-4"
      >
        {messages.map((msg) =>
          msg.role === "bot" ? (
            <div key={msg.id} className="flex gap-3 max-w-[90%]">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-on-primary text-[18px]">
                  auto_awesome
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="bg-surface-container-highest text-on-surface-variant p-4 rounded-xl rounded-tl-none shadow-sm">
                  <p className="font-body-md text-body-md">{msg.text}</p>
                  {msg.cards && msg.cards.length > 0 && (
                    <div className="flex flex-col gap-2 mt-3">
                      {msg.cards.map((inv) => (
                        <button
                          key={inv.id}
                          onClick={() =>
                            router.push(`/dashboard/invoices/${inv.id}`)
                          }
                          className="bg-surface-container-lowest p-3 rounded-lg flex items-center justify-between shadow-sm hover:shadow-md transition-shadow text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-secondary-container flex items-center justify-center text-on-secondary-container">
                              <span className="material-symbols-outlined text-[20px]">
                                description
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-title-md text-body-md truncate">
                                {inv.invoice_number}
                              </p>
                              <p className="font-label-sm text-label-sm text-outline">
                                ${inv.total_amount.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-primary">
                            chevron_right
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="font-label-sm text-label-sm text-outline px-1">
                  {msg.time}
                </span>
              </div>
            </div>
          ) : (
            <div
              key={msg.id}
              className="flex flex-row-reverse gap-3 max-w-[85%] ml-auto"
            >
              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center shrink-0 shadow-sm text-on-secondary-container">
                <span className="material-symbols-outlined text-[18px]">
                  person
                </span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="bg-primary text-on-primary p-4 rounded-xl rounded-tr-none shadow-md">
                  <p className="font-body-md text-body-md">{msg.text}</p>
                </div>
                <span className="font-label-sm text-label-sm text-outline px-1">
                  {msg.time}
                </span>
              </div>
            </div>
          )
        )}
        {typing && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-outline text-[18px]">
                auto_awesome
              </span>
            </div>
            <div className="bg-surface-container text-outline p-4 rounded-xl rounded-tl-none flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom controls */}
      <div className="bg-surface/90 backdrop-blur-lg pt-2 pb-6 sticky bottom-0">
        <div className="flex gap-2 overflow-x-auto pb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="whitespace-nowrap px-4 py-2 bg-surface-container-lowest text-primary font-label-md text-label-md rounded-full shadow-sm hover:bg-primary-fixed transition-colors active:scale-95"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-surface-container-lowest rounded-xl flex items-center p-1.5 shadow-md border border-surface-variant"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface font-body-md px-3 outline-none"
            placeholder="Ask about your finances..."
            type="text"
          />
          <button
            type="submit"
            className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-on-primary shadow-sm hover:shadow-md active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[22px]">send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
