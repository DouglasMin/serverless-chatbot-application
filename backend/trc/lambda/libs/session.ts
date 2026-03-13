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
