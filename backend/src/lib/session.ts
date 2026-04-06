export function validateSessionId(sessionId: string | undefined): string {
  if (!sessionId) {
    throw new SessionError("Missing x-session-id header");
  }

  const normalized = sessionId.trim();
  const sessionIdPattern = /^[A-Za-z0-9_-]{32,128}$/;

  if (!sessionIdPattern.test(normalized)) {
    throw new SessionError(
      "Invalid x-session-id header (32-128 chars, alphanumeric, underscore, hyphen only)"
    );
  }

  return normalized;
}

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionError";
  }
}
