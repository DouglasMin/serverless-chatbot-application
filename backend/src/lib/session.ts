const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

export function validateSessionId(sessionId: string | undefined): string {
  if (!sessionId || !SESSION_ID_PATTERN.test(sessionId)) {
    throw new SessionError(
      "Missing or invalid x-session-id header (32-128 chars, alphanumeric, hyphen, underscore)"
    );
  }
  return sessionId;
}

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionError";
  }
}
