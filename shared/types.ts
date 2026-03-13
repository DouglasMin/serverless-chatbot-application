// === Models ===

export const GPT_MODELS = [
  { id: "gpt-5.4", name: "GPT 5.4", description: "Most capable flagship model" },
  { id: "gpt-5.4-pro", name: "GPT 5.4 Pro", description: "Deeper reasoning for difficult problems" },
  { id: "gpt-5-mini", name: "GPT 5 Mini", description: "Cost-optimized, balanced speed and capability" },
  { id: "gpt-5-nano", name: "GPT 5 Nano", description: "High-throughput for straightforward tasks" },
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

export interface StreamEvent {
  type: "token" | "done" | "error";
  data: string;
}

export interface ApiError {
  error: string;
  code?: string;
}
