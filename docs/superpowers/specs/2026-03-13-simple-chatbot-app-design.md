# Simple Chatbot App — Design Spec

## Overview

A modern SaaS-style chatbot web application powered by OpenAI's GPT models. Users bring their own OpenAI API key. The app provides a ChatGPT-like conversational experience with streaming responses, conversation history, and per-conversation model selection.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS v4 |
| Static Hosting | S3 + CloudFront |
| Backend | TypeScript Lambda functions |
| API | API Gateway (REST) + Lambda Function URL (streaming) |
| Database | DynamoDB (single table) |
| IaC | Serverless Framework (two separate stacks) |
| AI | OpenAI Chat Completions API (`gpt-5.4`, `gpt-5.4-pro`, `gpt-5-mini`, `gpt-5-nano`) |

## Architecture

```
Browser (React SPA)
  ├─► CloudFront ─► S3 (static assets)
  ├─► API Gateway ─► Lambda (CRUD: conversations)
  └─► Lambda Function URL (streaming: chatStream)
                          ├─► DynamoDB (read/write messages)
                          └─► OpenAI API (stream: true)
```

## Project Structure

```
simple-chatbot-app/
├── backend/
│   ├── src/
│   │   ├── functions/
│   │   │   ├── chatStream.ts          # POST - stream chat completion (Lambda Function URL)
│   │   │   ├── createConversation.ts   # POST /conversations
│   │   │   ├── getConversation.ts      # GET  /conversations/{id}
│   │   │   ├── listConversations.ts    # GET  /conversations
│   │   │   ├── updateConversation.ts   # PATCH /conversations/{id}
│   │   │   └── deleteConversation.ts   # DELETE /conversations/{id}
│   │   ├── lib/
│   │   │   ├── openai.ts              # OpenAI client factory (uses per-request API key)
│   │   │   ├── dynamo.ts              # DynamoDB client wrapper
│   │   │   ├── session.ts             # Session ID validation (cryptographically random, 128-bit)
│   │   │   └── summarizer.ts          # Conversation summarization logic
│   │   └── types/
│   │       └── index.ts               # Backend-internal types (DynamoDB item shapes, service types)
│   ├── serverless.yml                  # Backend stack: Lambdas, DynamoDB, API Gateway
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx            # Conversation list, new chat button
│   │   │   ├── ChatArea.tsx           # Message display, streaming output
│   │   │   ├── MessageInput.tsx       # Text input, model selector, send button
│   │   │   ├── ModelSelector.tsx      # GPT model dropdown
│   │   │   ├── ApiKeySetup.tsx        # API key onboarding/settings screen
│   │   │   └── SettingsPanel.tsx      # Manage API key, preferences
│   │   ├── hooks/
│   │   │   ├── useChat.ts            # Chat streaming logic
│   │   │   ├── useConversations.ts   # CRUD conversation hooks
│   │   │   └── useApiKey.ts          # API key localStorage management
│   │   ├── lib/
│   │   │   └── api.ts                # API client (calls backend endpoints)
│   │   ├── app.css                    # Tailwind v4 entry (@import "tailwindcss", @theme)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── serverless.yml                  # Frontend stack: S3, CloudFront
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── shared/
│   └── types.ts                        # API contract types (request/response shapes shared by frontend & backend)
├── docs/
│   └── openapi.yaml                    # OpenAPI 3.0.0 spec
└── package.json                        # Root: yarn workspaces, deploy scripts
```

## API Endpoints

### REST (API Gateway)

| Function | Method | Path | Description |
|---|---|---|---|
| `createConversation` | POST | `/conversations` | Create new conversation with selected model |
| `listConversations` | GET | `/conversations` | List conversations for a session |
| `getConversation` | GET | `/conversations/{id}` | Get conversation with all messages |
| `updateConversation` | PATCH | `/conversations/{id}` | Update conversation metadata (title) |
| `deleteConversation` | DELETE | `/conversations/{id}` | Delete a conversation |

All REST endpoints receive `x-session-id` header to identify the user session. Session IDs must be cryptographically random (128-bit minimum) to prevent guessing.

### CORS

API Gateway and the Lambda Function URL must both return appropriate CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Headers`, `Access-Control-Allow-Methods`) to allow requests from the CloudFront-hosted frontend.

### Streaming (Lambda Function URL)

| Function | Method | Description |
|---|---|---|
| `chatStream` | POST | Stream GPT response. Receives API key via `Authorization` header. |

**`chatStream` request:**

Headers:
```
Authorization: Bearer sk-...
x-session-id: <sessionId>
```

Body:
```json
{
  "conversationId": "conv_abc123",
  "message": "Hello, how are you?"
}
```

**`chatStream` response:** Chunked streaming response (SSE-style) with token-by-token output.

**`chatStream` side effects:**
- Saves user message and completed assistant response to DynamoDB
- On the first message of a conversation, auto-generates a title from the first few words of the user's message (truncated to 50 chars) and updates the conversation metadata
- Triggers summarization if conversation exceeds token limit (see Memory Strategy)

## DynamoDB Schema

### Table: `chatbot-conversations`

| PK | SK | Attributes |
|---|---|---|
| `CONV#<conversationId>` | `METADATA` | `sessionId`, `title`, `model`, `summaryContext`, `createdAt`, `updatedAt` |
| `CONV#<conversationId>` | `MSG#<ulid>` | `role`, `content`, `createdAt` |

