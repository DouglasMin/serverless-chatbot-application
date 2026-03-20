import type { ConversationMetadata, GptModelId } from "@chatbot/shared";

interface Props {
  conversations: ConversationMetadata[];
  activeId: string | null;
  selectedModel: GptModelId;
  onSelect: (id: string) => void;
  onCreate: (model: GptModelId) => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
}

export default function Sidebar({
  conversations,
  activeId,
  selectedModel,
  onSelect,
  onCreate,
  onDelete,
  onOpenSettings,
}: Props) {
  return (
    <aside className="flex h-full w-72 flex-col bg-surface-900/70 backdrop-blur-sm">
      {/* New Chat */}
      <div className="p-4">
        <button
          onClick={() => onCreate(selectedModel)}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-surface-700/50 px-4 py-3 text-sm font-500 text-surface-200 transition-all duration-200 hover:border-primary-500/40 hover:bg-primary-600/8 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Conversations label */}
      {conversations.length > 0 && (
        <div className="px-5 pb-2">
          <span className="text-[10px] font-500 uppercase tracking-[0.15em] text-surface-500">
            Conversations
          </span>
        </div>
      )}

      {/* Conversation list */}
      <nav className="flex-1 overflow-y-auto px-3">
        {conversations.map((conv) => {
          const isActive = activeId === conv.conversationId;
          return (
            <div
              key={conv.conversationId}
              className={`group relative mb-0.5 flex cursor-pointer items-center rounded-xl px-3 py-2.5 text-[13px] transition-all duration-150 ${
                isActive
                  ? "bg-surface-800/80 text-white"
                  : "text-surface-400 hover:bg-surface-850/60 hover:text-surface-200"
              }`}
              onClick={() => onSelect(conv.conversationId)}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-500" />
              )}

              <span className="flex-1 truncate">{conv.title}</span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.conversationId);
                }}
                className="ml-2 hidden rounded-lg p-1 text-surface-500 transition-colors hover:text-red-400 group-hover:block"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-surface-800/50 p-4">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] text-surface-400 transition-all duration-150 hover:bg-surface-850/60 hover:text-surface-200"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
      </div>
    </aside>
  );
}
