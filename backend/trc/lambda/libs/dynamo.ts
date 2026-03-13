import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { ConversationItem, MessageItem } from "../types/index.js";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE = process.env.CONVERSATIONS_TABLE!;

export function convPK(conversationId: string) {
  return `CONV#${conversationId}`;
}

export async function putItem(item: Record<string, unknown>) {
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
}

export async function getConversationMetadata(
  conversationId: string
): Promise<ConversationItem | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: convPK(conversationId), SK: "METADATA" },
    })
  );
  return (result.Item as ConversationItem) ?? null;
}

export async function getConversationMessages(
  conversationId: string
): Promise<MessageItem[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": convPK(conversationId),
        ":prefix": "MSG#",
      },
    })
  );
  return (result.Items as MessageItem[]) ?? [];
}

export async function listConversationsBySession(
  sessionId: string
): Promise<ConversationItem[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "SessionIndex",
      KeyConditionExpression: "sessionId = :sid",
      ExpressionAttributeValues: { ":sid": sessionId },
      ScanIndexForward: false,
    })
  );
  return (result.Items as ConversationItem[]) ?? [];
}

export async function updateConversationMetadata(
  conversationId: string,
  updates: Partial<Pick<ConversationItem, "title" | "summaryContext" | "updatedAt">>
) {
  const expressions: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      expressions.push(`#${key} = :${key}`);
      names[`#${key}`] = key;
      values[`:${key}`] = value;
    }
  }

  if (expressions.length === 0) return;

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: convPK(conversationId), SK: "METADATA" },
      UpdateExpression: `SET ${expressions.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}

export async function deleteConversation(conversationId: string) {
  const pk = convPK(conversationId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": pk },
      ProjectionExpression: "PK, SK",
    })
  );

  const items = result.Items ?? [];
  if (items.length === 0) return false;

  const chunks = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE]: chunk.map((item) => ({
            DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
          })),
        },
      })
    );
  }

  return true;
}
