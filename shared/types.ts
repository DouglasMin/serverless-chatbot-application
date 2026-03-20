// === Models ===

export const GPT_MODELS = [
  { id: "gpt-5.4", name: "GPT 5.4", description: "General-purpose: complex reasoning, world knowledge, agentic tasks" },
  { id: "gpt-5.4-pro", name: "GPT 5.4 Pro", description: "Tough problems needing deeper reasoning" },
  { id: "gpt-5-mini", name: "GPT 5 Mini", description: "Cost-optimized reasoning and chat" },
  { id: "gpt-5-nano", name: "GPT 5 Nano", description: "High-throughput, straightforward tasks" },
] as const;

export type GptModelId = (typeof GPT_MODELS)[number]["id"];

// === Conversation ===

export interface ConversationMetadata {
  conversationId: string;
  sessionId: string;
  title: string;
  model: GptModelId;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  messageId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  source?: MessageSource;
}

export interface Conversation extends ConversationMetadata {
  messages: Message[];
}

// === API Request/Response shapes ===

export interface CreateConversationRequest {
  model: GptModelId;
}

export interface CreateConversationResponse {
  conversation: ConversationMetadata;
}

export interface ListConversationsResponse {
  conversations: ConversationMetadata[];
}

export interface GetConversationResponse {
  conversation: Conversation;
}

export interface UpdateConversationRequest {
  title?: string;
}

export interface UpdateConversationResponse {
  conversation: ConversationMetadata;
}

export interface ChatStreamRequest {
  conversationId: string;
  message: string;
}

// === Voice ===

export const REALTIME_VOICES = [
  { id: "alloy", name: "Alloy" },
  { id: "ash", name: "Ash" },
  { id: "ballad", name: "Ballad" },
  { id: "coral", name: "Coral" },
  { id: "echo", name: "Echo" },
  { id: "sage", name: "Sage" },
  { id: "shimmer", name: "Shimmer" },
  { id: "verse", name: "Verse" },
  { id: "marin", name: "Marin" },
  { id: "cedar", name: "Cedar" },
] as const;

export type RealtimeVoiceId = (typeof REALTIME_VOICES)[number]["id"];

export interface CreateVoiceSessionRequest {
  voice?: RealtimeVoiceId;
}

export interface CreateVoiceSessionResponse {
  clientSecret: string;
  sessionId: string;
}

export type MessageSource = "text" | "voice";

export interface StreamEvent {
  type: "token" | "done" | "error";
  data: string;
}

export interface ApiError {
  error: string;
  code?: string;
}
