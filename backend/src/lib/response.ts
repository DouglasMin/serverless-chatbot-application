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
