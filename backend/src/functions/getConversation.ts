import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getConversationMetadata, getConversationMessages } from "../lib/dynamo.js";
import { validateSessionId, SessionError } from "../lib/session.js";
import { json, error } from "../lib/response.js";

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
      ...(item.source ? { source: item.source } : {}),
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
