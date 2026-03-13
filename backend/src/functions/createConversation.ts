import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ulid } from "ulidx";
import { putItem, convPK } from "../lib/dynamo.js";
import { validateSessionId, SessionError } from "../lib/session.js";
import { json, error } from "../lib/response.js";
import type { CreateConversationRequest } from "../../../shared/types.js";

const VALID_MODELS = ["gpt-5.4", "gpt-5.4-pro", "gpt-5-mini", "gpt-5-nano"];

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
