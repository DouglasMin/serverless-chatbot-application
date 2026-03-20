import type {
  CreateConversationRequest,
  CreateConversationResponse,
  ListConversationsResponse,
  GetConversationResponse,
  UpdateConversationRequest,
  UpdateConversationResponse,
} from "@chatbot/shared";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const STREAM_BASE = import.meta.env.VITE_STREAM_BASE_URL ?? "";

function getSessionId(): string {
  let id = localStorage.getItem("session-id");
  if (!id) {
    id = crypto.randomUUID() + crypto.randomUUID();
    localStorage.setItem("session-id", id);
  }
  return id;
}

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-session-id": getSessionId(),
  };
}

export async function createConversation(
  body: CreateConversationRequest
): Promise<CreateConversationResponse> {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function listConversations(): Promise<ListConversationsResponse> {
  const res = await fetch(`${API_BASE}/conversations`, { headers: headers() });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function getConversation(
  id: string
): Promise<GetConversationResponse> {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function updateConversation(
  id: string,
  body: UpdateConversationRequest
): Promise<UpdateConversationResponse> {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Failed to delete conversation");
}

export async function createVoiceSession(
  apiKey: string
): Promise<{ clientSecret: string; sessionId: string }> {
  const res = await fetch(`${API_BASE}/voice/session`, {
    method: "POST",
    headers: {
      ...headers(),
      Authorization: `Bearer ${apiKey}`,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? "Failed to create voice session");
  }
  return res.json();
}

export async function* streamChat(
  conversationId: string,
  message: string,
  apiKey: string
): AsyncGenerator<{ type: string; data: string }> {
  const res = await fetch(`${STREAM_BASE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "x-session-id": getSessionId(),
    },
    body: JSON.stringify({ conversationId, message }),
  });

  if (!res.ok || !res.body) {
    throw new Error("Stream request failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          yield JSON.parse(line.slice(6));
        } catch {
          // skip malformed lines
        }
      }
    }
  }
}
