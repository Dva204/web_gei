BEGIN;
CREATE TABLE "AuthRateLimit" (
  "key" TEXT NOT NULL,
  "hits" INTEGER NOT NULL DEFAULT 0,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "AuthRateLimit_positive_window" CHECK ("hits" >= 0 AND "expiresAt" > "windowStart")
);
CREATE INDEX "AuthRateLimit_expiresAt_idx" ON "AuthRateLimit"("expiresAt");
COMMIT;
