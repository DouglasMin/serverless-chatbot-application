import { useState, useCallback, useEffect } from "react";
import type { ConversationMetadata, GptModelId } from "@chatbot/shared";
import * as api from "../lib/api";

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.listConversations();
      setConversations(res.conversations);
    } catch (err) {
      console.error("Failed to list conversations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (model: GptModelId) => {
      const res = await api.createConversation({ model });
      setConversations((prev) => [res.conversation, ...prev]);
      setActiveId(res.conversation.conversationId);
      return res.conversation;
    },
    []
  );

  const remove = useCallback(
    async (id: string) => {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.conversationId !== id));
      if (activeId === id) setActiveId(null);
    },
    [activeId]
  );

  const updateTitle = useCallback(
    (id: string, title: string) => {
      setConversations((prev) =>
        prev.map((c) => (c.conversationId === id ? { ...c, title } : c))
      );
    },
    []
  );

  return {
    conversations,
    activeId,
    setActiveId,
    loading,
    create,
    remove,
    refresh,
    updateTitle,
  };
}
