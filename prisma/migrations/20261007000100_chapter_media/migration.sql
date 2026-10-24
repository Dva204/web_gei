BEGIN;
ALTER TABLE "Chapter" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "scheduledBy" TEXT, ADD COLUMN "scheduledManifest" JSONB;
CREATE TABLE "MediaAsset" (
 "id" TEXT NOT NULL PRIMARY KEY, "storyId" TEXT NOT NULL, "storageKey" TEXT NOT NULL,
 "kind" TEXT NOT NULL, "width" INTEGER NOT NULL, "height" INTEGER NOT NULL,
 "fileSize" INTEGER NOT NULL, "mimeType" TEXT NOT NULL DEFAULT 'image/webp',
 "alt" TEXT NOT NULL DEFAULT '', "createdBy" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "MediaAsset_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "MediaAsset_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT "MediaAsset_dimensions" CHECK ("width" > 0 AND "height" > 0 AND "fileSize" > 0 AND "fileSize" <= 16777216),
 CONSTRAINT "MediaAsset_kind" CHECK ("kind" IN ('comic', 'covers') AND "mimeType" = 'image/webp')
);
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");
CREATE INDEX "MediaAsset_storyId_kind_createdAt_idx" ON "MediaAsset"("storyId", "kind", "createdAt");
CREATE TABLE "ImportJob" (
 "id" TEXT NOT NULL PRIMARY KEY, "storyId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'preview', "payload" JSONB NOT NULL, "created" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL, "committedAt" TIMESTAMP(3),
 CONSTRAINT "ImportJob_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "ImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "ImportJob_state" CHECK ("status" IN ('preview', 'committed') AND "created" >= 0 AND jsonb_typeof("payload") = 'array')
);
CREATE INDEX "ImportJob_userId_storyId_createdAt_idx" ON "ImportJob"("userId", "storyId", "createdAt");
CREATE INDEX "ImportJob_expiresAt_idx" ON "ImportJob"("expiresAt");
COMMIT;
