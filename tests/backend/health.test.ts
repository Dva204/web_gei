import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db/prisma', () => ({ prisma: { $queryRaw: vi.fn() } }));
import { prisma } from '@/server/db/prisma';
import { GET } from '@/app/api/health/db/route';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('database health route', () => {
  it('reports connectivity through the API contract', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);
    const response = await GET(new Request('http://localhost/api/health/db'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.status).toBe('ok');
    expect(body.data.database).toBe('postgresql');
    expect(body.requestId).toBe(response.headers.get('x-request-id'));
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it.each(['development', 'production'])('does not expose connection failures in %s', async environment => {
    vi.stubEnv('NODE_ENV', environment);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('postgresql://private:secret@internal/db SELECT private_data'));
    const response = await GET(new Request('http://localhost/api/health/db'));
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).toContain('SERVICE_UNAVAILABLE');
    expect(body).not.toContain('secret');
    expect(body).not.toContain('SELECT');
    expect(body).not.toContain('internal/db');
  });
});
