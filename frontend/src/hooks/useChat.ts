import { useState, useCallback, useRef } from "react";
import type { Message } from "@chatbot/shared";
import * as api from "../lib/api";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const loadConversation = useCallback(async (conversationId: string) => {
    setError(null);
    setStreamingContent("");
    try {
      const res = await api.getConversation(conversationId);
      setMessages(res.conversation.messages);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingContent("");
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (
      conversationId: string,
      content: string,
      apiKey: string,
      onTitleUpdate?: (title: string) => void
    ) => {
      setError(null);
      setIsStreaming(true);
      abortRef.current = false;

      const isFirstMessage = messages.length === 0;

      const userMsg: Message = {
        messageId: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      let fullResponse = "";
      setStreamingContent("");

      try {
        for await (const event of api.streamChat(conversationId, content, apiKey)) {
          if (abortRef.current) break;

          if (event.type === "token") {
            fullResponse += event.data;
            setStreamingContent(fullResponse);
          } else if (event.type === "error") {
            setError(event.data);
            break;
          } else if (event.type === "done") {
            break;
          }
        }

        if (fullResponse) {
          const assistantMsg: Message = {
            messageId: crypto.randomUUID(),
            role: "assistant",
            content: fullResponse,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);

          if (isFirstMessage && onTitleUpdate) {
            const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
            onTitleUpdate(title);
          }
        }
      } catch (err: any) {
        setError(err.message ?? "Failed to send message");
      } finally {
        setStreamingContent("");
        setIsStreaming(false);
      }
    },
    [messages.length]
  );

  return {
    messages,
    streamingContent,
    isStreaming,
    error,
    loadConversation,
    clearMessages,
    sendMessage,
  };
}
