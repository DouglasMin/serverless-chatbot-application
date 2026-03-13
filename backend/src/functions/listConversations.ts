import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { listConversationsBySession } from "../lib/dynamo.js";
import { validateSessionId, SessionError } from "../lib/session.js";
import { json, error } from "../lib/response.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const sessionId = validateSessionId(event.headers["x-session-id"]);
    const items = await listConversationsBySession(sessionId);

    const conversations = items.map((item) => ({
      conversationId: item.PK.replace("CONV#", ""),
      sessionId: item.sessionId,
      title: item.title,
      model: item.model,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return json(200, { conversations });
  } catch (err) {
    if (err instanceof SessionError) return error(400, err.message);
    console.error(err);
    return error(500, "Internal server error");
  }
};
