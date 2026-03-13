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
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-white">Start a conversation</h2>
          <p className="text-sm text-surface-400">Send a message to begin chatting with GPT.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {messages.map((msg) => (
          <div key={msg.messageId} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary-600 text-white"
                  : "bg-surface-800 text-surface-100"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {isStreaming && streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl bg-surface-800 px-4 py-3 text-sm leading-relaxed text-surface-100">
              <div className="whitespace-pre-wrap">{streamingContent}</div>
              <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-primary-400" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="rounded-lg bg-red-950/50 px-4 py-2 text-sm text-red-300">
              {error}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
