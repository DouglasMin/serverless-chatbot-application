# Simple Chatbot App Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a serverless chatbot web app using OpenAI GPT 5.4 with streaming responses, conversation history, and BYOK (bring your own key) model.

**Architecture:** Two-stack Serverless Framework deployment — backend (Lambda + API Gateway + DynamoDB) and frontend (React + Vite + Tailwind v4 on S3 + CloudFront). Lambda Function URL with RESPONSE_STREAM for real-time chat streaming. Context summarization for memory management.

**Tech Stack:** TypeScript, React 19, Vite, Tailwind CSS v4, AWS Lambda, API Gateway, DynamoDB, Serverless Framework, OpenAI Chat Completions API, ulidx

**Spec:** `docs/superpowers/specs/2026-03-13-simple-chatbot-app-design.md`

---

## Chunk 1: Project Scaffolding, Shared Types & OpenAPI Spec

### Task 1: Initialize root project with yarn workspaces

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `tsconfig.base.json`

- [ ] **Step 1: Initialize git repo**

Run: `git init`

- [ ] **Step 2: Create root package.json with workspaces**

```json
{
  "name": "simple-chatbot-app",
  "private": true,
  "workspaces": [
    "backend",
    "frontend",
    "shared"
  ],
  "scripts": {
    "deploy": "yarn deploy:backend && yarn deploy:frontend",
    "deploy:backend": "cd backend && npx serverless deploy",
    "deploy:frontend": "cd frontend && npx serverless deploy",
    "deploy:function": "cd backend && npx serverless deploy function"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
dist/
.build/
.serverless/
.env
*.js.map
*.d.ts
!vite.config.ts
```

- [ ] **Step 4: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore tsconfig.base.json
git commit -m "chore: initialize root project with yarn workspaces"
```

---

### Task 2: Create shared types package

**Files:**
- Create: `shared/package.json`
- Create: `shared/tsconfig.json`
- Create: `shared/types.ts`

- [ ] **Step 1: Create shared/package.json**

```json
{
  "name": "@chatbot/shared",
  "version": "1.0.0",
  "private": true,
  "main": "./types.ts",
  "types": "./types.ts"
}
```

- [ ] **Step 2: Create shared/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["./**/*.ts"]
}
```

- [ ] **Step 3: Create shared/types.ts**

```typescript
// === Models ===

export const GPT_MODELS = [
  { id: "gpt-5.4", name: "GPT 5.4", description: "Most capable flagship model" },
  { id: "gpt-5.4-pro", name: "GPT 5.4 Pro", description: "Deeper reasoning for difficult problems" },
  { id: "gpt-5-mini", name: "GPT 5 Mini", description: "Cost-optimized, balanced speed and capability" },
  { id: "gpt-5-nano", name: "GPT 5 Nano", description: "High-throughput for straightforward tasks" },
] as const;

export type GptModelId = (typeof GPT_MODELS)[number]["id"];

// === Conversation ===

export interface ConversationMetadata {
  conversationId: string;
  sessionId: string;
  title: string;
  model: GptModelId;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  messageId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface Conversation extends ConversationMetadata {
  messages: Message[];
}

// === API Request/Response shapes ===

export interface CreateConversationRequest {
  model: GptModelId;
}

export interface CreateConversationResponse {
  conversation: ConversationMetadata;
}

export interface ListConversationsResponse {
  conversations: ConversationMetadata[];
}

export interface GetConversationResponse {
  conversation: Conversation;
}

export interface UpdateConversationRequest {
  title?: string;
}

export interface UpdateConversationResponse {
  conversation: ConversationMetadata;
}

export interface ChatStreamRequest {
  conversationId: string;
  message: string;
}

// chatStream response is a streaming SSE response, not JSON

export interface StreamEvent {
  type: "token" | "done" | "error";
  data: string;
}

export interface ApiError {
  error: string;
  code?: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add shared/
git commit -m "feat: add shared types package with API contract types"
```

---

### Task 3: Write OpenAPI 3.0.0 spec

**Files:**
- Create: `docs/openapi.yaml`

- [ ] **Step 1: Create docs/openapi.yaml**

