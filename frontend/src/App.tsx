import { useState, useCallback, useEffect } from "react";
import type { GptModelId, RealtimeVoiceId } from "@chatbot/shared";
import { REALTIME_VOICES } from "@chatbot/shared";
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
    refresh,
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
  const [voiceConvId, setVoiceConvId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<RealtimeVoiceId>("alloy");

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

  const handleStartVoice = useCallback(async () => {
    const conv = await create(selectedModel);
    if (conv) {
      setVoiceConvId(conv.conversationId);
    }
  }, [create, selectedModel]);

  const handleCloseVoice = useCallback(() => {
    setVoiceConvId(null);
    refresh();
  }, [refresh]);

  const handleChangeKey = useCallback(() => {
    clearApiKey();
    setShowSettings(false);
  }, [clearApiKey]);

  if (!hasApiKey) {
    return <ApiKeySetup onSubmit={setApiKey} />;
  }

  return (
    <div className="flex h-dvh bg-surface-950 text-surface-100">
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
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-surface-800/40 px-5 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-surface-500 transition-colors duration-150 hover:text-surface-200"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>

          {activeConv && (
            <>
              <span className="font-display text-sm font-500 text-surface-200 truncate">
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
            <div className="flex items-center gap-2.5">
              <span className="text-[12px] font-500 uppercase tracking-wider text-surface-500">Model</span>
              <ModelSelector value={selectedModel} onChange={setSelectedModel} />
            </div>
          )}

          {/* Voice controls */}
          <div className="ml-auto flex items-center gap-2">
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value as RealtimeVoiceId)}
              className="rounded-lg border border-surface-700/40 bg-surface-900/60 px-2.5 py-1.5 text-[12px] text-surface-400 outline-none transition-colors focus:border-primary-500/40"
            >
              {REALTIME_VOICES.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <button
              onClick={handleStartVoice}
              title="Start live voice chat"
              className="flex items-center gap-1.5 rounded-lg border border-surface-700/40 bg-surface-900/60 px-3 py-1.5 text-[12px] font-500 text-surface-400 transition-all duration-150 hover:border-primary-500/40 hover:text-primary-400"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              Voice
            </button>
          </div>
        </header>

        {/* Content */}
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
              onVoice={handleStartVoice}
            />
          </>
        ) : (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-5"
            style={{ animation: "fade-in 0.4s ease-out both" }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-800/40">
              <svg className="h-7 w-7 text-surface-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <div className="text-center">
              <h2 className="mb-1 font-display text-xl font-600 text-surface-200">
                What can I help with?
              </h2>
              <p className="text-sm text-surface-500">Start a new chat or pick up where you left off.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleNewChat(selectedModel)}
                className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-500 text-white transition-all duration-150 hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-600/20"
              >
                New Chat
              </button>
              <button
                onClick={handleStartVoice}
                className="flex items-center gap-2 rounded-xl border border-primary-600/30 bg-primary-600/8 px-6 py-2.5 text-sm font-500 text-primary-400 transition-all duration-150 hover:bg-primary-600/15"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                Voice Chat
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

      {voiceConvId && apiKey && (
        <VoiceChat
          apiKey={apiKey}
          conversationId={voiceConvId}
          voice={selectedVoice}
          onClose={handleCloseVoice}
        />
      )}
    </div>
  );
}
