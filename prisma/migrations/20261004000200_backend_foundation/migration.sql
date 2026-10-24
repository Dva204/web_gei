BEGIN;

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('member', 'admin', 'mod', 'editor', 'author', 'beta');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'disabled');

-- CreateEnum
CREATE TYPE "AssignmentKind" AS ENUM ('author', 'beta');

-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "title" SET DEFAULT '';

-- AlterTable
ALTER TABLE "ChapterVersion" ADD COLUMN     "pageManifest" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "content" SET DEFAULT '';

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerified" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'member',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryAssignment" (
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "kind" "AssignmentKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryAssignment_pkey" PRIMARY KEY ("userId","storyId","kind")
);

-- CreateTable
CREATE TABLE "ChapterPublication" (
    "chapterId" TEXT NOT NULL,
    "pageManifest" JSONB NOT NULL,
    "revision" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedBy" TEXT,

    CONSTRAINT "ChapterPublication_pkey" PRIMARY KEY ("chapterId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "StoryAssignment_storyId_kind_idx" ON "StoryAssignment"("storyId", "kind");

-- CreateIndex
CREATE INDEX "ChapterPublication_publishedAt_idx" ON "ChapterPublication"("publishedAt");

-- CreateIndex
CREATE INDEX "ChapterPublication_publishedBy_idx" ON "ChapterPublication"("publishedBy");

-- CreateIndex
CREATE INDEX "Bookmark_storyId_idx" ON "Bookmark"("storyId");

-- CreateIndex
CREATE INDEX "ReadingHistory_storyId_idx" ON "ReadingHistory"("storyId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAssignment" ADD CONSTRAINT "StoryAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAssignment" ADD CONSTRAINT "StoryAssignment_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterPublication" ADD CONSTRAINT "ChapterPublication_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterPublication" ADD CONSTRAINT "ChapterPublication_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingHistory" ADD CONSTRAINT "ReadingHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingHistory" ADD CONSTRAINT "ReadingHistory_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Application invariants that Prisma schema syntax cannot represent.
ALTER TABLE "User" ADD CONSTRAINT "User_email_normalized"
  CHECK ("email" = lower(btrim("email")) AND length("email") BETWEEN 3 AND 254);
ALTER TABLE "Session" ADD CONSTRAINT "Session_token_digest"
  CHECK ("tokenHash" ~ '^[a-f0-9]{64}$');
ALTER TABLE "Session" ADD CONSTRAINT "Session_expiry"
  CHECK ("expiresAt" > "createdAt");
ALTER TABLE "Story" ADD CONSTRAINT "Story_nonnegative_metrics"
  CHECK ("rating" BETWEEN 0 AND 5 AND "ratingCount" >= 0 AND "views" >= 0
    AND "totalChapters" >= 0 AND "latestChapter" >= 0);
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_positive_number_revision"
  CHECK ("number" > 0 AND "revision" > 0 AND "wordCount" >= 0);
ALTER TABLE "ChapterPage" ADD CONSTRAINT "ChapterPage_positive_metadata"
  CHECK ("pageNumber" BETWEEN 1 AND 300 AND "width" > 0 AND "height" > 0
    AND ("fileSize" IS NULL OR "fileSize" > 0) AND length(btrim("storageKey")) > 0);
ALTER TABLE "ReadingHistory" ADD CONSTRAINT "ReadingHistory_valid_progress"
  CHECK ("chapter" > 0 AND "scrollRatio" BETWEEN 0 AND 1);
ALTER TABLE "ChapterVersion" ADD CONSTRAINT "ChapterVersion_manifest_array"
  CHECK (CASE WHEN jsonb_typeof("pageManifest") = 'array'
    THEN jsonb_array_length("pageManifest") <= 300 ELSE false END);
ALTER TABLE "ChapterPublication" ADD CONSTRAINT "ChapterPublication_valid_snapshot"
  CHECK ("revision" > 0 AND CASE WHEN jsonb_typeof("pageManifest") = 'array'
    THEN jsonb_array_length("pageManifest") BETWEEN 1 AND 300 ELSE false END);

COMMIT;
