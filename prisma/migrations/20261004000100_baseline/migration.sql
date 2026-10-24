-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('ongoing', 'full', 'paused');

-- CreateEnum
CREATE TYPE "StoryVisibility" AS ENUM ('draft', 'public', 'hidden');

-- CreateEnum
CREATE TYPE "EndingType" AS ENUM ('HE', 'SE', 'OE');

-- CreateEnum
CREATE TYPE "ChapterStatus" AS ENUM ('draft', 'translating', 'editing', 'beta', 'ready', 'published', 'scheduled');

-- CreateEnum
CREATE TYPE "RightsType" AS ENUM ('own', 'agreement', 'public_domain', 'open_license', 'other');

-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "coverStorageKey" TEXT,
    "status" "StoryStatus" NOT NULL DEFAULT 'ongoing',
    "visibility" "StoryVisibility" NOT NULL DEFAULT 'draft',
    "ending" "EndingType",
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "views" BIGINT NOT NULL DEFAULT 0,
    "totalChapters" INTEGER NOT NULL DEFAULT 0,
    "latestChapter" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "rightsType" "RightsType",
    "rightsNote" TEXT,
    "rightsExpiresAt" TIMESTAMP(3),
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryGenre" (
    "storyId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "StoryGenre_pkey" PRIMARY KEY ("storyId","genreId")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ChapterStatus" NOT NULL DEFAULT 'draft',
    "publishAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterPage" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fileSize" INTEGER,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChapterPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterVersion" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "note" TEXT,
    "savedBy" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChapterVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "scrollRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Author_slug_key" ON "Author"("slug");

-- CreateIndex
CREATE INDEX "Author_name_idx" ON "Author"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_slug_key" ON "Genre"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Story_slug_key" ON "Story"("slug");

-- CreateIndex
CREATE INDEX "Story_status_visibility_idx" ON "Story"("status", "visibility");

-- CreateIndex
CREATE INDEX "Story_updatedAt_idx" ON "Story"("updatedAt");

-- CreateIndex
CREATE INDEX "Story_views_idx" ON "Story"("views");

-- CreateIndex
CREATE INDEX "Story_featured_updatedAt_idx" ON "Story"("featured", "updatedAt");

-- CreateIndex
CREATE INDEX "StoryGenre_genreId_storyId_idx" ON "StoryGenre"("genreId", "storyId");

-- CreateIndex
CREATE INDEX "Chapter_storyId_status_number_idx" ON "Chapter"("storyId", "status", "number");

-- CreateIndex
CREATE INDEX "Chapter_publishedAt_idx" ON "Chapter"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_storyId_number_key" ON "Chapter"("storyId", "number");

-- CreateIndex
CREATE INDEX "ChapterPage_chapterId_pageNumber_idx" ON "ChapterPage"("chapterId", "pageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterPage_chapterId_pageNumber_key" ON "ChapterPage"("chapterId", "pageNumber");

-- CreateIndex
CREATE INDEX "ChapterVersion_chapterId_savedAt_idx" ON "ChapterVersion"("chapterId", "savedAt");

-- CreateIndex
CREATE INDEX "Bookmark_userId_createdAt_idx" ON "Bookmark"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_storyId_key" ON "Bookmark"("userId", "storyId");

-- CreateIndex
CREATE INDEX "ReadingHistory_userId_updatedAt_idx" ON "ReadingHistory"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingHistory_userId_storyId_key" ON "ReadingHistory"("userId", "storyId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_objectType_objectId_idx" ON "AuditLog"("objectType", "objectId");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryGenre" ADD CONSTRAINT "StoryGenre_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryGenre" ADD CONSTRAINT "StoryGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterPage" ADD CONSTRAINT "ChapterPage_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterVersion" ADD CONSTRAINT "ChapterVersion_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
