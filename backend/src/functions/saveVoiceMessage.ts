import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ulid } from "ulidx";
import { getConversationMetadata, putItem, convPK, updateConversationMetadata } from "../lib/dynamo.js";
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

    const body = JSON.parse(event.body ?? "{}");
    const { role, content, source } = body;

    if (!role || !content || !["user", "assistant"].includes(role)) {
      return error(400, "Missing or invalid role/content");
    }

    const messageId = ulid();
    const now = new Date().toISOString();

    await putItem({
      PK: convPK(conversationId),
      SK: `MSG#${messageId}`,
      role,
      content,
      source: source ?? "voice",
      createdAt: now,
    });

    // Auto-title on first user message
    if (role === "user" && metadata.title === "New conversation") {
      const autoTitle = `🎙 ${content.slice(0, 45)}${content.length > 45 ? "..." : ""}`;
      await updateConversationMetadata(conversationId, {
        title: autoTitle,
        updatedAt: now,
      });
    }

    return json(201, { messageId, createdAt: now });
  } catch (err) {
    if (err instanceof SessionError) return error(400, err.message);
    console.error(err);
    return error(500, "Internal server error");
  }
};
