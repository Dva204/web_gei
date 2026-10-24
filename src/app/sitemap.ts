import type { MetadataRoute } from 'next';
import { prisma } from '@/server/db/prisma';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL || 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
  const rows = await prisma.$queryRaw<{ slug: string; updatedAt: Date }[]>`
    SELECT s."slug", s."updatedAt" FROM "Story" s
    WHERE s."deletedAt" IS NULL AND s."visibility" = 'public' AND s."rightsType" IS NOT NULL
      AND (s."rightsType" = 'own' OR length(btrim(coalesce(s."rightsNote", ''))) > 0)
      AND (s."rightsExpiresAt" IS NULL OR s."rightsExpiresAt" > CURRENT_TIMESTAMP)
      AND EXISTS (SELECT 1 FROM "Chapter" c JOIN "ChapterPublication" p ON p."chapterId" = c."id" WHERE c."storyId" = s."id" AND c."deletedAt" IS NULL)
    ORDER BY s."id" LIMIT 49998
  `;
  return [
    { url: base, lastModified: new Date() },
    { url: base + '/bang-xep-hang', lastModified: new Date() },
    ...rows.map((row) => ({
      url: base + '/truyen/' + row.slug,
      lastModified: row.updatedAt,
    })),
  ];
}