Notes:
- `sessionId` is only present on `METADATA` items (not on `MSG#` items) so the GSI only indexes conversation metadata
- `MSG#<ulid>` uses ULID for lexicographic time-ordering (requires `ulidx` package)

### GSI: `SessionIndex`

| PK | SK | Purpose |
|---|---|---|
| `sessionId` | `createdAt` | List all conversations for a session |

Only `METADATA` items are projected into this GSI since only they carry the `sessionId` attribute.

## Memory Strategy (Context Summarization)

Based on [OpenAI's session memory pattern](https://developers.openai.com/cookbook/examples/agents_sdk/session_memory/).

1. Keep last N turns verbatim (configurable, default: `MAX_RECENT_TURNS = 3`)
2. When conversation history exceeds `CONTEXT_TOKEN_LIMIT` (default: 4000), trigger summarization
3. Token counting uses approximate heuristic: `content.length / 4` (no tiktoken dependency for v1)
4. Summarization runs synchronously within the `chatStream` request, before sending the prompt to OpenAI
5. Call GPT to summarize older messages into a structured summary
6. Store summary in `summaryContext` field on conversation metadata in DynamoDB
7. Each `chatStream` request sends: `[system prompt, summary message, ...recent turns, new user message]`

This ensures conversation continuity while keeping token costs bounded.

## API Key Management (Bring Your Own Key)

- **No server-side API key storage** — the OpenAI API key is never persisted in DynamoDB or any backend store
- **Frontend stores the key in `localStorage`** — user enters it once on first visit
- **Key sent via `Authorization` header** — `Authorization: Bearer sk-...` on `chatStream` requests only. This ensures standard log redaction by AWS observability tools.
- **Settings panel** — user can view (masked), change, or remove their key at any time
- **Validation** — on entry, make a lightweight OpenAI API call (e.g., list models) to verify the key is valid

### UX Flow
1. First visit → API key onboarding screen ("Enter your OpenAI API key to get started")
2. Key validated and saved to `localStorage`
3. User proceeds to chat interface
4. Key can be managed via settings panel (gear icon)

## Frontend UX

### Layout
```
┌──────────────┬─────────────────────────────┐
│  Sidebar     │  Chat Area                  │
│              │                             │
│  [+ New Chat]│  Messages (scrollable)      │
│              │                             │
│  Conv 1      │  User: Hello                │
│  Conv 2  ◄── │  Bot:  Hi! How can I help?  │
│  Conv 3      │                             │
│              │                             │
│              │                             │
│              ├─────────────────────────────│
│  [Settings]  │  [Model: gpt-5.4 ▼]        │
│              │  [Type a message...] [Send] │
└──────────────┴─────────────────────────────┘
```

### Design
- **Tailwind CSS v4** — modern SaaS aesthetic, CSS-based config (`@import "tailwindcss"` + `@theme` blocks in `app.css`)
- Clean lines, subtle shadows, smooth transitions
- Dark/light mode support
- Responsive (mobile-friendly sidebar collapse)

### Key Interactions
- **Model selector** — dropdown when creating a new conversation; locks after first message (shown as badge)
- **Streaming** — assistant response appears token-by-token
- **Auto-title** — `createConversation` sets default title "New conversation"; `chatStream` updates it after the first user message using the first ~50 characters of the message
- **Session** — auto-generated cryptographically random session ID in `localStorage`, no login

## Error Handling

### OpenAI API Errors
- **401 (invalid key):** Return clear error to frontend; frontend shows "Invalid API key" and prompts re-entry
- **429 (rate limit):** Return error with retry-after info; frontend shows "Rate limited, please wait"
- **500/503 (OpenAI outage):** Return error; frontend shows "OpenAI is temporarily unavailable"
- **Mid-stream failure:** Save any partial assistant response to DynamoDB with a `partial: true` flag; frontend shows the partial response with an error indicator

### DynamoDB Errors
- Tables use on-demand capacity (no provisioned throughput errors)
- Transient errors: retry with exponential backoff (AWS SDK default)

### Frontend Error States
- Network errors: toast notification with retry option
- Missing API key: redirect to onboarding screen
- Invalid session: generate new session ID

## Deployment

### Commands
```bash
yarn deploy              # Deploy both stacks (backend + frontend)
yarn deploy:backend      # Deploy backend stack only
yarn deploy:frontend     # Deploy frontend stack only (build + S3 sync + CloudFront invalidation)
yarn deploy:function -f chatStream   # Redeploy single Lambda function
```

### Serverless Framework
- **Backend stack** (`backend/serverless.yml`): Lambdas, API Gateway, DynamoDB table, Lambda Function URL
- **Frontend stack** (`frontend/serverless.yml`): S3 bucket, CloudFront distribution

## OpenAPI Spec

An OpenAPI 3.0.0 spec will be written to `docs/openapi.yaml` before implementation, mapping each endpoint to its designated `.ts` file. This spec serves as the contract between frontend and backend.
