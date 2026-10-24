import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { deletePublicMedia, promotePublicMedia, purgePublishedUrls } from './storage';

const mediaKey = /^(?:comic|covers)\/[a-f0-9-]{36}\.webp$/;

function manifestKeys(manifest: Prisma.JsonValue) {
  if (!Array.isArray(manifest)) return [];
  return manifest.flatMap((page) => {
    const key = page && typeof page === 'object' && !Array.isArray(page) ? page.storageKey : null;
    return typeof key === 'string' && mediaKey.test(key) ? [key] : [];
  });
}

export async function storyDeliveryKeys(
  storyId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const story = await db.story.findUnique({
    where: { id: storyId },
    select: {
      coverStorageKey: true,
      chapters: {
        where: { deletedAt: null, publication: { isNot: null } },
        select: { publication: { select: { pageManifest: true } } },
      },
    },
  });
  if (!story) return [];
  return [...new Set([
    ...(story.coverStorageKey && mediaKey.test(story.coverStorageKey) ? [story.coverStorageKey] : []),
    ...story.chapters.flatMap((chapter) => chapter.publication ? manifestKeys(chapter.publication.pageManifest) : []),
  ])];
}

export async function promoteStoryDelivery(
  storyId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const keys = await storyDeliveryKeys(storyId, db);
  await promotePublicMedia(keys);
  return keys;
}

export async function removeStoryDelivery(storyId: string) {
  const keys = await storyDeliveryKeys(storyId);
  await deletePublicMedia(keys);
  return { keys, purge: await purgePublishedUrls(keys) };
}
