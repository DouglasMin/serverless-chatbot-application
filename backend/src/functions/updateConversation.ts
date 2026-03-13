import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getConversationMetadata, updateConversationMetadata } from "../lib/dynamo.js";
import { validateSessionId, SessionError } from "../lib/session.js";
import { json, error } from "../lib/response.js";
import type { UpdateConversationRequest } from "../../../shared/types.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const sessionId = validateSessionId(event.headers["x-session-id"]);
    const conversationId = event.pathParameters?.conversationId;

    if (!conversationId) return error(400, "Missing conversationId");

    const metadata = await getConversationMetadata(conversationId);
    if (!metadata || metadata.sessionId !== sessionId) {
      return error(404, "Conversation not found");
    }

    const body: UpdateConversationRequest = JSON.parse(event.body ?? "{}");
    const now = new Date().toISOString();

    await updateConversationMetadata(conversationId, {
      ...(body.title && { title: body.title }),
      updatedAt: now,
    });

    return json(200, {
      conversation: {
        conversationId,
        sessionId: metadata.sessionId,
        title: body.title ?? metadata.title,
        model: metadata.model,
        createdAt: metadata.createdAt,
        updatedAt: now,
      },
    });
  } catch (err) {
    if (err instanceof SessionError) return error(400, err.message);
    console.error(err);
    return error(500, "Internal server error");
  }
};
