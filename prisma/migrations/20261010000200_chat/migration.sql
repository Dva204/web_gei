BEGIN;
CREATE TABLE "ChatRoom" (
  "id" TEXT NOT NULL PRIMARY KEY, "slug" TEXT NOT NULL, "name" TEXT NOT NULL,
  "adminOnly" BOOLEAN NOT NULL DEFAULT false, "slowModeSec" INTEGER NOT NULL DEFAULT 5,
  "enabled" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChatRoom_config" CHECK (char_length("slug") BETWEEN 1 AND 80 AND char_length("name") BETWEEN 1 AND 120 AND "slowModeSec" BETWEEN 0 AND 3600)
);
CREATE UNIQUE INDEX "ChatRoom_slug_key" ON "ChatRoom"("slug");
CREATE INDEX "ChatRoom_enabled_createdAt_idx" ON "ChatRoom"("enabled", "createdAt");

CREATE TABLE "ChatMessage" (
  "id" TEXT NOT NULL PRIMARY KEY, "roomId" TEXT NOT NULL, "userId" TEXT, "replyToId" TEXT,
  "content" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'visible', "pinned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ChatMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ChatMessage_state" CHECK ("status" IN ('visible','deleted') AND char_length("content") BETWEEN 1 AND 300)
);
CREATE INDEX "ChatMessage_roomId_status_createdAt_idx" ON "ChatMessage"("roomId", "status", "createdAt");
CREATE INDEX "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt");
CREATE INDEX "ChatMessage_replyToId_idx" ON "ChatMessage"("replyToId");

CREATE TABLE "ChatReport" (
  "id" TEXT NOT NULL PRIMARY KEY, "messageId" TEXT NOT NULL, "reporterId" TEXT NOT NULL,
  "reason" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'open', "resolutionNote" TEXT,
  "resolvedById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChatReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ChatReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ChatReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ChatReport_state" CHECK ("status" IN ('open','resolved') AND char_length("reason") BETWEEN 5 AND 500),
  CONSTRAINT "ChatReport_resolution" CHECK ("status" = 'open' OR char_length(btrim(coalesce("resolutionNote", ''))) >= 3)
);
CREATE UNIQUE INDEX "ChatReport_messageId_reporterId_key" ON "ChatReport"("messageId", "reporterId");
CREATE INDEX "ChatReport_status_createdAt_idx" ON "ChatReport"("status", "createdAt");
CREATE INDEX "ChatReport_resolvedById_status_idx" ON "ChatReport"("resolvedById", "status");

INSERT INTO "ChatRoom" ("id", "slug", "name", "adminOnly", "slowModeSec", "enabled", "updatedAt") VALUES
  ('chat-general', 'chung', 'Trò chuyện chung', false, 5, true, CURRENT_TIMESTAMP),
  ('chat-admin', 'hoi-admin', 'Hỏi Admin', false, 10, true, CURRENT_TIMESTAMP);
COMMIT;
