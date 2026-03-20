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
import VoiceChat from "./components/VoiceChat";

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
  const [voiceOpen, setVoiceOpen] = useState(false);

  const activeConv = conversations.find((c) => c.conversationId === activeId);

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

          {/* Voice chat shortcut in header */}
          <div className="ml-auto">
            <button
              onClick={() => setVoiceOpen(true)}
              title="Start live voice chat"
              className="flex items-center gap-1.5 rounded-lg border border-surface-700 bg-surface-850 px-3 py-1.5 text-xs font-medium text-surface-300 transition hover:border-violet-500 hover:bg-violet-600/10 hover:text-violet-300"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              Voice
            </button>
          </div>
        </header>

        {activeId ? (
          <>
            <ChatArea
              messages={messages}
              streamingContent={streamingContent}
              isStreaming={isStreaming}
              error={error}
            />
            <MessageInput
              onSend={handleSend}
              disabled={isStreaming}
              onVoice={() => setVoiceOpen(true)}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <h2 className="text-xl font-semibold text-white">No conversation selected</h2>
            <p className="text-sm text-surface-400">Create a new chat or select one from the sidebar.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleNewChat(selectedModel)}
                className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-500"
              >
                New Chat
              </button>
              <button
                onClick={() => setVoiceOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-violet-700 bg-violet-600/10 px-5 py-2.5 text-sm font-medium text-violet-300 transition hover:bg-violet-600/20"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                Live Voice Chat
              </button>
            </div>
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

      {/* Full-screen voice overlay — renders on top of everything */}
      {voiceOpen && apiKey && (
        <VoiceChat apiKey={apiKey} onClose={() => setVoiceOpen(false)} />
      )}
    </div>
  );
}
