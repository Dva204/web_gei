BEGIN;
CREATE TABLE "Comment" (
  "id" TEXT NOT NULL PRIMARY KEY, "storyId" TEXT NOT NULL, "chapterNumber" INTEGER,
  "parentId" TEXT, "userId" TEXT, "content" TEXT NOT NULL, "isSpoiler" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'pending', "pinned" BOOLEAN NOT NULL DEFAULT false,
  "reportCount" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Comment_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Comment_state" CHECK ("status" IN ('pending','visible','hidden','deleted') AND "reportCount" >= 0 AND char_length("content") BETWEEN 1 AND 2000),
  CONSTRAINT "Comment_chapter" CHECK ("chapterNumber" IS NULL OR "chapterNumber" > 0)
);
CREATE INDEX "Comment_storyId_status_pinned_createdAt_idx" ON "Comment"("storyId", "status", "pinned", "createdAt");
CREATE INDEX "Comment_parentId_createdAt_idx" ON "Comment"("parentId", "createdAt");
CREATE INDEX "Comment_userId_createdAt_idx" ON "Comment"("userId", "createdAt");

CREATE TABLE "CommentLike" (
  "commentId" TEXT NOT NULL, "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("commentId", "userId"),
  CONSTRAINT "CommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommentLike_userId_createdAt_idx" ON "CommentLike"("userId", "createdAt");

CREATE TABLE "CommentReport" (
  "id" TEXT NOT NULL PRIMARY KEY, "commentId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommentReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommentReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommentReport_reason" CHECK (char_length("reason") BETWEEN 5 AND 500)
);
CREATE UNIQUE INDEX "CommentReport_commentId_userId_key" ON "CommentReport"("commentId", "userId");
CREATE INDEX "CommentReport_createdAt_idx" ON "CommentReport"("createdAt");

CREATE TABLE "ChapterReport" (
  "id" TEXT NOT NULL PRIMARY KEY, "storyId" TEXT NOT NULL, "chapterNumber" INTEGER NOT NULL,
  "reporterId" TEXT, "type" TEXT NOT NULL, "message" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'new',
  "assigneeId" TEXT, "resolutionNote" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChapterReport_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ChapterReport_chapter_fkey" FOREIGN KEY ("storyId", "chapterNumber") REFERENCES "Chapter"("storyId", "number") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ChapterReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ChapterReport_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ChapterReport_state" CHECK ("type" IN ('missing','typo','display','takedown','other') AND "status" IN ('new','in_progress','fixed','ignored') AND "chapterNumber" > 0 AND char_length("message") BETWEEN 5 AND 1000),
  CONSTRAINT "ChapterReport_resolution" CHECK ("status" IN ('new','in_progress') OR char_length(btrim(coalesce("resolutionNote", ''))) >= 3)
);
CREATE INDEX "ChapterReport_status_createdAt_idx" ON "ChapterReport"("status", "createdAt");
CREATE INDEX "ChapterReport_storyId_chapterNumber_createdAt_idx" ON "ChapterReport"("storyId", "chapterNumber", "createdAt");
CREATE INDEX "ChapterReport_assigneeId_status_idx" ON "ChapterReport"("assigneeId", "status");

CREATE TABLE "TakedownRequest" (
  "id" TEXT NOT NULL PRIMARY KEY, "storyId" TEXT, "requesterName" TEXT NOT NULL, "requesterEmail" TEXT NOT NULL,
  "organization" TEXT, "targetUrls" JSONB NOT NULL, "description" TEXT NOT NULL, "evidence" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new', "dueAt" TIMESTAMP(3) NOT NULL, "resolutionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TakedownRequest_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TakedownRequest_state" CHECK ("status" IN ('new','content_hidden','investigating','resolved_removed','resolved_rejected') AND jsonb_typeof("targetUrls") = 'array' AND jsonb_array_length("targetUrls") BETWEEN 1 AND 5),
  CONSTRAINT "TakedownRequest_text" CHECK (char_length("requesterName") BETWEEN 2 AND 120 AND char_length("requesterEmail") BETWEEN 3 AND 254 AND char_length("description") BETWEEN 20 AND 5000),
  CONSTRAINT "TakedownRequest_resolution" CHECK ("status" NOT IN ('resolved_removed','resolved_rejected') OR char_length(btrim(coalesce("resolutionNote", ''))) >= 3)
);
CREATE INDEX "TakedownRequest_status_dueAt_idx" ON "TakedownRequest"("status", "dueAt");
CREATE INDEX "TakedownRequest_storyId_createdAt_idx" ON "TakedownRequest"("storyId", "createdAt");
CREATE INDEX "TakedownRequest_requesterEmail_createdAt_idx" ON "TakedownRequest"("requesterEmail", "createdAt");

CREATE TABLE "TakedownEvent" (
  "id" TEXT NOT NULL PRIMARY KEY, "requestId" TEXT NOT NULL, "actorId" TEXT, "action" TEXT NOT NULL,
  "note" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TakedownEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TakedownRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TakedownEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TakedownEvent_note" CHECK (char_length("note") BETWEEN 3 AND 2000)
);
CREATE INDEX "TakedownEvent_requestId_createdAt_idx" ON "TakedownEvent"("requestId", "createdAt");
CREATE INDEX "TakedownEvent_actorId_createdAt_idx" ON "TakedownEvent"("actorId", "createdAt");
COMMIT;