```yaml
openapi: 3.0.0
info:
  title: Simple Chatbot API
  version: 1.0.0
  description: API for a serverless chatbot powered by OpenAI GPT models

servers:
  - url: https://{apiId}.execute-api.{region}.amazonaws.com/{stage}
    variables:
      apiId:
        default: "xxx"
      region:
        default: "us-east-1"
      stage:
        default: "dev"

paths:
  /conversations:
    post:
      operationId: createConversation
      summary: Create a new conversation
      description: "Implementation: backend/src/functions/createConversation.ts"
      parameters:
        - $ref: "#/components/parameters/SessionId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateConversationRequest"
      responses:
        "201":
          description: Conversation created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CreateConversationResponse"
        "400":
          description: Invalid request
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"

    get:
      operationId: listConversations
      summary: List conversations for a session
      description: "Implementation: backend/src/functions/listConversations.ts"
      parameters:
        - $ref: "#/components/parameters/SessionId"
      responses:
        "200":
          description: List of conversations
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ListConversationsResponse"

  /conversations/{conversationId}:
    get:
      operationId: getConversation
      summary: Get a conversation with all messages
      description: "Implementation: backend/src/functions/getConversation.ts"
      parameters:
        - $ref: "#/components/parameters/SessionId"
        - $ref: "#/components/parameters/ConversationId"
      responses:
        "200":
          description: Conversation with messages
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/GetConversationResponse"
        "404":
          description: Conversation not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"

    patch:
      operationId: updateConversation
      summary: Update conversation metadata
      description: "Implementation: backend/src/functions/updateConversation.ts"
      parameters:
        - $ref: "#/components/parameters/SessionId"
        - $ref: "#/components/parameters/ConversationId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UpdateConversationRequest"
      responses:
        "200":
          description: Conversation updated
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UpdateConversationResponse"
        "404":
          description: Conversation not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"

    delete:
      operationId: deleteConversation
      summary: Delete a conversation
      description: "Implementation: backend/src/functions/deleteConversation.ts"
      parameters:
        - $ref: "#/components/parameters/SessionId"
        - $ref: "#/components/parameters/ConversationId"
      responses:
        "204":
          description: Conversation deleted
        "404":
          description: Conversation not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"

  /chat/stream:
    post:
      operationId: chatStream
      summary: Stream a chat completion
      description: |
        Implementation: backend/src/functions/chatStream.ts
        Exposed via Lambda Function URL (not API Gateway).
        Returns chunked SSE-style streaming response.
      parameters:
        - name: Authorization
          in: header
          required: true
          schema:
            type: string
          description: "Bearer <OpenAI API key>"
        - $ref: "#/components/parameters/SessionId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ChatStreamRequest"
      responses:
        "200":
          description: Streaming SSE response with token events
          content:
            text/event-stream:
              schema:
                type: string
                description: "SSE stream of StreamEvent objects"
        "401":
          description: Invalid API key
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ApiError"

components:
  parameters:
    SessionId:
      name: x-session-id
      in: header
      required: true
      schema:
        type: string
        minLength: 32
      description: Cryptographically random session identifier

    ConversationId:
      name: conversationId
      in: path
      required: true
      schema:
        type: string

  schemas:
    GptModelId:
      type: string
      enum:
        - gpt-5.4
        - gpt-5.4-pro
        - gpt-5-mini
        - gpt-5-nano

    CreateConversationRequest:
      type: object
      required:
        - model
      properties:
        model:
          $ref: "#/components/schemas/GptModelId"

    CreateConversationResponse:
      type: object
      properties:
        conversation:
          $ref: "#/components/schemas/ConversationMetadata"

    ListConversationsResponse:
      type: object
      properties:
        conversations:
          type: array
          items:
            $ref: "#/components/schemas/ConversationMetadata"

    GetConversationResponse:
      type: object
      properties:
        conversation:
          $ref: "#/components/schemas/Conversation"

    UpdateConversationRequest:
      type: object
      properties:
        title:
          type: string

    UpdateConversationResponse:
      type: object
      properties:
        conversation:
          $ref: "#/components/schemas/ConversationMetadata"

    ChatStreamRequest:
      type: object
      required:
        - conversationId
        - message
      properties:
        conversationId:
          type: string
        message:
          type: string

    ConversationMetadata:
      type: object
      properties:
        conversationId:
          type: string
        sessionId:
          type: string
        title:
          type: string
        model:
          $ref: "#/components/schemas/GptModelId"
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    Conversation:
      allOf:
        - $ref: "#/components/schemas/ConversationMetadata"
        - type: object
          properties:
            messages:
              type: array
              items:
                $ref: "#/components/schemas/Message"

    Message:
      type: object
      properties:
        messageId:
          type: string
        role:
          type: string
          enum: [user, assistant, system]
        content:
          type: string
        createdAt:
          type: string
          format: date-time

    StreamEvent:
      type: object
      properties:
        type:
          type: string
          enum: [token, done, error]
        data:
          type: string

    ApiError:
      type: object
      properties:
        error:
          type: string
        code:
          type: string
```

- [ ] **Step 2: Commit**

```bash
git add docs/openapi.yaml
git commit -m "feat: add OpenAPI 3.0.0 spec for chatbot API"
```

---

## Chunk 2: Backend Infrastructure & Lib Utilities

### Task 4: Initialize backend package

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`

- [ ] **Step 1: Create backend/package.json**

```json
{
  "name": "@chatbot/backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.700.0",
    "@aws-sdk/lib-dynamodb": "^3.700.0",
    "openai": "^5.19.0",
    "ulidx": "^2.4.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.145",
    "serverless": "^3.40.0",
    "serverless-esbuild": "^1.54.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create backend/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@chatbot/shared": ["../shared/types"]
    }
  },
  "include": ["src/**/*.ts"],
  "references": [{ "path": "../shared" }]
}
```

- [ ] **Step 3: Install dependencies**

Run: `cd backend && yarn install`

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/tsconfig.json
git commit -m "chore: initialize backend package with dependencies"
```

---

### Task 5: Create backend serverless.yml

**Files:**
- Create: `backend/serverless.yml`

- [ ] **Step 1: Create backend/serverless.yml**

