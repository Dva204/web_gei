-- B9 operational configuration, managed content, redirects, and privacy-safe view telemetry.
CREATE TABLE "SiteConfiguration" (
  "id" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteConfiguration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SiteConfiguration_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "SiteConfiguration_payload_check" CHECK (jsonb_typeof("payload") = 'object')
);

CREATE TABLE "ContentEntry" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContentEntry_values_check" CHECK (char_length("key") BETWEEN 1 AND 80 AND char_length("title") BETWEEN 1 AND 160 AND char_length("content") <= 20000 AND "revision" > 0)
);

CREATE TABLE "SeoRedirect" (
  "id" TEXT NOT NULL,
  "sourcePath" TEXT NOT NULL,
  "targetPath" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL DEFAULT 301,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "hitCount" BIGINT NOT NULL DEFAULT 0,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeoRedirect_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SeoRedirect_values_check" CHECK ("statusCode" IN (301, 302) AND char_length("sourcePath") BETWEEN 1 AND 500 AND char_length("targetPath") BETWEEN 1 AND 500 AND left("sourcePath", 1) = '/' AND left("targetPath", 1) = '/' AND "revision" > 0)
);

CREATE TABLE "PageView" (
  "id" TEXT NOT NULL,
  "storyId" TEXT,
  "userId" TEXT,
  "visitorHash" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "bucket" TIMESTAMP(3) NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PageView_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PageView_values_check" CHECK (char_length("visitorHash") = 64 AND char_length("path") BETWEEN 1 AND 500 AND left("path", 1) = '/')
);

CREATE UNIQUE INDEX "ContentEntry_key_key" ON "ContentEntry"("key");
CREATE INDEX "ContentEntry_enabled_updatedAt_idx" ON "ContentEntry"("enabled", "updatedAt");
CREATE UNIQUE INDEX "SeoRedirect_sourcePath_key" ON "SeoRedirect"("sourcePath");
CREATE INDEX "SeoRedirect_enabled_updatedAt_idx" ON "SeoRedirect"("enabled", "updatedAt");
CREATE UNIQUE INDEX "PageView_visitorHash_path_bucket_key" ON "PageView"("visitorHash", "path", "bucket");
CREATE INDEX "PageView_occurredAt_idx" ON "PageView"("occurredAt");
CREATE INDEX "PageView_storyId_occurredAt_idx" ON "PageView"("storyId", "occurredAt");
CREATE INDEX "PageView_userId_occurredAt_idx" ON "PageView"("userId", "occurredAt");
CREATE INDEX "SiteConfiguration_updatedById_updatedAt_idx" ON "SiteConfiguration"("updatedById", "updatedAt");

ALTER TABLE "SiteConfiguration" ADD CONSTRAINT "SiteConfiguration_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
