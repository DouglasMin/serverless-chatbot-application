import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getConversationMetadata, deleteConversation } from "../libs/dynamo.js";
import { validateSessionId, SessionError } from "../libs/session.js";
import { error } from "../libs/response.js";

export const apiSpec = {
  category: "Conversation",
  event: [{ type: "REST", method: "DELETE", path: "/conversations/{conversationId}" }],
  summary: "Delete a conversation",
  desc: "Deletes a conversation and all its messages",
  disabled: false,
  responses: {
    204: {
      description: "Conversation deleted successfully",
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

    await deleteConversation(conversationId);

    return { statusCode: 204, body: "" };
  } catch (err) {
    if (err instanceof SessionError) return error(400, err.message);
    console.error(err);
    return error(500, "Internal server error");
  }
};
