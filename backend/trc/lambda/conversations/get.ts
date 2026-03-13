import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { listConversationsBySession } from "../libs/dynamo.js";
import { validateSessionId, SessionError } from "../libs/session.js";
import { json, error } from "../libs/response.js";

const responseSchema = {
  type: "object",
  properties: {
    conversations: {
      type: "array",
      items: {
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
  },
  additionalProperties: true,
};

export const apiSpec = {
  category: "Conversations",
  event: [{ type: "REST", method: "GET", path: "/conversations" }],
  summary: "List all conversations",
  desc: "Lists all conversations for the current session",
  disabled: false,
  responses: {
    200: {
      description: "Successfully retrieved conversations",
      content: { "application/json": { schema: responseSchema } },
    },
  },
};

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