```yaml
service: chatbot-backend

provider:
  name: aws
  runtime: nodejs20.x
  stage: ${opt:stage, 'dev'}
  region: ${opt:region, 'us-east-1'}
  environment:
    CONVERSATIONS_TABLE: ${self:service}-conversations-${sls:stage}
    STAGE: ${sls:stage}
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:PutItem
            - dynamodb:GetItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
            - dynamodb:Query
            - dynamodb:BatchWriteItem
          Resource:
            - !GetAtt ConversationsTable.Arn
            - !Join ["", [!GetAtt ConversationsTable.Arn, "/index/*"]]

  httpApi:
    cors:
      allowedOrigins:
        - "*"
      allowedHeaders:
        - Content-Type
        - x-session-id
      allowedMethods:
        - GET
        - POST
        - PATCH
        - DELETE
        - OPTIONS

plugins:
  - serverless-esbuild

custom:
  esbuild:
    bundle: true
    minify: false
    sourcemap: true
    target: node20
    platform: node
    external:
      - "@aws-sdk/client-dynamodb"
      - "@aws-sdk/lib-dynamodb"

functions:
  createConversation:
    handler: src/functions/createConversation.handler
    events:
      - httpApi:
          path: /conversations
          method: post

  listConversations:
    handler: src/functions/listConversations.handler
    events:
      - httpApi:
          path: /conversations
          method: get

  getConversation:
    handler: src/functions/getConversation.handler
    events:
      - httpApi:
          path: /conversations/{conversationId}
          method: get

  updateConversation:
    handler: src/functions/updateConversation.handler
    events:
      - httpApi:
          path: /conversations/{conversationId}
          method: patch

  deleteConversation:
    handler: src/functions/deleteConversation.handler
    events:
      - httpApi:
          path: /conversations/{conversationId}
          method: delete

  chatStream:
    handler: src/functions/chatStream.handler
    timeout: 120
    url:
      invokeMode: RESPONSE_STREAM
      cors:
        allowedOrigins:
          - "*"
        allowedHeaders:
          - Content-Type
          - Authorization
          - x-session-id
        allowedMethods:
          - POST
          - OPTIONS

resources:
  Resources:
    ConversationsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:provider.environment.CONVERSATIONS_TABLE}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: PK
            AttributeType: S
          - AttributeName: SK
            AttributeType: S
          - AttributeName: sessionId
            AttributeType: S
          - AttributeName: createdAt
            AttributeType: S
        KeySchema:
          - AttributeName: PK
            KeyType: HASH
          - AttributeName: SK
            KeyType: RANGE
        GlobalSecondaryIndexes:
          - IndexName: SessionIndex
            KeySchema:
              - AttributeName: sessionId
                KeyType: HASH
              - AttributeName: createdAt
                KeyType: RANGE
            Projection:
              ProjectionType: ALL

  Outputs:
    ChatStreamUrl:
      Description: Lambda Function URL for chat streaming
      Value: !GetAtt ChatStreamLambdaFunctionUrl.FunctionUrl
    HttpApiUrl:
      Description: HTTP API Gateway URL
      Value: !GetAtt HttpApi.ApiEndpoint
```

- [ ] **Step 2: Commit**

```bash
git add backend/serverless.yml
git commit -m "feat: add backend serverless.yml with DynamoDB, API Gateway, Lambda Function URL"
```

---

### Task 6: Create backend lib utilities

**Files:**
- Create: `backend/src/lib/dynamo.ts`
- Create: `backend/src/lib/openai.ts`
- Create: `backend/src/lib/session.ts`
- Create: `backend/src/lib/response.ts`
- Create: `backend/src/types/index.ts`

- [ ] **Step 1: Create backend/src/types/index.ts**

```typescript
// DynamoDB item shapes (internal to backend)

export interface ConversationItem {
  PK: string;
  SK: "METADATA";
  sessionId: string;
  title: string;
  model: string;
  summaryContext: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageItem {
  PK: string;
  SK: string; // MSG#<ulid>
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  partial?: boolean;
}
```

- [ ] **Step 2: Create backend/src/lib/dynamo.ts**

```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
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

  // Query all items for this conversation
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

  // Batch delete in chunks of 25
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
```

- [ ] **Step 3: Create backend/src/lib/openai.ts**

```typescript
import OpenAI from "openai";

export function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}
```

- [ ] **Step 4: Create backend/src/lib/session.ts**

```typescript
export function validateSessionId(sessionId: string | undefined): string {
  if (!sessionId || sessionId.length < 32) {
    throw new SessionError("Missing or invalid x-session-id header (minimum 32 characters)");
  }
  return sessionId;
}

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionError";
  }
}
```

- [ ] **Step 5: Create backend/src/lib/response.ts**

```typescript
export function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function error(statusCode: number, message: string, code?: string) {
  return json(statusCode, { error: message, ...(code && { code }) });
}
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/
git commit -m "feat: add backend lib utilities (dynamo, openai, session, response)"
```

---

## Chunk 3: Backend Lambda Functions (CRUD)

### Task 7: Implement createConversation

**Files:**
- Create: `backend/src/functions/createConversation.ts`

- [ ] **Step 1: Create backend/src/functions/createConversation.ts**

```typescript
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ulid } from "ulidx";
import { putItem, convPK } from "../lib/dynamo.js";
import { validateSessionId, SessionError } from "../lib/session.js";
import { json, error } from "../lib/response.js";
import type { CreateConversationRequest } from "@chatbot/shared";

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
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/functions/createConversation.ts
git commit -m "feat: implement createConversation Lambda"
```

---

### Task 8: Implement listConversations

**Files:**
- Create: `backend/src/functions/listConversations.ts`

