import { ulid } from "ulidx";
import {
  getConversationMetadata,
  getConversationMessages,
  putItem,
  convPK,
  updateConversationMetadata,
} from "../lib/dynamo.js";
import { createOpenAIClient } from "../lib/openai.js";
import { buildPromptMessages } from "../lib/summarizer.js";
import { validateSessionId, SessionError } from "../lib/session.js";
import type { ChatStreamRequest } from "../../../shared/types.js";

const handler = awslambda.streamifyResponse(
  async (event: { headers: Record<string, string>; body: string }, responseStream: any) => {
    responseStream.setContentType("text/event-stream");

    const write = (data: { type: string; data: string }) => {
      responseStream.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const headers = Object.fromEntries(
        Object.entries(event.headers).map(([k, v]) => [k.toLowerCase(), v])
      );
      const authHeader = headers["authorization"] ?? "";
      const apiKey = authHeader.replace(/^Bearer\s+/i, "");

      if (!apiKey || !apiKey.startsWith("sk-")) {
        write({ type: "error", data: "Invalid or missing API key" });
        responseStream.end();
        return;
      }

      const sessionId = validateSessionId(headers["x-session-id"]);

      const body: ChatStreamRequest = JSON.parse(event.body ?? "{}");
      if (!body.conversationId || !body.message) {
        write({ type: "error", data: "Missing conversationId or message" });
        responseStream.end();
        return;
      }

      const convMeta = await getConversationMetadata(body.conversationId);
      if (!convMeta || convMeta.sessionId !== sessionId) {
        write({ type: "error", data: "Conversation not found" });
        responseStream.end();
        return;
      }

      const userMessageId = ulid();
      const now = new Date().toISOString();
      await putItem({
        PK: convPK(body.conversationId),
        SK: `MSG#${userMessageId}`,
        role: "user",
        content: body.message,
        createdAt: now,
      });

      const allMessages = await getConversationMessages(body.conversationId);
      const openai = createOpenAIClient(apiKey);
      const { promptMessages, newSummary } = await buildPromptMessages(
        openai,
        convMeta.model,
        allMessages,
        convMeta.summaryContext
      );

      promptMessages.push({ role: "user", content: body.message });

      const stream = await openai.chat.completions.create({
        model: convMeta.model,
        messages: promptMessages,
        stream: true,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          write({ type: "token", data: content });
        }
      }

      const assistantMessageId = ulid();
      await putItem({
        PK: convPK(body.conversationId),
        SK: `MSG#${assistantMessageId}`,
        role: "assistant",
        content: fullResponse,
        createdAt: new Date().toISOString(),
      });

      if (allMessages.length === 1) {
        const autoTitle = body.message.slice(0, 50) + (body.message.length > 50 ? "..." : "");
        await updateConversationMetadata(body.conversationId, {
          title: autoTitle,
          updatedAt: new Date().toISOString(),
        });
      }

      if (newSummary) {
        await updateConversationMetadata(body.conversationId, {
          summaryContext: newSummary,
          updatedAt: new Date().toISOString(),
        });
      }

      write({ type: "done", data: "" });
    } catch (err: any) {
      console.error("chatStream error:", err);

      if (err instanceof SessionError) {
        write({ type: "error", data: err.message });
      } else if (err?.status === 401) {
        write({ type: "error", data: "Invalid API key" });
      } else if (err?.status === 429) {
        write({ type: "error", data: "Rate limited. Please wait and try again." });
      } else {
        write({ type: "error", data: "An error occurred while streaming the response" });
      }
    } finally {
      responseStream.end();
    }
  }
);

export { handler };
