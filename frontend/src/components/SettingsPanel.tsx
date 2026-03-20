interface Props {
  apiKey: string;
  onChangeKey: () => void;
  onClose: () => void;
}

export default function SettingsPanel({ apiKey, onChangeKey, onClose }: Props) {
  const masked = apiKey.slice(0, 7) + "..." + apiKey.slice(-4);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      style={{ animation: "fade-in 0.15s ease-out both" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-surface-800/60 bg-surface-900 p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slide-up 0.2s ease-out both" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-600 text-surface-100">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-surface-500 transition-colors hover:bg-surface-800 hover:text-surface-200"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div>
          <label className="mb-2 block text-xs font-500 uppercase tracking-widest text-surface-500">
            OpenAI API Key
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-surface-850 px-3 py-2.5 font-mono text-sm text-surface-400">
              {masked}
            </code>
            <button
              onClick={onChangeKey}
              className="rounded-lg bg-surface-800 px-4 py-2.5 text-sm font-500 text-surface-300 transition-colors hover:bg-surface-700 hover:text-white"
            >
              Change
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
