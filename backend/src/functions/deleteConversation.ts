import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getConversationMetadata, deleteConversation } from "../lib/dynamo.js";
import { validateSessionId, SessionError } from "../lib/session.js";
import { error } from "../lib/response.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const sessionId = validateSessionId(event.headers["x-session-id"]);
    const conversationId = event.pathParameters?.conversationId;

    if (!conversationId) return error(400, "Missing conversationId");

    const metadata = await getConversationMetadata(conversationId);
    if (!metadata || metadata.sessionId !== sessionId) {
      return error(404, "Conversation not found");
    }

    await deleteConversation(conversationId);

    return { statusCode: 204, body: "" };
  } catch (err) {
    if (err instanceof SessionError) return error(400, err.message);
    console.error(err);
    return error(500, "Internal server error");
  }
};
