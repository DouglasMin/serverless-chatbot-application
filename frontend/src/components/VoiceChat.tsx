import { useEffect, useRef } from "react";
import { useVoiceChat, type VoiceStatus, type VoiceMessage } from "../hooks/useVoiceChat";
import type { RealtimeVoiceId } from "@chatbot/shared";

interface Props {
  apiKey: string;
  conversationId: string;
  voice: RealtimeVoiceId;
  onClose: () => void;
}

// ── Pulse ring visualizer ─────────────────────────────────────────────────────
// Concentric rings that expand outward with audio level. Organic and alive.
function PulseVisualizer({
  level,
  active,
  label,
  color,
}: {
  level: number;
  active: boolean;
  label: string;
  color: "coral" | "teal";
}) {
  const palette =
    color === "coral"
      ? { core: "#E07A5F", glow: "#E07A5F", ring: "#E07A5F" }
      : { core: "#6DA89C", glow: "#6DA89C", ring: "#6DA89C" };

  const coreScale = 1 + level * 0.35;
  const coreOpacity = active ? 0.85 + level * 0.15 : 0.2;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
        {/* Ambient glow */}
        {active && (
          <div
            className="absolute rounded-full"
            style={{
              width: 140,
              height: 140,
              background: `radial-gradient(circle, ${palette.glow}18 0%, transparent 70%)`,
              transform: `scale(${1 + level * 0.6})`,
              transition: "transform 120ms linear",
            }}
          />
        )}

        {/* Concentric pulse rings */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 80,
              height: 80,
              left: "50%",
              top: "50%",
              marginLeft: -40,
              marginTop: -40,
              border: `1.5px solid ${palette.ring}`,
              opacity: active ? Math.max(0, 0.35 - i * 0.1) * (0.5 + level) : 0.05,
              transform: `scale(${1 + level * (0.4 + i * 0.25) + i * 0.15})`,
              transition: "transform 100ms linear, opacity 100ms linear",
            }}
          />
        ))}

        {/* Core orb */}
        <div
          className="relative rounded-full"
          style={{
            width: 56,
            height: 56,
            background: `radial-gradient(circle at 38% 35%, ${palette.core}cc, ${palette.core})`,
            opacity: coreOpacity,
            transform: `scale(${coreScale})`,
            transition: "transform 80ms linear, opacity 100ms linear",
            boxShadow: active
              ? `0 0 ${16 + level * 35}px ${palette.glow}44, 0 0 ${8 + level * 15}px ${palette.glow}22`
              : "none",
          }}
        />
      </div>

      <span className="text-[11px] font-500 uppercase tracking-[0.15em] text-surface-500">
        {label}
      </span>
    </div>
  );
}

// ── Status indicator ──────────────────────────────────────────────────────────
function StatusIndicator({ status }: { status: VoiceStatus }) {
  const cfg: Record<VoiceStatus, { color: string; label: string; pulse: boolean }> = {
    idle: { color: "bg-surface-600", label: "Idle", pulse: false },
    connecting: { color: "bg-amber-400", label: "Connecting", pulse: true },
    listening: { color: "bg-emerald-400", label: "Listening", pulse: true },
    "ai-speaking": { color: "bg-primary-400", label: "AI speaking", pulse: true },
    error: { color: "bg-red-400", label: "Error", pulse: false },
  };
  const c = cfg[status];

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${c.color} ${c.pulse ? "animate-pulse" : ""}`} />
      <span className="text-[12px] font-500 text-surface-400">{c.label}</span>
    </div>
  );
}

// ── Voice transcript bubble ───────────────────────────────────────────────────
function Bubble({ msg }: { msg: VoiceMessage }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      style={{ animation: "msg-in 0.2s ease-out both" }}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
          isUser
            ? "bg-primary-600/90 text-white"
            : "bg-surface-800/50 text-surface-200 ring-1 ring-surface-700/40"
        } ${!msg.final ? "opacity-60" : ""}`}
      >
        {msg.text}
        {!msg.final && (
          <span className="ml-1 inline-block h-3.5 w-[2px] animate-pulse bg-current opacity-60" />
        )}
      </div>
    </div>
  );
}

// ── Main VoiceChat component ──────────────────────────────────────────────────
export default function VoiceChat({ apiKey, conversationId, voice, onClose }: Props) {
  const { status, error, messages, micLevel, aiLevel, startSession, stopSession } =
    useVoiceChat(apiKey, conversationId, voice);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startSession();
    return () => stopSession();
  }, []); // intentionally run once

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleClose = () => {
    stopSession();
    onClose();
  };

  const isActive = status === "listening" || status === "ai-speaking";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-surface-950"
      style={{ animation: "fade-in 0.2s ease-out both" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600/15">
            <svg className="h-4 w-4 text-primary-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-sm font-600 text-surface-100">Voice Chat</h1>
            <StatusIndicator status={status} />
          </div>
        </div>

        <button
          onClick={handleClose}
          className="flex items-center gap-2 rounded-xl bg-surface-800/60 px-4 py-2 text-[13px] font-500 text-surface-400 transition-all duration-150 hover:bg-red-950/40 hover:text-red-400"
          title="End voice session"
        >
          End
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Visualizer */}
      <div className="flex items-center justify-center gap-20 py-10">
        <PulseVisualizer
          level={micLevel}
          active={isActive && status === "listening"}
          label="You"
          color="coral"
        />

        {status === "connecting" && (
          <div className="flex items-center justify-center">
            <div
              className="h-8 w-8 rounded-full border-2 border-surface-700 border-t-primary-500"
              style={{ animation: "spin 0.8s linear infinite" }}
            />
          </div>
        )}

        <PulseVisualizer
          level={aiLevel}
          active={status === "ai-speaking"}
          label="AI"
          color="teal"
        />
      </div>

      {/* Transcript */}
      <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-5">
        {messages.length === 0 && status !== "error" && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-surface-500">
              {status === "connecting"
                ? "Starting voice session..."
                : "Start speaking. Your conversation will appear here."}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl bg-red-950/25 px-4 py-3 text-sm text-red-400 ring-1 ring-red-900/30">
            {error}
            <button
              onClick={startSession}
              className="ml-3 font-500 underline decoration-red-400/30 underline-offset-2 transition-colors hover:text-red-300"
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

      {/* Footer */}
      <footer className="border-t border-surface-800/40 px-6 py-4 text-center">
        <p className="text-[12px] text-surface-500">
          {isActive
            ? "Speak naturally — the AI responds when you pause."
            : status === "connecting"
            ? "Requesting microphone access..."
            : "Session ended."}
        </p>
      </footer>
    </div>
  );
}
