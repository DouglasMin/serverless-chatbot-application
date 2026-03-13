import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getConversationMetadata, getConversationMessages } from "../libs/dynamo.js";
import { validateSessionId, SessionError } from "../libs/session.js";
import { json, error } from "../libs/response.js";

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
        messages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              messageId: { type: "string" },
              role: { type: "string" },
              content: { type: "string" },
              createdAt: { type: "string" },
            },
          },
        },
      },
    },
  },
  additionalProperties: true,
};

export const apiSpec = {
  category: "Conversation",
  event: [{ type: "REST", method: "GET", path: "/conversations/{conversationId}" }],
  summary: "Get a conversation with messages",
  desc: "Retrieves a single conversation with all its messages",
  disabled: false,
  responses: {
    200: {
      description: "Successfully retrieved conversation",
      content: { "application/json": { schema: responseSchema } },
    },
  },
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const sessionId = validateSessionId(event.headers["x-session-id"]);
    const conversationId = event.pathParameters?.conversationId;

    if (!conversationId) return error(400, "Missing conversationId");

    const metadata = await getConversationMetadata(conversationId);
    if (!metadata || metadata.sessionId !== sessionId) {
      return error(404, "Conversation not found");
    }

    const messageItems = await getConversationMessages(conversationId);
    const messages = messageItems.map((item) => ({
      messageId: item.SK.replace("MSG#", ""),
      role: item.role,
      content: item.content,
      createdAt: item.createdAt,
    }));

    return json(200, {
      conversation: {
        conversationId,
        sessionId: metadata.sessionId,
        title: metadata.title,
        model: metadata.model,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
        messages,
      },
    });
  } catch (err) {
    if (err instanceof SessionError) return error(400, err.message);
    console.error(err);
    return error(500, "Internal server error");
  }
};
