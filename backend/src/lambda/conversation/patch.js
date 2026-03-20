import { getConversationMetadata, updateConversationMetadata } from "../libs/dynamo.js";
import { validateSessionId, SessionError } from "../libs/session.js";
import { json, error } from "../libs/response.js";
const bodySchema = {
    type: "object",
    properties: {
        title: { type: "string", description: "New title for the conversation" },
    },
    additionalProperties: false,
};
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
            },
        },
    },
    additionalProperties: true,
};
export const apiSpec = {
    category: "Conversation",
    event: [{ type: "REST", method: "PATCH", path: "/conversations/{conversationId}" }],
    summary: "Update a conversation hello this is a test",
    desc: "Updates the title of a conversation",
    disabled: false,
    requestBody: {
        required: true,
        content: { "application/json": { schema: bodySchema } },
    },
    responses: {
        200: {
            description: "Conversation updated successfully",
            content: { "application/json": { schema: responseSchema } },
        },
    },
};
export const handler = async (event) => {
    try {
        const sessionId = validateSessionId(event.headers["x-session-id"]);
        const conversationId = event.pathParameters?.conversationId;
        if (!conversationId)
            return error(400, "Missing conversationId");
        const metadata = await getConversationMetadata(conversationId);
        if (!metadata || metadata.sessionId !== sessionId) {
            return error(404, "Conversation not found");
        }
        const body = JSON.parse(event.body ?? "{}");
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
    }
    catch (err) {
        if (err instanceof SessionError)
            return error(400, err.message);
        console.error(err);
        return error(500, "Internal server error");
    }
};
