import { apiRoute, apiSuccess } from '@/server/http/response';
import { requireUser } from '@/server/auth/session';
import { grant } from '@/server/catalog/common';
import { prisma } from '@/server/db/prisma';
export const runtime = 'nodejs';
export const GET = apiRoute(async (request, context) => {
  const user = await requireUser(request);
  grant(user, 'stories.assign');
  const users = await prisma.user.findMany({
    where: { status: 'active', role: { in: ['author', 'beta'] } },
    orderBy: { name: 'asc' },
    take: 100,
    select: { id: true, name: true, role: true },
  });
  return apiSuccess(users, context);
});
