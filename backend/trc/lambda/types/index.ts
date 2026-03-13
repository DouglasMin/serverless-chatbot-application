// API request types (inlined from shared/types.ts for tsc rootDir compatibility)
export interface CreateConversationRequest {
  model: string;
}

export interface UpdateConversationRequest {
  title?: string;
}

export interface ChatStreamRequest {
  conversationId: string;
  message: string;
}

export interface ConversationItem {
  PK: string;
  SK: "METADATA";
  sessionId: string;
  title: string;
  model: string;
  summaryContext: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageItem {
  PK: string;
  SK: string; // MSG#<ulid>
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  partial?: boolean;
}
