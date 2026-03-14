import { json, error } from "../lib/response.js";
import { validateSessionId, SessionError } from "../lib/session.js";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import type { CreateVoiceSessionRequest } from "../../../shared/types.js";

const VALID_VOICES = ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"];

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const rawHeaders = event.headers ?? {};
    const headers = Object.fromEntries(
      Object.entries(rawHeaders).map(([k, v]) => [k.toLowerCase(), v])
    );

    validateSessionId(headers["x-session-id"]);

    const apiKey = (headers["authorization"] ?? "").replace(/^Bearer\s+/i, "");
    if (!apiKey || !apiKey.startsWith("sk-")) {
      return error(401, "Invalid or missing API key");
    }

    const body: CreateVoiceSessionRequest = JSON.parse(event.body ?? "{}");
    const voice = body.voice && VALID_VOICES.includes(body.voice) ? body.voice : "alloy";

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice,
        modalities: ["audio", "text"],
        instructions:
          "You are a helpful, friendly AI assistant. Keep your spoken responses conversational, concise, and natural. Avoid bullet points or markdown in speech.",
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 600,
        },
        input_audio_transcription: {
          model: "whisper-1",
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return error(
        response.status,
        (errBody as any).error?.message ?? "Failed to create voice session"
      );
    }

    const session = await response.json();
    return json(200, {
      clientSecret: (session as any).client_secret.value,
      sessionId: (session as any).id,
    });
  } catch (err: any) {
    if (err instanceof SessionError) return error(400, err.message);
    console.error("createVoiceSession error:", err);
    return error(500, "Failed to create voice session");
  }
};
