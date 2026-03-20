import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, BatchWriteCommand, } from "@aws-sdk/lib-dynamodb";
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE = process.env.CONVERSATIONS_TABLE;
export function convPK(conversationId) {
    return `CONV#${conversationId}`;
}
export async function putItem(item) {
    await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
}
export async function getConversationMetadata(conversationId) {
    const result = await docClient.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: convPK(conversationId), SK: "METADATA" },
    }));
    return result.Item ?? null;
}
export async function getConversationMessages(conversationId) {
    const result = await docClient.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
            ":pk": convPK(conversationId),
            ":prefix": "MSG#",
        },
    }));
    return result.Items ?? [];
}
export async function listConversationsBySession(sessionId) {
    const result = await docClient.send(new QueryCommand({
        TableName: TABLE,
        IndexName: "SessionIndex",
        KeyConditionExpression: "sessionId = :sid",
        ExpressionAttributeValues: { ":sid": sessionId },
        ScanIndexForward: false,
    }));
    return result.Items ?? [];
}
export async function updateConversationMetadata(conversationId, updates) {
    const expressions = [];
    const names = {};
    const values = {};
    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
            expressions.push(`#${key} = :${key}`);
            names[`#${key}`] = key;
            values[`:${key}`] = value;
        }
    }
    if (expressions.length === 0)
        return;
    await docClient.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: convPK(conversationId), SK: "METADATA" },
        UpdateExpression: `SET ${expressions.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
    }));
}
export async function deleteConversation(conversationId) {
    const pk = convPK(conversationId);
    const result = await docClient.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": pk },
        ProjectionExpression: "PK, SK",
    }));
    const items = result.Items ?? [];
    if (items.length === 0)
        return false;
    const chunks = [];
    for (let i = 0; i < items.length; i += 25) {
        chunks.push(items.slice(i, i + 25));
    }
    for (const chunk of chunks) {
        await docClient.send(new BatchWriteCommand({
            RequestItems: {
                [TABLE]: chunk.map((item) => ({
                    DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
                })),
            },
        }));
    }
    return true;
}
