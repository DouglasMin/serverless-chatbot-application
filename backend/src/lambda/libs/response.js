export function json(statusCode, body) {
    return {
        statusCode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    };
}
export function error(statusCode, message, code) {
    return json(statusCode, { error: message, ...(code && { code }) });
}
