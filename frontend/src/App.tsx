import { useState, useCallback, useEffect } from "react";
import type { GptModelId } from "@chatbot/shared";
import { useApiKey } from "./hooks/useApiKey";
import { useConversations } from "./hooks/useConversations";
import { useChat } from "./hooks/useChat";
import ApiKeySetup from "./components/ApiKeySetup";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import MessageInput from "./components/MessageInput";
import ModelSelector from "./components/ModelSelector";
import SettingsPanel from "./components/SettingsPanel";

export default function App() {
  const { apiKey, setApiKey, clearApiKey, hasApiKey } = useApiKey();
  const {
    conversations,
    activeId,
    setActiveId,
    create,
    remove,
    updateTitle,
  } = useConversations();
  const {
    messages,
    streamingContent,
    isStreaming,
    error,
    loadConversation,
    clearMessages,
    sendMessage,
  } = useChat();

  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GptModelId>("gpt-5.4");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeConv = conversations.find((c) => c.conversationId === activeId);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (activeId) {
      loadConversation(activeId);
    } else {
      clearMessages();
    }
  }, [activeId, loadConversation, clearMessages]);

  const handleNewChat = useCallback(
    async (model: GptModelId) => {
      setSelectedModel(model);
      await create(model);
    },
    [create]
  );

  const handleSend = useCallback(
    async (content: string) => {
      if (!apiKey || !activeId) return;
      await sendMessage(activeId, content, apiKey, (title) => {
        updateTitle(activeId, title);
      });
    },
    [apiKey, activeId, sendMessage, updateTitle]
  );

  const handleChangeKey = useCallback(() => {
    clearApiKey();
    setShowSettings(false);
  }, [clearApiKey]);

  if (!hasApiKey) {
    return <ApiKeySetup onSubmit={setApiKey} />;
  }

  return (
    <div className="flex h-dvh bg-surface-950 text-white">
      {sidebarOpen && (
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          selectedModel={selectedModel}
          onSelect={setActiveId}
          onCreate={handleNewChat}
          onDelete={remove}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      <main className="flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-surface-800 px-4 py-2.5">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-surface-400 transition hover:bg-surface-800 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {activeConv && (
            <>
              <span className="text-sm font-medium text-white truncate">
                {activeConv.title}
              </span>
              <ModelSelector
                value={activeConv.model as GptModelId}
                onChange={() => {}}
                disabled
              />
            </>
          )}

          {!activeId && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-surface-400">Model:</span>
              <ModelSelector value={selectedModel} onChange={setSelectedModel} />
            </div>
          )}
        </header>

        {activeId ? (
          <>
            <ChatArea
              messages={messages}
              streamingContent={streamingContent}
              isStreaming={isStreaming}
              error={error}
            />
            <MessageInput onSend={handleSend} disabled={isStreaming} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <h2 className="text-xl font-semibold text-white">No conversation selected</h2>
            <p className="text-sm text-surface-400">Create a new chat or select one from the sidebar.</p>
            <button
              onClick={() => handleNewChat(selectedModel)}
              className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-500"
            >
              New Chat
            </button>
          </div>
        )}
      </main>

      {showSettings && apiKey && (
        <SettingsPanel
          apiKey={apiKey}
          onChangeKey={handleChangeKey}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
