import type { Message } from "@chatbot/shared";
import { useEffect, useRef } from "react";

interface Props {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  error: string | null;
}

export default function ChatArea({ messages, streamingContent, isStreaming, error }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center" style={{ animation: "fade-in 0.4s ease-out both" }}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-800/60">
            <svg className="h-6 w-6 text-surface-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
          <h2 className="mb-1.5 font-display text-lg font-500 text-surface-200">
            Start a conversation
          </h2>
          <p className="text-sm text-surface-500">
            Send a message to begin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        {messages.map((msg, i) => (
          <div
            key={msg.messageId}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            style={{
              animation: "msg-in 0.25s ease-out both",
              animationDelay: `${Math.min(i * 30, 150)}ms`,
            }}
          >
            {msg.role === "assistant" && (
              <div className="mr-2.5 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-800/70">
                <svg className="h-3.5 w-3.5 text-primary-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary-600 text-white"
                  : "bg-surface-800/50 text-surface-200 ring-1 ring-surface-700/40"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {isStreaming && streamingContent && (
          <div
            className="flex justify-start"
            style={{ animation: "msg-in 0.2s ease-out both" }}
          >
            <div className="mr-2.5 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-800/70">
              <svg className="h-3.5 w-3.5 text-primary-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="max-w-[75%] rounded-2xl bg-surface-800/50 px-4 py-3 text-[14px] leading-relaxed text-surface-200 ring-1 ring-surface-700/40">
              <div className="whitespace-pre-wrap">{streamingContent}</div>
              <span className="ml-0.5 inline-block h-[18px] w-[2px] animate-pulse bg-primary-400" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="rounded-xl bg-red-950/30 px-4 py-2.5 text-sm text-red-400 ring-1 ring-red-900/30">
              {error}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
