import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ulid } from "ulidx";
import { getConversationMetadata, putItem, convPK, updateConversationMetadata } from "../lib/dynamo.js";
import { validateSessionId, SessionError } from "../lib/session.js";
import { json, error } from "../lib/response.js";

const VALID_ROLES = ["user", "assistant"];
const VALID_SOURCES = ["voice", "transcript", "system"];
const MAX_CONTENT_LENGTH = 4000;
const MAX_TITLE_LENGTH = 45;

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

    if (!role || typeof content !== "string" || !VALID_ROLES.includes(role)) {
      return error(400, "Missing or invalid role/content");
    }

    const normalizedContent = content.trim();
    if (!normalizedContent || normalizedContent.length > MAX_CONTENT_LENGTH) {
      return error(400, `content must be 1-${MAX_CONTENT_LENGTH} characters`);
    }

    const normalizedSource = typeof source === "string" ? source.trim().toLowerCase() : "voice";
    if (!VALID_SOURCES.includes(normalizedSource)) {
      return error(400, "Invalid source");
    }

    const messageId = ulid();
    const now = new Date().toISOString();

    await putItem({
      PK: convPK(conversationId),
      SK: `MSG#${messageId}`,
      role,
      content: normalizedContent,
      source: normalizedSource,
      createdAt: now,
    });

    if (role === "user" && metadata.title === "New conversation") {
      const titleSeed = normalizedContent.replace(/\s+/g, " ").replace(/[\r\n\t]+/g, " ");
      const autoTitle = `🎙 ${titleSeed.slice(0, MAX_TITLE_LENGTH)}${titleSeed.length > MAX_TITLE_LENGTH ? "..." : ""}`;
      await updateConversationMetadata(conversationId, {
        title: autoTitle,
        updatedAt: now,
      });
    }

    return json(201, { messageId, createdAt: now });
  } catch (err) {
    if (err instanceof SessionError) return error(400, err.message);
    console.error("saveVoiceMessage error");
    return error(500, "Internal server error");
  }
};