- [ ] **Step 1: Create backend/src/functions/listConversations.ts**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/functions/listConversations.ts
git commit -m "feat: implement listConversations Lambda"
```

---

### Task 9: Implement getConversation

**Files:**
- Create: `backend/src/functions/getConversation.ts`

- [ ] **Step 1: Create backend/src/functions/getConversation.ts**

```typescript
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getConversationMetadata, getConversationMessages } from "../lib/dynamo.js";
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

    const messageItems = await getConversationMessages(conversationId);
    const messages = messageItems.map((item) => ({
      messageId: item.SK.replace("MSG#", ""),
      role: item.role,
      content: item.content,
      createdAt: item.createdAt,
    }));

    return json(200, {
      conversation: {
        conversationId,
        sessionId: metadata.sessionId,
        title: metadata.title,
        model: metadata.model,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
        messages,
      },
    });
  } catch (err) {
    if (err instanceof SessionError) return error(400, err.message);
    console.error(err);
    return error(500, "Internal server error");
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/functions/getConversation.ts
git commit -m "feat: implement getConversation Lambda"
```

---

### Task 10: Implement updateConversation

**Files:**
- Create: `backend/src/functions/updateConversation.ts`

- [ ] **Step 1: Create backend/src/functions/updateConversation.ts**

```typescript
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getConversationMetadata, updateConversationMetadata } from "../lib/dynamo.js";
import { validateSessionId, SessionError } from "../lib/session.js";
import { json, error } from "../lib/response.js";
import type { UpdateConversationRequest } from "@chatbot/shared";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const sessionId = validateSessionId(event.headers["x-session-id"]);
    const conversationId = event.pathParameters?.conversationId;

    if (!conversationId) return error(400, "Missing conversationId");

    const metadata = await getConversationMetadata(conversationId);
    if (!metadata || metadata.sessionId !== sessionId) {
      return error(404, "Conversation not found");
    }

    const body: UpdateConversationRequest = JSON.parse(event.body ?? "{}");
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
  } catch (err) {
    if (err instanceof SessionError) return error(400, err.message);
    console.error(err);
    return error(500, "Internal server error");
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/functions/updateConversation.ts
git commit -m "feat: implement updateConversation Lambda"
```

---

### Task 11: Implement deleteConversation

**Files:**
- Create: `backend/src/functions/deleteConversation.ts`

- [ ] **Step 1: Create backend/src/functions/deleteConversation.ts**

```typescript
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getConversationMetadata, deleteConversation } from "../lib/dynamo.js";
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

    await deleteConversation(conversationId);

    return { statusCode: 204, body: "" };
  } catch (err) {
    if (err instanceof SessionError) return error(400, err.message);
    console.error(err);
    return error(500, "Internal server error");
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/functions/deleteConversation.ts
git commit -m "feat: implement deleteConversation Lambda"
```

---

## Chunk 4: Backend chatStream with Streaming & Summarization

### Task 12: Implement summarizer

**Files:**
- Create: `backend/src/lib/summarizer.ts`

- [ ] **Step 1: Create backend/src/lib/summarizer.ts**

```typescript
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

  // Calculate total tokens of older messages
  let olderTokens = 0;
  for (const turn of olderTurns) {
    olderTokens += estimateTokens(turn.user.content);
    if (turn.assistant) olderTokens += estimateTokens(turn.assistant.content);
  }

  let summary = existingSummary;

  // Summarize if older context is too large
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

  // Build final prompt
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/lib/summarizer.ts
git commit -m "feat: implement conversation summarizer for context management"
```

---

### Task 13: Implement chatStream Lambda with response streaming

**Files:**
- Create: `backend/src/functions/chatStream.ts`

- [ ] **Step 1: Create backend/src/functions/chatStream.ts**

This function uses Lambda response streaming via `awslambda.streamifyResponse`.

```typescript
import { ulid } from "ulidx";
import {
  getConversationMetadata,
  getConversationMessages,
  putItem,
  convPK,
  updateConversationMetadata,
} from "../lib/dynamo.js";
import { createOpenAIClient } from "../lib/openai.js";
import { validateSessionId, SessionError } from "../lib/session.js";
import { buildPromptMessages } from "../lib/summarizer.js";
import type { ChatStreamRequest } from "@chatbot/shared";

// @ts-expect-error — awslambda is a global provided by the Lambda runtime for streaming
const handler = awslambda.streamifyResponse(
  async (event: { headers: Record<string, string>; body: string }, responseStream: any) => {
    const metadata = responseStream.setContentType("text/event-stream");

    const write = (data: { type: string; data: string }) => {
      responseStream.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Parse request
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

      const sessionId = headers["x-session-id"];
      if (!sessionId || sessionId.length < 32) {
        write({ type: "error", data: "Missing or invalid x-session-id" });
        responseStream.end();
        return;
      }

      const body: ChatStreamRequest = JSON.parse(event.body ?? "{}");
      if (!body.conversationId || !body.message) {
        write({ type: "error", data: "Missing conversationId or message" });
        responseStream.end();
        return;
      }

      // Verify conversation ownership
      const convMeta = await getConversationMetadata(body.conversationId);
      if (!convMeta || convMeta.sessionId !== sessionId) {
        write({ type: "error", data: "Conversation not found" });
        responseStream.end();
        return;
      }

      // Save user message
      const userMessageId = ulid();
      const now = new Date().toISOString();
      await putItem({
        PK: convPK(body.conversationId),
        SK: `MSG#${userMessageId}`,
        role: "user",
        content: body.message,
        createdAt: now,
      });

      // Get all messages for context
      const allMessages = await getConversationMessages(body.conversationId);

      // Build prompt with summarization
      const openai = createOpenAIClient(apiKey);
      const { promptMessages, newSummary } = await buildPromptMessages(
        openai,
        convMeta.model,
        allMessages,
        convMeta.summaryContext
      );

      // Add the new user message to prompt
      promptMessages.push({ role: "user", content: body.message });

      // Stream from OpenAI
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

      // Save assistant message
      const assistantMessageId = ulid();
      await putItem({
        PK: convPK(body.conversationId),
        SK: `MSG#${assistantMessageId}`,
        role: "assistant",
        content: fullResponse,
        createdAt: new Date().toISOString(),
      });

      // Auto-title on first message
      if (allMessages.length === 0) {
        const autoTitle = body.message.slice(0, 50) + (body.message.length > 50 ? "..." : "");
        await updateConversationMetadata(body.conversationId, {
          title: autoTitle,
          updatedAt: new Date().toISOString(),
        });
      }

      // Save new summary if generated
      if (newSummary) {
        await updateConversationMetadata(body.conversationId, {
          summaryContext: newSummary,
          updatedAt: new Date().toISOString(),
        });
      }

      write({ type: "done", data: "" });
    } catch (err: any) {
      console.error("chatStream error:", err);

      if (err?.status === 401) {
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/functions/chatStream.ts
git commit -m "feat: implement chatStream Lambda with response streaming and summarization"
```

---

## Chunk 5: Frontend Scaffolding

### Task 14: Initialize frontend with Vite + React + Tailwind v4

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/app.css`

- [ ] **Step 1: Create frontend/package.json**

```json
{
  "name": "@chatbot/frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.1.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "serverless": "^3.40.0"
  }
}
```

- [ ] **Step 2: Create frontend/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@chatbot/shared": ["../shared/types"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

- [ ] **Step 3: Create frontend/vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@chatbot/shared": path.resolve(__dirname, "../shared/types"),
    },
  },
  build: {
    outDir: "dist",
  },
});
```

- [ ] **Step 4: Create frontend/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Chatbot</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create frontend/src/app.css**

```css
@import "tailwindcss";

@theme {
  --color-primary-50: oklch(0.97 0.01 250);
  --color-primary-100: oklch(0.93 0.03 250);
  --color-primary-200: oklch(0.87 0.06 250);
  --color-primary-300: oklch(0.78 0.1 250);
  --color-primary-400: oklch(0.68 0.15 250);
  --color-primary-500: oklch(0.58 0.19 250);
  --color-primary-600: oklch(0.5 0.19 250);
  --color-primary-700: oklch(0.42 0.17 250);
  --color-primary-800: oklch(0.35 0.14 250);
  --color-primary-900: oklch(0.28 0.1 250);

  --color-surface-50: oklch(0.985 0.002 250);
  --color-surface-100: oklch(0.965 0.004 250);
  --color-surface-200: oklch(0.93 0.006 250);
  --color-surface-300: oklch(0.87 0.01 250);
  --color-surface-700: oklch(0.35 0.02 250);
  --color-surface-800: oklch(0.25 0.015 250);
  --color-surface-850: oklch(0.2 0.015 250);
  --color-surface-900: oklch(0.16 0.012 250);
  --color-surface-950: oklch(0.12 0.01 250);

  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}

html {
  font-family: var(--font-sans);
}

body {
  margin: 0;
  min-height: 100dvh;
}

/* Dark mode by default */
:root {
  color-scheme: dark;
}
```

- [ ] **Step 6: Create frontend/src/main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 7: Create frontend/src/App.tsx (placeholder)**

```tsx
export default function App() {
  return (
    <div className="flex h-dvh bg-surface-950 text-white">
      <p className="m-auto text-surface-300">Chatbot loading...</p>
    </div>
  );
}
```

- [ ] **Step 8: Install dependencies and verify dev server starts**

Run: `cd frontend && yarn install && yarn dev` (confirm it starts, then ctrl+c)

- [ ] **Step 9: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold frontend with Vite, React 19, Tailwind CSS v4"
```

---

### Task 15: Create frontend serverless.yml

**Files:**
- Create: `frontend/serverless.yml`

- [ ] **Step 1: Create frontend/serverless.yml**

```yaml
service: chatbot-frontend

provider:
  name: aws
  region: ${opt:region, 'us-east-1'}
  stage: ${opt:stage, 'dev'}

plugins:
  - serverless-s3-sync
  - serverless-cloudfront-invalidate

custom:
  s3Sync:
    - bucketName: ${self:service}-${sls:stage}
      localDir: dist
      deleteRemoved: true
  cloudfrontInvalidate:
    - distributionIdKey: CloudFrontDistributionId
      items:
        - "/*"

resources:
  Resources:
    WebsiteBucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: ${self:service}-${sls:stage}
        PublicAccessBlockConfiguration:
          BlockPublicAcls: true
          BlockPublicPolicy: true
          IgnorePublicAcls: true
          RestrictPublicBuckets: true

    WebsiteBucketPolicy:
      Type: AWS::S3::BucketPolicy
      Properties:
        Bucket: !Ref WebsiteBucket
        PolicyDocument:
          Statement:
            - Sid: AllowCloudFrontOAC
              Effect: Allow
              Principal:
                Service: cloudfront.amazonaws.com
              Action: s3:GetObject
              Resource: !Join ["", [!GetAtt WebsiteBucket.Arn, "/*"]]
              Condition:
                StringEquals:
                  AWS:SourceArn: !Join
                    - ""
                    - - "arn:aws:cloudfront::"
                      - !Ref AWS::AccountId
                      - ":distribution/"
                      - !Ref CloudFrontDistribution

    CloudFrontOAC:
      Type: AWS::CloudFront::OriginAccessControl
      Properties:
        OriginAccessControlConfig:
          Name: ${self:service}-${sls:stage}-oac
          OriginAccessControlOriginType: s3
          SigningBehavior: always
          SigningProtocol: sigv4

    CloudFrontDistribution:
      Type: AWS::CloudFront::Distribution
      Properties:
        DistributionConfig:
          Enabled: true
          DefaultRootObject: index.html
          Origins:
            - Id: S3Origin
              DomainName: !GetAtt WebsiteBucket.RegionalDomainName
              OriginAccessControlId: !Ref CloudFrontOAC
              S3OriginConfig:
                OriginAccessIdentity: ""
          DefaultCacheBehavior:
            TargetOriginId: S3Origin
            ViewerProtocolPolicy: redirect-to-https
            AllowedMethods: [GET, HEAD, OPTIONS]
            CachedMethods: [GET, HEAD]
            ForwardedValues:
              QueryString: false
              Cookies:
                Forward: none
            Compress: true
          CustomErrorResponses:
            - ErrorCode: 403
              ResponseCode: 200
              ResponsePagePath: /index.html
            - ErrorCode: 404
              ResponseCode: 200
              ResponsePagePath: /index.html

  Outputs:
    CloudFrontDistributionId:
      Value: !Ref CloudFrontDistribution
    CloudFrontDomainName:
      Value: !GetAtt CloudFrontDistribution.DomainName
    WebsiteBucketName:
      Value: !Ref WebsiteBucket
```

- [ ] **Step 2: Add frontend deploy plugins to package.json devDependencies**

Add to `frontend/package.json` devDependencies:
```json
"serverless-s3-sync": "^3.4.0",
"serverless-cloudfront-invalidate": "^1.12.0"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/serverless.yml frontend/package.json
git commit -m "feat: add frontend serverless.yml with S3 and CloudFront"
```

---

## Chunk 6: Frontend Hooks & API Client

### Task 16: Create API client and hooks

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/hooks/useApiKey.ts`
- Create: `frontend/src/hooks/useConversations.ts`
- Create: `frontend/src/hooks/useChat.ts`

- [ ] **Step 1: Create frontend/src/lib/api.ts**

```typescript
import type {
  CreateConversationRequest,
  CreateConversationResponse,
  ListConversationsResponse,
  GetConversationResponse,
  UpdateConversationRequest,
  UpdateConversationResponse,
} from "@chatbot/shared";

// These will be set after deployment. For dev, use env vars.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const STREAM_BASE = import.meta.env.VITE_STREAM_BASE_URL ?? "";

function getSessionId(): string {
  let id = localStorage.getItem("session-id");
  if (!id) {
    id = crypto.randomUUID() + crypto.randomUUID(); // 64 hex chars
    localStorage.setItem("session-id", id);
  }
  return id;
}

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-session-id": getSessionId(),
  };
}

