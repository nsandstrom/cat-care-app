import type { APIGatewayProxyEventV2 } from 'aws-lambda';

const HOUSEHOLD_TOKEN = process.env.HOUSEHOLD_TOKEN;

/**
 * Checks the X-Household-Token header (or x-household-token).
 * Returns an error response object if auth fails, or null if OK.
 */
export function requireToken(
  event: APIGatewayProxyEventV2,
): { statusCode: number; body: string } | null {
  if (!HOUSEHOLD_TOKEN) {
    // Token not configured — fail closed
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Auth not configured' }),
    };
  }

  const token =
    event.headers?.['x-household-token'] ??
    event.headers?.['X-Household-Token'];

  if (token !== HOUSEHOLD_TOKEN) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  return null;
}

export function json(statusCode: number, body: unknown): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
