import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ulid } from "ulidx";
import { putItem, convPK } from "../libs/dynamo.js";
import { validateSessionId, SessionError } from "../libs/session.js";
import { json, error } from "../libs/response.js";
import type { CreateConversationRequest } from "../types/index.js";

const VALID_MODELS = ["gpt-5.4", "gpt-5.4-pro", "gpt-5-mini", "gpt-5-nano"];

const bodySchema = {
  type: "object",
  properties: {
    model: { type: "string", description: "GPT model ID to use for the conversation" },
  },
  required: ["model"],
  additionalProperties: false,
} as const;

const responseSchema = {
  type: "object",
  properties: {
    conversation: {
      type: "object",
      properties: {
        conversationId: { type: "string" },
        sessionId: { type: "string" },
        title: { type: "string" },
        model: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
    },
  },
  additionalProperties: true,
};

export const apiSpec = {
  category: "Conversations",
  event: [{ type: "REST", method: "POST", path: "/conversations" }],
  summary: "Create a new conversation",
  desc: "Creates a new conversation with the specified GPT model",
  disabled: false,
  requestBody: {
    required: true,
    content: { "application/json": { schema: bodySchema } },
  },
  responses: {
    201: {
      description: "Conversation created successfully",
      content: { "application/json": { schema: responseSchema } },
    },
  },
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const sessionId = validateSessionId(event.headers["x-session-id"]);
    const body: CreateConversationRequest = JSON.parse(event.body ?? "{}");

    if (!body.model || !VALID_MODELS.includes(body.model)) {
      return error(400, "Invalid or missing model");
    }

    const conversationId = ulid();
    const now = new Date().toISOString();

    await putItem({
      PK: convPK(conversationId),
      SK: "METADATA",
      sessionId,
      title: "New conversation",
      model: body.model,
      summaryContext: null,
      createdAt: now,
      updatedAt: now,
    });

    return json(201, {
      conversation: {
        conversationId,
        sessionId,
        title: "New conversation",
        model: body.model,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (err) {
    if (err instanceof SessionError) return error(400, err.message);
    console.error(err);
    return error(500, "Internal server error");
  }
};
