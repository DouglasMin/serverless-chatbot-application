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
