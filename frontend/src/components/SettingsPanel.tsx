interface Props {
  apiKey: string;
  onChangeKey: () => void;
  onClose: () => void;
}

export default function SettingsPanel({ apiKey, onChangeKey, onClose }: Props) {
  const masked = apiKey.slice(0, 7) + "..." + apiKey.slice(-4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-surface-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-surface-400 transition hover:bg-surface-800 hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-surface-300">
              OpenAI API Key
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-surface-850 px-3 py-2 text-sm text-surface-300">
                {masked}
              </code>
              <button
                onClick={onChangeKey}
                className="rounded-lg bg-surface-800 px-3 py-2 text-sm text-surface-300 transition hover:bg-surface-700 hover:text-white"
              >
                Change
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
