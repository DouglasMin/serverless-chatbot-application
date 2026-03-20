import { useState, useRef, useEffect } from "react";

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
  onVoice?: () => void;
}

export default function MessageInput({ onSend, disabled, onVoice }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-4 pb-5 pt-2">
      <div className="mx-auto flex max-w-3xl items-end gap-2.5 rounded-2xl border border-surface-700/40 bg-surface-900/80 px-3 py-2.5 shadow-lg shadow-black/10 backdrop-blur-sm transition-colors focus-within:border-primary-500/30 focus-within:ring-2 focus-within:ring-primary-500/10">
        {/* Voice button */}
        {onVoice && (
          <button
            onClick={onVoice}
            disabled={disabled}
            title="Start live voice chat"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-surface-500 transition-all duration-150 hover:bg-surface-800/60 hover:text-primary-400 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </button>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent py-2 text-[14px] text-surface-100 placeholder-surface-500 outline-none disabled:opacity-40"
        />

        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition-all duration-150 hover:bg-primary-500 hover:shadow-md hover:shadow-primary-600/25 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
