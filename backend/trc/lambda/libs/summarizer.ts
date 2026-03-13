import type OpenAI from "openai";
import type { MessageItem } from "../types/index.js";

const MAX_RECENT_TURNS = 3;
const CONTEXT_TOKEN_LIMIT = 4000;

interface Turn {
  user: MessageItem;
  assistant: MessageItem | null;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function groupIntoTurns(messages: MessageItem[]): Turn[] {
  const turns: Turn[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "user") {
      const next = messages[i + 1];
      turns.push({
        user: msg,
        assistant: next?.role === "assistant" ? next : null,
      });
      if (next?.role === "assistant") i++;
    }
  }
  return turns;
}

export async function buildPromptMessages(
  openai: OpenAI,
  model: string,
  messages: MessageItem[],
  existingSummary: string | null
): Promise<{
  promptMessages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  newSummary: string | null;
}> {
  const systemMsg = { role: "system" as const, content: "You are a helpful assistant." };

  if (messages.length === 0) {
    return { promptMessages: [systemMsg], newSummary: null };
  }

  const turns = groupIntoTurns(messages);
  const recentTurns = turns.slice(-MAX_RECENT_TURNS);
  const olderTurns = turns.slice(0, -MAX_RECENT_TURNS);

  let olderTokens = 0;
  for (const turn of olderTurns) {
    olderTokens += estimateTokens(turn.user.content);
    if (turn.assistant) olderTokens += estimateTokens(turn.assistant.content);
  }

  let summary = existingSummary;

  if (olderTokens > CONTEXT_TOKEN_LIMIT && olderTurns.length > 0) {
    const toSummarize: Array<{ role: string; content: string }> = [];
    if (existingSummary) {
      toSummarize.push({ role: "assistant", content: `Previous summary: ${existingSummary}` });
    }
    for (const turn of olderTurns) {
      toSummarize.push({ role: "user", content: turn.user.content });
      if (turn.assistant) {
        toSummarize.push({ role: "assistant", content: turn.assistant.content });
      }
    }

    const summaryResponse = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "Summarize the following conversation concisely. Capture key facts, user preferences, decisions made, and any important context. Be structured and brief.",
        },
        ...toSummarize.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      max_tokens: 500,
    });

    summary = summaryResponse.choices[0]?.message?.content ?? existingSummary;
  }

  const promptMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [systemMsg];

  if (summary) {
    promptMessages.push({
      role: "system",
      content: `Conversation summary so far: ${summary}`,
    });
  }

  for (const turn of recentTurns) {
    promptMessages.push({ role: "user", content: turn.user.content });
    if (turn.assistant) {
      promptMessages.push({ role: "assistant", content: turn.assistant.content });
    }
  }

  return { promptMessages, newSummary: summary !== existingSummary ? summary : null };
}
