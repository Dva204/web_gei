import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';
import { storyScope } from '../catalog/common';
import { idValue } from '../catalog/input';
import type { SessionUser } from '@/shared/lib/auth/types';
import type { Permission } from '@/shared/lib/auth/permissions';

export async function requireStory(
  user: SessionUser,
  id: string,
  permission: Permission = 'chapters.view',
  db: Prisma.TransactionClient = prisma,
  lock = false,
) {
  idValue(id);
  if (lock)
    await db.$queryRaw`SELECT "id" FROM "Story" WHERE "id" = ${id} FOR UPDATE`;
  const story = await db.story.findFirst({
    where: { id, deletedAt: null, ...storyScope(user, permission) },
  });
  if (!story)
    throw new ApiError(
      'NOT_FOUND',
      'Không tìm thấy truyện hoặc không được phân công.',
    );
  return story;
}
export function chapNumber(value: unknown) {
  if (
    !Number.isSafeInteger(Number(value)) ||
    !/^\d+$/.test(String(value)) ||
    Number(value) < 1 ||
    Number(value) > 1_000_000
  )
    throw new ApiError('INVALID_REQUEST', 'Số chap phải từ 1 đến 1.000.000.');
  return Number(value);
}
