import { useState, useCallback, useRef } from "react";
import * as api from "../lib/api";

export type VoiceStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "ai-speaking"
  | "error";

export interface VoiceMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  final: boolean;
}

const REALTIME_MODEL = "gpt-4o-realtime-preview-2024-12-17";
const SAMPLE_RATE = 24000;

// Inline AudioWorklet processor code — avoids needing a separate .js file
const WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (ch?.length) this.port.postMessage(ch.slice());
    return true;
  }
}
registerProcessor("pcm-processor", PCMProcessor);
`;

function float32ToPCM16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function pcm16Base64ToFloat32(b64: string): Float32Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
  return float32;
}

export function useVoiceChat(apiKey: string, conversationId: string | null, voice?: string) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [aiLevel, setAiLevel] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const aiGainRef = useRef<GainNode | null>(null);
  const aiAnalyserRef = useRef<AnalyserNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const rafRef = useRef(0);

  // Generation counter: incremented on every stopAll() to invalidate in-flight
  // async work from a previous startSession() call (e.g. StrictMode double-mount).
  const generationRef = useRef(0);

  // Incremental transcript buffers keyed by item_id / response_id
  const userTranscriptRef = useRef<Record<string, string>>({});
  const aiTranscriptRef = useRef<string>("");
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;

  // ── Interruption tracking ──────────────────────────────────────────────────
  // Active AudioBufferSourceNodes — so we can .stop() them on interruption
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  // The item_id of the current AI response (from response.output_item.added)
  const currentAiItemIdRef = useRef<string | null>(null);
  // AudioContext.currentTime when the first audio chunk of the current AI
  // response started playing. Used to calculate audio_end_ms for truncation.
  const aiPlaybackStartRef = useRef(0);

  const stopAll = useCallback(() => {
    // Bump generation so any in-flight startSession() becomes stale
    generationRef.current += 1;

    cancelAnimationFrame(rafRef.current);

    // Stop all active audio sources
    for (const src of activeSourcesRef.current) {
      try { src.stop(); } catch { /* already stopped */ }
    }
    activeSourcesRef.current = [];

    workletRef.current?.disconnect();
    workletRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (audioCtxRef.current?.state !== "closed") {
      audioCtxRef.current?.close();
    }
    audioCtxRef.current = null;

    wsRef.current?.close();
    wsRef.current = null;

    nextPlayTimeRef.current = 0;
    userTranscriptRef.current = {};
    aiTranscriptRef.current = "";
    currentAiItemIdRef.current = null;
    aiPlaybackStartRef.current = 0;

    setMicLevel(0);
    setAiLevel(0);
    setStatus("idle");
  }, []);

  // Stop all currently playing AI audio sources and return how many ms
  // of audio the user actually heard.
  const interruptPlayback = useCallback((): number => {
    const ctx = audioCtxRef.current;
    if (!ctx) return 0;

    const now = ctx.currentTime;

    // Calculate how much audio was actually played (heard by user)
    // aiPlaybackStartRef is set when the first chunk of a response starts.
    // If the first chunk hasn't started playing yet, audio_end_ms = 0.
    let audioEndMs = 0;
    if (aiPlaybackStartRef.current > 0 && now > aiPlaybackStartRef.current) {
      audioEndMs = Math.floor((now - aiPlaybackStartRef.current) * 1000);
    }

    // Stop all scheduled/playing sources immediately
    for (const src of activeSourcesRef.current) {
      try { src.stop(); } catch { /* already stopped */ }
    }
    activeSourcesRef.current = [];

    // Reset playback cursor so future chunks don't queue behind old ones
    nextPlayTimeRef.current = now;

    return audioEndMs;
  }, []);

  const scheduleAudioChunk = useCallback((b64: string) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const float32 = pcm16Base64ToFloat32(b64);
    if (float32.length === 0) return;

    const buffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Route through the AI gain/analyser for level metering
    if (aiGainRef.current) source.connect(aiGainRef.current);
    else source.connect(ctx.destination);

    const startAt = Math.max(ctx.currentTime + 0.02, nextPlayTimeRef.current);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;

    // Record when the first chunk of this response starts playing
    if (aiPlaybackStartRef.current === 0) {
      aiPlaybackStartRef.current = startAt;
    }

    // Track this source so we can stop it on interruption
    activeSourcesRef.current.push(source);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
    };
  }, []);

  const handleWsEvent = useCallback(
    (evt: any) => {
      switch (evt.type) {
        case "session.created":
        case "session.updated":
          setStatus("listening");
          break;

        // User speech started (VAD) — this is the interruption point.
        // Per OpenAI docs:
        // 1. Stop audio playback immediately
        // 2. Calculate how much audio was actually played
        // 3. Send conversation.item.truncate to sync server state
        // 4. Insert a placeholder user message
        case "input_audio_buffer.speech_started": {
          setStatus("listening");

          const audioEndMs = interruptPlayback();

          // Send truncation event to the server so it knows the user only
          // heard audioEndMs of the current AI response. This removes the
          // unheard portion from the server's conversation context.
          const itemId = currentAiItemIdRef.current;
          if (itemId && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: "conversation.item.truncate",
              item_id: itemId,
              content_index: 0,
              audio_end_ms: audioEndMs,
            }));
          }

          // Reset AI response tracking for the next response
          currentAiItemIdRef.current = null;
          aiPlaybackStartRef.current = 0;

          // Insert placeholder for the user's new message
          const placeholderId = evt.item_id ?? `speech-${Date.now()}`;
          setMessages((prev) => {
            const existing = prev.findIndex(
              (m) => m.id === placeholderId && m.role === "user"
            );
            if (existing >= 0) return prev;
            return [...prev, { id: placeholderId, role: "user", text: "…", final: false }];
          });
          break;
        }

        // conversation.item.created gives us the real item_id that maps to
        // the speech_started placeholder. Update the placeholder id so the
        // later transcription.completed event can find it.
        case "conversation.item.created": {
          const item = evt.item;
          if (item?.type === "message" && item?.role === "user" && item?.id) {
            setMessages((prev) => {
              // Find the most recent non-final user placeholder
              let placeholderIdx = -1;
              for (let i = prev.length - 1; i >= 0; i--) {
                if (prev[i].role === "user" && !prev[i].final) {
                  placeholderIdx = i;
                  break;
                }
              }
              if (placeholderIdx >= 0 && prev[placeholderIdx].id !== item.id) {
                return prev.map((m, i) =>
                  i === placeholderIdx ? { ...m, id: item.id } : m
                );
              }
              return prev;
            });
          }
          break;
        }

        // Track the AI response item_id so we can truncate it on interruption.
        // This fires when the server adds an output item to the response.
        case "response.output_item.added": {
          if (evt.item?.id) {
            currentAiItemIdRef.current = evt.item.id;
          }
          break;
        }

        // User transcript (from whisper transcription) — update placeholder
        case "conversation.item.input_audio_transcription.completed": {
          const itemId: string = evt.item_id ?? crypto.randomUUID();
          const text: string = evt.transcript ?? "";
          if (text.trim()) {
            setMessages((prev) => {
              // Update existing placeholder or append
              const existing = prev.findIndex(
                (m) => m.id === itemId && m.role === "user"
              );
              if (existing >= 0) {
                return prev.map((m, i) =>
                  i === existing ? { ...m, text, final: true } : m
                );
              }
              return [...prev, { id: itemId, role: "user", text, final: true }];
            });
            // Persist to backend
            if (conversationIdRef.current) {
              api.saveVoiceMessage(conversationIdRef.current, "user", text, apiKey);
            }
          } else {
            // Empty transcription — remove the placeholder
            setMessages((prev) => prev.filter((m) => !(m.id === itemId && m.role === "user" && !m.final)));
          }
          break;
        }

        // AI audio chunks — schedule for gapless playback
        case "response.audio.delta":
          setStatus("ai-speaking");
          if (evt.delta) scheduleAudioChunk(evt.delta);
          break;

        // AI transcript delta (streams text alongside audio)
        case "response.audio_transcript.delta": {
          const responseId: string = evt.response_id ?? "current";
          aiTranscriptRef.current += evt.delta ?? "";
          setMessages((prev) => {
            const existing = prev.findIndex(
              (m) => m.id === responseId && m.role === "assistant"
            );
            const text = aiTranscriptRef.current;
            if (existing >= 0) {
              return prev.map((m, i) =>
                i === existing ? { ...m, text, final: false } : m
              );
            }
            return [...prev, { id: responseId, role: "assistant", text, final: false }];
          });
          break;
        }

        // AI transcript finalised
        case "response.audio_transcript.done": {
          const responseId: string = evt.response_id ?? "current";
          const text: string = evt.transcript ?? aiTranscriptRef.current;
          aiTranscriptRef.current = "";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === responseId && m.role === "assistant"
                ? { ...m, text, final: true }
                : m
            )
          );
          // Persist to backend
          if (conversationIdRef.current && text.trim()) {
            api.saveVoiceMessage(conversationIdRef.current, "assistant", text, apiKey);
          }
          break;
        }

        case "response.done":
          setStatus("listening");
          // Reset AI response tracking — response is complete
          currentAiItemIdRef.current = null;
          aiPlaybackStartRef.current = 0;
          break;

        // Server acknowledges truncation — we can optionally update the
        // assistant message in the UI to reflect only what was heard.
        case "conversation.item.truncated":
          // Truncation succeeded — server context is now in sync.
          // The AI transcript in the UI may show more text than was heard,
          // but we mark it as final since the server has moved on.
          break;

        case "error":
          setError(evt.error?.message ?? "Realtime API error");
          setStatus("error");
          break;
      }
    },
    [apiKey, interruptPlayback, scheduleAudioChunk]
  );

  const startLevelMetering = useCallback(() => {
    const micAnalyser = micAnalyserRef.current;
    const aiAnalyser = aiAnalyserRef.current;
    if (!micAnalyser && !aiAnalyser) return;

    const buf = new Uint8Array(32);

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);

      if (micAnalyser) {
        micAnalyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        setMicLevel(Math.min(1, Math.sqrt(sum / buf.length) * 6));
      }

      if (aiAnalyser) {
        aiAnalyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        setAiLevel(Math.min(1, Math.sqrt(sum / buf.length) * 6));
      }
    };

    tick();
  }, []);

  const startSession = useCallback(async () => {
    // Clean up any existing session first
    if (wsRef.current || audioCtxRef.current) {
      stopAll();
    }

    // Capture generation at the start — if it changes during any await,
    // it means stopAll() was called and this session is stale.
    const gen = generationRef.current;

    try {
      setStatus("connecting");
      setError(null);
      setMessages([]);

      // 1. Get ephemeral token from our backend
      const { clientSecret } = await api.createVoiceSession(apiKey, voice);

      // Check if this session was cancelled while awaiting the token
      if (gen !== generationRef.current) return;

      // 2. Set up AudioContext at 24 kHz (matches OpenAI Realtime PCM format)
      const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = audioCtx;

      // Shared AI audio routing: all scheduled chunks → gain → analyser → destination
      const aiGain = audioCtx.createGain();
      const aiAnalyser = audioCtx.createAnalyser();
      aiAnalyser.fftSize = 256;
      aiGain.connect(aiAnalyser);
      aiAnalyser.connect(audioCtx.destination);
      aiGainRef.current = aiGain;
      aiAnalyserRef.current = aiAnalyser;

      // 3. Connect to OpenAI Realtime WebSocket
      //    Browser WebSockets can't set custom headers, so we use the
      //    subprotocol trick OpenAI documents for browser clients.
      const ws = new WebSocket(
        `wss://api.openai.com/v1/realtime?model=${REALTIME_MODEL}`,
        ["realtime", `openai-insecure-api-key.${clientSecret}`, "openai-beta.realtime-v1"]
      );
      wsRef.current = ws;

      ws.onopen = async () => {
        // Stale check — another session may have started
        if (gen !== generationRef.current) {
          ws.close();
          return;
        }

        // 4. Request mic access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: SAMPLE_RATE,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        // Stale check after mic permission prompt
        if (gen !== generationRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          ws.close();
          return;
        }

        streamRef.current = stream;

        // 5. Load inline AudioWorklet processor
        const blob = new Blob([WORKLET_CODE], { type: "application/javascript" });
        const workletUrl = URL.createObjectURL(blob);
        await audioCtx.audioWorklet.addModule(workletUrl);
        URL.revokeObjectURL(workletUrl);

        const source = audioCtx.createMediaStreamSource(stream);

        // Mic analyser for level metering
        const micAnalyser = audioCtx.createAnalyser();
        micAnalyser.fftSize = 256;
        source.connect(micAnalyser);
        micAnalyserRef.current = micAnalyser;

        // Worklet for PCM capture and sending
        const worklet = new AudioWorkletNode(audioCtx, "pcm-processor");
        workletRef.current = worklet;
        source.connect(worklet);

        worklet.port.onmessage = (e: MessageEvent<Float32Array>) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const b64 = float32ToPCM16Base64(e.data);
          ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: b64 }));
        };

        startLevelMetering();
      };

      ws.onmessage = (e) => {
        try {
          handleWsEvent(JSON.parse(e.data));
        } catch (err) {
          console.error("[VoiceChat] ws message error:", err);
        }
      };

      // Only call stopAll if THIS websocket is still the active one.
      // Prevents a stale ws1.onclose from tearing down a newer ws2 session.
      ws.onclose = () => {
        if (wsRef.current === ws) stopAll();
      };

      ws.onerror = () => {
        setError("WebSocket connection to OpenAI failed. Check your API key.");
        setStatus("error");
      };
    } catch (err: any) {
      if (gen !== generationRef.current) return;
      setError(err.message ?? "Failed to start voice session");
      setStatus("error");
      stopAll();
    }
  }, [apiKey, voice, handleWsEvent, scheduleAudioChunk, startLevelMetering, stopAll]);

  return {
    status,
    error,
    messages,
    micLevel,
    aiLevel,
    startSession,
    stopSession: stopAll,
  };
}
