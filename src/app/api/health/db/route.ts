import { prisma } from '@/server/db/prisma';
import { ApiError } from '@/server/http/errors';
import { apiRoute, apiSuccess } from '@/server/http/response';

export const dynamic = 'force-dynamic';

export const GET = apiRoute(async (_request, context) => {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return apiSuccess({
      status: 'ok',
      database: 'postgresql',
      latencyMs: Date.now() - startedAt,
    }, context);
  } catch {
    throw new ApiError('SERVICE_UNAVAILABLE', 'Database hiện chưa sẵn sàng.');
  }
});