export async function createConversation(
  body: CreateConversationRequest
): Promise<CreateConversationResponse> {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function listConversations(): Promise<ListConversationsResponse> {
  const res = await fetch(`${API_BASE}/conversations`, { headers: headers() });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function getConversation(
  id: string
): Promise<GetConversationResponse> {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function updateConversation(
  id: string,
  body: UpdateConversationRequest
): Promise<UpdateConversationResponse> {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Failed to delete conversation");
}

export async function* streamChat(
  conversationId: string,
  message: string,
  apiKey: string
): AsyncGenerator<{ type: string; data: string }> {
  const res = await fetch(`${STREAM_BASE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "x-session-id": getSessionId(),
    },
    body: JSON.stringify({ conversationId, message }),
  });

  if (!res.ok || !res.body) {
    throw new Error("Stream request failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          yield JSON.parse(line.slice(6));
        } catch {
          // skip malformed lines
        }
      }
    }
  }
}
```

- [ ] **Step 2: Create frontend/src/hooks/useApiKey.ts**

```typescript
import { useState, useCallback } from "react";

const STORAGE_KEY = "openai-api-key";

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );

  const setApiKey = useCallback((key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKeyState(key);
  }, []);

  const clearApiKey = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKeyState(null);
  }, []);

  return { apiKey, setApiKey, clearApiKey, hasApiKey: !!apiKey };
}
```

- [ ] **Step 3: Create frontend/src/hooks/useConversations.ts**

```typescript
import { useState, useCallback, useEffect } from "react";
import type { ConversationMetadata, GptModelId } from "@chatbot/shared";
import * as api from "../lib/api";

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.listConversations();
      setConversations(res.conversations);
    } catch (err) {
      console.error("Failed to list conversations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (model: GptModelId) => {
      const res = await api.createConversation({ model });
      setConversations((prev) => [res.conversation, ...prev]);
      setActiveId(res.conversation.conversationId);
      return res.conversation;
    },
    []
  );

  const remove = useCallback(
    async (id: string) => {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.conversationId !== id));
      if (activeId === id) setActiveId(null);
    },
    [activeId]
  );

  const updateTitle = useCallback(
    (id: string, title: string) => {
      setConversations((prev) =>
        prev.map((c) => (c.conversationId === id ? { ...c, title } : c))
      );
    },
    []
  );

  return {
    conversations,
    activeId,
    setActiveId,
    loading,
    create,
    remove,
    refresh,
    updateTitle,
  };
}
```

- [ ] **Step 4: Create frontend/src/hooks/useChat.ts**

```typescript
import { useState, useCallback, useRef } from "react";
import type { Message } from "@chatbot/shared";
import * as api from "../lib/api";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const loadConversation = useCallback(async (conversationId: string) => {
    setError(null);
    setStreamingContent("");
    try {
      const res = await api.getConversation(conversationId);
      setMessages(res.conversation.messages);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingContent("");
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (
      conversationId: string,
      content: string,
      apiKey: string,
      onTitleUpdate?: (title: string) => void
    ) => {
      setError(null);
      setIsStreaming(true);
      abortRef.current = false;

      // Optimistically add user message
      const userMsg: Message = {
        messageId: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      let fullResponse = "";
      setStreamingContent("");

      try {
        for await (const event of api.streamChat(conversationId, content, apiKey)) {
          if (abortRef.current) break;

          if (event.type === "token") {
            fullResponse += event.data;
            setStreamingContent(fullResponse);
          } else if (event.type === "error") {
            setError(event.data);
            break;
          } else if (event.type === "done") {
            break;
          }
        }

        if (fullResponse) {
          const assistantMsg: Message = {
            messageId: crypto.randomUUID(),
            role: "assistant",
            content: fullResponse,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);

          // Update title if this was the first message
          if (messages.length === 0 && onTitleUpdate) {
            const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
            onTitleUpdate(title);
          }
        }
      } catch (err: any) {
        setError(err.message ?? "Failed to send message");
      } finally {
        setStreamingContent("");
        setIsStreaming(false);
      }
    },
    [messages.length]
  );

  return {
    messages,
    streamingContent,
    isStreaming,
    error,
    loadConversation,
    clearMessages,
    sendMessage,
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/ frontend/src/hooks/
git commit -m "feat: add API client and React hooks (useApiKey, useConversations, useChat)"
```

---

## Chunk 7: Frontend Components & Final Assembly

### Task 17: Build ApiKeySetup component

**Files:**
- Create: `frontend/src/components/ApiKeySetup.tsx`

- [ ] **Step 1: Create frontend/src/components/ApiKeySetup.tsx**

```tsx
import { useState } from "react";

interface Props {
  onSubmit: (key: string) => void;
}

export default function ApiKeySetup({ onSubmit }: Props) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!key.startsWith("sk-")) {
      setError("API key should start with 'sk-'");
      return;
    }

    setLoading(true);
    try {
      // Validate by listing models
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) {
        setError("Invalid API key. Please check and try again.");
        return;
      }
      onSubmit(key);
    } catch {
      setError("Failed to validate key. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-dvh items-center justify-center bg-surface-950 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface-900 p-8 shadow-2xl">
        <h1 className="mb-2 text-2xl font-semibold text-white">Welcome</h1>
        <p className="mb-6 text-sm text-surface-300">
          Enter your OpenAI API key to get started. Your key is stored locally
          and never saved on our servers.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg border border-surface-700 bg-surface-850 px-4 py-3 text-sm text-white placeholder-surface-500 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !key}
            className="w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Validating..." : "Get Started"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ApiKeySetup.tsx
git commit -m "feat: add ApiKeySetup component"
```

---

### Task 18: Build ModelSelector component

**Files:**
- Create: `frontend/src/components/ModelSelector.tsx`

- [ ] **Step 1: Create frontend/src/components/ModelSelector.tsx**

```tsx
import { GPT_MODELS, type GptModelId } from "@chatbot/shared";

interface Props {
  value: GptModelId;
  onChange: (model: GptModelId) => void;
  disabled?: boolean;
}

export default function ModelSelector({ value, onChange, disabled }: Props) {
  if (disabled) {
    const model = GPT_MODELS.find((m) => m.id === value);
    return (
      <span className="inline-flex items-center rounded-md bg-surface-800 px-2.5 py-1 text-xs font-medium text-surface-300">
        {model?.name ?? value}
      </span>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as GptModelId)}
      className="rounded-lg border border-surface-700 bg-surface-850 px-3 py-1.5 text-sm text-white outline-none transition focus:border-primary-500"
    >
      {GPT_MODELS.map((model) => (
        <option key={model.id} value={model.id}>
          {model.name} — {model.description}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ModelSelector.tsx
git commit -m "feat: add ModelSelector component"
```

---

### Task 19: Build Sidebar component

**Files:**
- Create: `frontend/src/components/Sidebar.tsx`

- [ ] **Step 1: Create frontend/src/components/Sidebar.tsx**

```tsx
import type { ConversationMetadata, GptModelId } from "@chatbot/shared";

interface Props {
  conversations: ConversationMetadata[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (model: GptModelId) => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onOpenSettings,
}: Props) {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-surface-800 bg-surface-900">
      {/* New chat button */}
      <div className="p-3">
        <button
          onClick={() => onCreate("gpt-5.4")}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-surface-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-surface-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Conversation list */}
      <nav className="flex-1 overflow-y-auto px-2">
        {conversations.map((conv) => (
          <div
            key={conv.conversationId}
            className={`group relative mb-0.5 flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm transition ${
              activeId === conv.conversationId
                ? "bg-surface-800 text-white"
                : "text-surface-300 hover:bg-surface-850 hover:text-white"
            }`}
            onClick={() => onSelect(conv.conversationId)}
          >
            <span className="flex-1 truncate">{conv.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv.conversationId);
              }}
              className="ml-2 hidden rounded p-1 text-surface-500 transition hover:bg-surface-700 hover:text-red-400 group-hover:block"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </nav>

      {/* Settings */}
      <div className="border-t border-surface-800 p-3">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-300 transition hover:bg-surface-850 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Sidebar.tsx
git commit -m "feat: add Sidebar component"
```

---

### Task 20: Build ChatArea and MessageInput components

**Files:**
- Create: `frontend/src/components/ChatArea.tsx`
- Create: `frontend/src/components/MessageInput.tsx`

- [ ] **Step 1: Create frontend/src/components/ChatArea.tsx**

```tsx
import type { Message } from "@chatbot/shared";
import { useEffect, useRef } from "react";

interface Props {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  error: string | null;
}

export default function ChatArea({ messages, streamingContent, isStreaming, error }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-white">Start a conversation</h2>
          <p className="text-sm text-surface-400">Send a message to begin chatting with GPT.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {messages.map((msg) => (
          <div key={msg.messageId} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary-600 text-white"
                  : "bg-surface-800 text-surface-100"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {isStreaming && streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl bg-surface-800 px-4 py-3 text-sm leading-relaxed text-surface-100">
              <div className="whitespace-pre-wrap">{streamingContent}</div>
              <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-primary-400" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="rounded-lg bg-red-950/50 px-4 py-2 text-sm text-red-300">
              {error}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create frontend/src/components/MessageInput.tsx**

```tsx
import { useState, useRef, useEffect } from "react";

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function MessageInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-surface-800 bg-surface-900 px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-end gap-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none rounded-xl border border-surface-700 bg-surface-850 px-4 py-3 text-sm text-white placeholder-surface-500 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ChatArea.tsx frontend/src/components/MessageInput.tsx
git commit -m "feat: add ChatArea and MessageInput components"
```

---

### Task 21: Build SettingsPanel component

**Files:**
- Create: `frontend/src/components/SettingsPanel.tsx`

- [ ] **Step 1: Create frontend/src/components/SettingsPanel.tsx**

```tsx
interface Props {
  apiKey: string;
  onChangeKey: () => void;
  onClose: () => void;
}

export default function SettingsPanel({ apiKey, onChangeKey, onClose }: Props) {
  const masked = apiKey.slice(0, 7) + "..." + apiKey.slice(-4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-surface-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-surface-400 transition hover:bg-surface-800 hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-surface-300">
              OpenAI API Key
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-surface-850 px-3 py-2 text-sm text-surface-300">
                {masked}
              </code>
              <button
                onClick={onChangeKey}
                className="rounded-lg bg-surface-800 px-3 py-2 text-sm text-surface-300 transition hover:bg-surface-700 hover:text-white"
              >
                Change
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/SettingsPanel.tsx
git commit -m "feat: add SettingsPanel component"
```

---

### Task 22: Wire up App.tsx — full assembly

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Rewrite frontend/src/App.tsx**

```tsx
import { useState, useCallback, useEffect } from "react";
import type { GptModelId } from "@chatbot/shared";
import { useApiKey } from "./hooks/useApiKey";
import { useConversations } from "./hooks/useConversations";
import { useChat } from "./hooks/useChat";
import ApiKeySetup from "./components/ApiKeySetup";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import MessageInput from "./components/MessageInput";
import ModelSelector from "./components/ModelSelector";
import SettingsPanel from "./components/SettingsPanel";

export default function App() {
  const { apiKey, setApiKey, clearApiKey, hasApiKey } = useApiKey();
  const {
    conversations,
    activeId,
    setActiveId,
    create,
    remove,
    updateTitle,
  } = useConversations();
  const {
    messages,
    streamingContent,
    isStreaming,
    error,
    loadConversation,
    clearMessages,
    sendMessage,
  } = useChat();

  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GptModelId>("gpt-5.4");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeConv = conversations.find((c) => c.conversationId === activeId);
  const hasMessages = messages.length > 0;

  // Load conversation when activeId changes
  useEffect(() => {
    if (activeId) {
      loadConversation(activeId);
    } else {
      clearMessages();
    }
  }, [activeId, loadConversation, clearMessages]);

  const handleNewChat = useCallback(
    async (model: GptModelId) => {
      setSelectedModel(model);
      await create(model);
    },
    [create]
  );

  const handleSend = useCallback(
    async (content: string) => {
      if (!apiKey || !activeId) return;
      await sendMessage(activeId, content, apiKey, (title) => {
        updateTitle(activeId, title);
      });
    },
    [apiKey, activeId, sendMessage, updateTitle]
  );

  const handleChangeKey = useCallback(() => {
    clearApiKey();
    setShowSettings(false);
  }, [clearApiKey]);

  if (!hasApiKey) {
    return <ApiKeySetup onSubmit={setApiKey} />;
  }

  return (
    <div className="flex h-dvh bg-surface-950 text-white">
      {/* Sidebar */}
      {sidebarOpen && (
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onCreate={handleNewChat}
          onDelete={remove}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* Main area */}
      <main className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-surface-800 px-4 py-2.5">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-surface-400 transition hover:bg-surface-800 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {activeConv && (
            <>
              <span className="text-sm font-medium text-white truncate">
                {activeConv.title}
              </span>
              <ModelSelector
                value={activeConv.model as GptModelId}
                onChange={() => {}}
                disabled={hasMessages}
              />
            </>
          )}

          {!activeId && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-surface-400">Model:</span>
              <ModelSelector value={selectedModel} onChange={setSelectedModel} />
            </div>
          )}
        </header>

        {/* Chat area */}
        {activeId ? (
          <>
            <ChatArea
              messages={messages}
              streamingContent={streamingContent}
              isStreaming={isStreaming}
              error={error}
            />
            <MessageInput onSend={handleSend} disabled={isStreaming} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <h2 className="text-xl font-semibold text-white">No conversation selected</h2>
            <p className="text-sm text-surface-400">Create a new chat or select one from the sidebar.</p>
            <button
              onClick={() => handleNewChat(selectedModel)}
              className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-500"
            >
              New Chat
            </button>
          </div>
        )}
      </main>

      {/* Settings modal */}
      {showSettings && apiKey && (
        <SettingsPanel
          apiKey={apiKey}
          onChangeKey={handleChangeKey}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the frontend compiles**

Run: `cd frontend && yarn build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: wire up App.tsx with all components and hooks"
```

---

### Task 23: Install all dependencies and verify

- [ ] **Step 1: Install root dependencies**

Run: `yarn install` (from project root)

- [ ] **Step 2: Verify backend compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Verify frontend builds**

Run: `cd frontend && yarn build`
Expected: Build succeeds, `frontend/dist/` contains `index.html` and assets

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify full project builds successfully"
```
