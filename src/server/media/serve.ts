import 'server-only';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';
import { requestToken, sessionUser } from '../auth/session';
import { requireStory } from '../chapters/access';
import { publicWhere } from '../catalog/public';
import { privateMediaStorage } from './storage';

export async function serveMedia(request: Request, segments: string[]) {
  const key = segments.join('/');
  if (!/^(?:comic|covers)\/[a-f0-9-]{36}\.webp$/.test(key))
    throw new ApiError('NOT_FOUND', 'Không tìm thấy ảnh.');
  const asset = await prisma.mediaAsset.findUnique({
    where: { storageKey: key },
    select: { storyId: true },
  });
  if (!asset) throw new ApiError('NOT_FOUND', 'Không tìm thấy ảnh.');
  const story = await prisma.story.findFirst({
    where: { id: asset.storyId, ...publicWhere() },
    select: { coverStorageKey: true, rightsType: true, rightsNote: true },
  });
  let accessible = Boolean(
    story &&
    (story.rightsType === 'own' || story.rightsNote?.trim()) &&
    story.coverStorageKey === key,
  );
  if (
    !accessible &&
    story &&
    (story.rightsType === 'own' || story.rightsNote?.trim())
  ) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT c."id" FROM "Chapter" c JOIN "ChapterPublication" p ON p."chapterId" = c."id"
      WHERE c."storyId" = ${asset.storyId} AND c."deletedAt" IS NULL
        AND EXISTS (SELECT 1 FROM jsonb_array_elements(p."pageManifest") item WHERE item->>'storageKey' = ${key}) LIMIT 1
    `;
    accessible = rows.length > 0;
  }
  if (!accessible) {
    const user = await sessionUser(requestToken(request));
    if (!user) throw new ApiError('NOT_FOUND', 'Không tìm thấy ảnh.');
    try {
      await requireStory(user, asset.storyId, 'chapters.view');
    } catch {
      throw new ApiError('NOT_FOUND', 'Không tìm thấy ảnh.');
    }
  }
  const data = await privateMediaStorage().get(key);
  // No shared/browser cache: hiding a story or revoking a publication must affect subsequent requests.
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': 'image/webp',
      'Content-Length': String(data.length),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });
}
