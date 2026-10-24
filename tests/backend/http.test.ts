import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/server/http/errors';
import { apiFailure, apiRoute, apiSuccess } from '@/server/http/response';

afterEach(() => vi.restoreAllMocks());

describe('API response contract', () => {
  it('returns data, a request ID and disables shared/browser caching', async () => {
    const response = apiSuccess({ ready: true }, { requestId: 'test-request' }, 201);
    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-request-id')).toBe('test-request');
    expect(await response.json()).toEqual({ data: { ready: true }, requestId: 'test-request' });
  });

  it.each([
    ['INVALID_REQUEST', 400], ['UNAUTHENTICATED', 401], ['FORBIDDEN', 403],
    ['NOT_FOUND', 404], ['CONFLICT', 409], ['RATE_LIMITED', 429], ['SERVICE_UNAVAILABLE', 503],
  ] as const)('maps %s to status %s', async (code, status) => {
    const response = apiFailure(new ApiError(code, 'Thông báo an toàn'), { requestId: 'test' });
    expect(response.status).toBe(status);
    expect((await response.json()).error).toEqual({ code, message: 'Thông báo an toàn' });
  });

  it('never returns raw errors, stack, connection strings or SQL', async () => {
    const secret = 'postgresql://user:secret@internal/production';
    const response = apiFailure(new Error(secret), { requestId: 'test' });
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).not.toContain(secret);
    expect(body).not.toContain('stack');
    expect(body).toContain('INTERNAL_ERROR');
  });

  it('catches rejected handlers and logs only a generated request ID and safe code', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const route = apiRoute(async () => { throw new Error('password=private'); });
    const response = await route(new Request('http://localhost/api/test', {
      headers: { 'X-Request-ID': 'untrusted-id' },
    }));
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.requestId).not.toBe('untrusted-id');
    expect(response.headers.get('x-request-id')).toBe(body.requestId);
    expect(JSON.stringify(log.mock.calls)).not.toContain('private');
    expect(log).toHaveBeenCalledWith('api_request_failed', {
      requestId: body.requestId, code: 'INTERNAL_ERROR',
    });
  });
});
