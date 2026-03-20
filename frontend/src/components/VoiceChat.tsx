import { useEffect, useRef } from "react";
import { useVoiceChat, type VoiceStatus, type VoiceMessage } from "../hooks/useVoiceChat";

interface Props {
  apiKey: string;
  onClose: () => void;
}

// ── Animated orb that pulses with audio level ────────────────────────────────
function AudioOrb({
  level,
  active,
  label,
  color,
}: {
  level: number;
  active: boolean;
  label: string;
  color: "blue" | "violet";
}) {
  const scale = 1 + level * 0.45;
  const opacity = active ? 0.85 + level * 0.15 : 0.3;
  const ringScale = 1 + level * 0.8;

  const baseColor =
    color === "blue"
      ? { orb: "#3b82f6", ring: "#93c5fd" }
      : { orb: "#8b5cf6", ring: "#c4b5fd" };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
        {/* Outer ring pulse */}
        <div
          className="absolute rounded-full transition-all"
          style={{
            width: 96,
            height: 96,
            background: baseColor.ring,
            opacity: active ? level * 0.35 : 0,
            transform: `scale(${ringScale})`,
            transition: "transform 80ms linear, opacity 80ms linear",
          }}
        />
        {/* Core orb */}
        <div
          className="relative rounded-full"
          style={{
            width: 64,
            height: 64,
            background: `radial-gradient(circle at 35% 35%, ${baseColor.ring}, ${baseColor.orb})`,
            opacity,
            transform: `scale(${scale})`,
            transition: "transform 80ms linear, opacity 80ms linear",
            boxShadow: active
              ? `0 0 ${20 + level * 30}px ${baseColor.orb}88`
              : "none",
          }}
        />
      </div>
      <span className="text-xs font-medium text-surface-400">{label}</span>
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: VoiceStatus }) {
  const cfg: Record<VoiceStatus, { dot: string; text: string; label: string }> = {
    idle: { dot: "bg-surface-500", text: "text-surface-400", label: "Idle" },
    connecting: {
      dot: "bg-yellow-400 animate-pulse",
      text: "text-yellow-300",
      label: "Connecting…",
    },
    listening: {
      dot: "bg-green-400 animate-pulse",
      text: "text-green-300",
      label: "Listening",
    },
    "ai-speaking": {
      dot: "bg-violet-400 animate-pulse",
      text: "text-violet-300",
      label: "AI is speaking",
    },
    error: { dot: "bg-red-400", text: "text-red-300", label: "Error" },
  };
  const c = cfg[status];
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${c.dot}`} />
      <span className={`text-sm font-medium ${c.text}`}>{c.label}</span>
    </div>
  );
}

// ── Single transcript bubble ──────────────────────────────────────────────────
function Bubble({ msg }: { msg: VoiceMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary-600 text-white"
            : "bg-surface-800 text-surface-100"
        } ${!msg.final ? "opacity-70" : ""}`}
      >
        {msg.text}
        {!msg.final && (
          <span className="ml-1 inline-block h-3 w-0.5 animate-pulse bg-current opacity-70" />
        )}
      </div>
    </div>
  );
}

// ── Main VoiceChat component ──────────────────────────────────────────────────
export default function VoiceChat({ apiKey, onClose }: Props) {
  const { status, error, messages, micLevel, aiLevel, startSession, stopSession } =
    useVoiceChat(apiKey);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-start the session when the component mounts
  useEffect(() => {
    startSession();
    return () => stopSession();
  }, []); // intentionally run once

  // Scroll transcript to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleClose = () => {
    stopSession();
    onClose();
  };

  const isActive = status === "listening" || status === "ai-speaking";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-surface-800 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">Live Voice Chat</span>
          <StatusBadge status={status} />
        </div>
        <button
          onClick={handleClose}
          className="rounded-lg p-1.5 text-surface-400 transition hover:bg-surface-800 hover:text-white"
          title="End voice session"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Orb visualiser */}
      <div className="flex items-center justify-center gap-16 py-8">
        <AudioOrb
          level={micLevel}
          active={isActive && status === "listening"}
          label="You"
          color="blue"
        />
        {/* Connecting / idle spinner */}
        {status === "connecting" && (
          <div className="flex h-8 w-8 items-center justify-center">
            <svg
              className="h-6 w-6 animate-spin text-surface-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
          </div>
        )}
        <AudioOrb
          level={aiLevel}
          active={status === "ai-speaking"}
          label="AI"
          color="violet"
        />
      </div>

      {/* Transcript area */}
      <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4">
        {messages.length === 0 && status !== "error" && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-surface-400">
              {status === "connecting"
                ? "Starting voice session…"
                : "Start speaking — conversation will appear here."}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
            <button
              onClick={startSession}
              className="ml-3 underline opacity-80 hover:opacity-100"
            >
              Retry
            </button>
          </div>
        )}

        <div className="space-y-3 py-4">
          {messages.map((msg) => (
            <Bubble key={`${msg.id}-${msg.role}`} msg={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Footer hint */}
      <footer className="border-t border-surface-800 px-5 py-3 text-center">
        <p className="text-xs text-surface-500">
          {isActive
            ? "Speak naturally — the AI will respond as soon as you pause."
            : status === "connecting"
            ? "Requesting microphone access…"
            : "Voice session ended."}
        </p>
      </footer>
    </div>
  );
}
