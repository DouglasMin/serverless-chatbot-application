import type { ConversationMetadata, GptModelId } from "@chatbot/shared";

interface Props {
  conversations: ConversationMetadata[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (model: GptModelId) => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onOpenSettings,
}: Props) {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-surface-800 bg-surface-900">
      <div className="p-3">
        <button
          onClick={() => onCreate("gpt-5.4")}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-surface-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-surface-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        {conversations.map((conv) => (
          <div
            key={conv.conversationId}
            className={`group relative mb-0.5 flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm transition ${
              activeId === conv.conversationId
                ? "bg-surface-800 text-white"
                : "text-surface-300 hover:bg-surface-850 hover:text-white"
            }`}
            onClick={() => onSelect(conv.conversationId)}
          >
            <span className="flex-1 truncate">{conv.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv.conversationId);
              }}
              className="ml-2 hidden rounded p-1 text-surface-500 transition hover:bg-surface-700 hover:text-red-400 group-hover:block"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </nav>

      <div className="border-t border-surface-800 p-3">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-300 transition hover:bg-surface-850 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
      </div>
    </aside>
  );
}
