import 'server-only';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { publicError } from './errors';

export interface ApiContext {
  requestId: string;
}

function responseHeaders(requestId: string) {
  return { 'Cache-Control': 'no-store', 'X-Request-ID': requestId };
}

export function apiSuccess<T>(data: T, context: ApiContext, status = 200) {
  return NextResponse.json(
    { data, requestId: context.requestId },
    { status, headers: responseHeaders(context.requestId) },
  );
}

export function apiFailure(error: unknown, context: ApiContext) {
  const safe = publicError(error);
  return NextResponse.json(
    { error: { code: safe.code, message: safe.message }, requestId: context.requestId },
    { status: safe.status, headers: { ...responseHeaders(context.requestId), ...(safe.status === 429 ? { 'Retry-After': '900' } : {}) } },
  );
}

export function apiRoute(handler: (request: Request, context: ApiContext) => Promise<Response>) {
  return async (request: Request) => {
    // Generate locally; incoming IDs are untrusted and never copied to logs/headers.
    const context = { requestId: randomUUID() };
    try {
      return await handler(request, context);
    } catch (error) {
      // Do not log raw errors: SQL/connection strings can contain credentials or user data.
      console.error('api_request_failed', {
        requestId: context.requestId,
        code: publicError(error).code,
      });
      return apiFailure(error, context);
    }
  };
}
