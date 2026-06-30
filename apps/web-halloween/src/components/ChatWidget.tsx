"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ChatMessage } from "@hr-ecom/shared";
import { site, whatsappChatUrl } from "@/lib/site";
import { getOrCreateSessionId } from "@/lib/session";
import { api } from "@/lib/api";

const STORAGE_KEY = "usarakhi_chat_messages";

const QUICK_PROMPTS = [
  "What Rakhi types do you sell?",
  "How long is USA delivery?",
  "When is Halloween 2026?",
  "Can I order from India?",
] as const;

const WELCOME: ChatMessage = {
  role: "assistant",
  content: `Hi! I'm the HalloweenReady Assistant. I can help you choose the perfect Rakhi, explain USA delivery, shipping times, and payment options.\n\nWhat would you like to know?`,
};

function loadStoredMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [WELCOME];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [WELCOME];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return parsed.length ? parsed : [WELCOME];
  } catch {
    return [WELCOME];
  }
}

/** Render assistant text with markdown links and line breaks. */
function ChatMessageBody({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);

  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const [, label, href] = linkMatch;
          const isExternal = href.startsWith("http");
          if (isExternal) {
            return (
              <a
                key={i}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-200 underline underline-offset-2 hover:text-white"
              >
                {label}
              </a>
            );
          }
          return (
            <Link key={i} href={href} className="text-blue-200 underline underline-offset-2 hover:text-white">
              {label}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function ChatIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatStartedRef = useRef(false);

  useEffect(() => {
    setMessages(loadStoredMessages());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages, loading]);

  const trackChatStart = useCallback(async () => {
    if (chatStartedRef.current) return;
    chatStartedRef.current = true;
    const sessionId = getOrCreateSessionId();
    try {
      await api("/leads", {
        method: "POST",
        sessionId,
        body: JSON.stringify({
          sessionId,
          page: pathname,
          source: "chat",
          metadata: { action: "chat_opened" },
        }),
      });
    } catch {
      /* non-blocking */
    }
  }, [pathname]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      const userMsg: ChatMessage = { role: "user", content: trimmed.slice(0, 500) };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages.filter((m) => m.role === "user" || m.role === "assistant"),
            page: pathname,
            sessionId: getOrCreateSessionId(),
          }),
        });

        const data = (await res.json()) as { message?: string; error?: string };

        if (!res.ok) {
          throw new Error(data.error ?? "Could not get a response");
        }

        setMessages((prev) => [...prev, { role: "assistant", content: data.message ?? "" }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, pathname]
  );

  const handleOpen = () => {
    setOpen(true);
    void trackChatStart();
  };

  const clearChat = () => {
    setMessages([WELCOME]);
    setError(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-[5.5rem] right-5 z-50 flex w-[min(100vw-2.5rem,380px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-primary shadow-2xl"
          role="dialog"
          aria-label="HalloweenReady chat assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 bg-primary px-4 py-3 border-b border-white/10">
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm">HalloweenReady Assistant</p>
              <p className="text-xs text-white/60 truncate">Rakhi delivery help · USA shipping</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={clearChat}
                className="rounded-lg px-2 py-1 text-xs text-white/60 hover:text-white hover:bg-white/10"
                title="Start new chat"
              >
                New
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10"
                aria-label="Close chat"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 max-h-[min(55vh,420px)] overflow-y-auto px-3 py-4 space-y-3 bg-slate-900/40">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-nav text-white rounded-br-md"
                      : "bg-white/10 text-white/95 rounded-bl-md"
                  }`}
                >
                  <ChatMessageBody text={m.content} />
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-sm text-white/70">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce [animation-delay:0ms]">·</span>
                    <span className="animate-bounce [animation-delay:150ms]">·</span>
                    <span className="animate-bounce [animation-delay:300ms]">·</span>
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-300 px-1">{error}</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick prompts — show when only welcome message */}
          {messages.length <= 1 && !loading && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 border-t border-white/5 pt-2">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void sendMessage(q)}
                  className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-xs text-white/90 hover:bg-white/15 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            className="border-t border-white/10 p-3 bg-primary"
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
          >
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage(input);
                  }
                }}
                placeholder="Ask about Rakhi, shipping, payment…"
                rows={1}
                maxLength={500}
                disabled={loading}
                className="flex-1 resize-none rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-nav disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="shrink-0 rounded-xl bg-nav px-3.5 py-2.5 text-white hover:bg-blue-600 disabled:opacity-40 transition"
                aria-label="Send message"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a1 1 0 00-1.52 1.05l2.1 7.05H11a1 1 0 010 2H3.98l-2.1 7.05A1 1 0 003.4 20.4z" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-[10px] text-white/40 text-center">
              Website help only ·{" "}
              <a href={whatsappChatUrl()} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/60">
                WhatsApp {site.whatsappDisplay}
              </a>{" "}
              for orders
            </p>
          </form>
        </div>
      )}

      {/* Launcher button — stacked above WhatsApp */}
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        aria-label={open ? "Close chat" : "Open HalloweenReady chat assistant"}
        aria-expanded={open}
        className="fixed bottom-[4.75rem] right-5 z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-[0_4px_12px_rgba(24,58,104,0.45)] ring-2 ring-white/20 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-transform"
      >
        {open ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <ChatIcon />
        )}
      </button>
    </>
  );
}
