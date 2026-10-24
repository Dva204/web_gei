BEGIN;
CREATE TABLE "AdvertisingConfig" (
  "id" TEXT NOT NULL PRIMARY KEY, "payload" JSONB NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1,
  "updatedById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdvertisingConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AdvertisingConfig_revision" CHECK ("revision" > 0 AND jsonb_typeof("payload") = 'object')
);
CREATE INDEX "AdvertisingConfig_updatedById_updatedAt_idx" ON "AdvertisingConfig"("updatedById", "updatedAt");

CREATE TABLE "AdvertisingEvent" (
  "id" TEXT NOT NULL PRIMARY KEY, "creativeId" TEXT NOT NULL, "placement" TEXT NOT NULL,
  "kind" TEXT NOT NULL, "visitorHash" TEXT NOT NULL, "userId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdvertisingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AdvertisingEvent_values" CHECK ("kind" IN ('impression','click') AND char_length("creativeId") BETWEEN 1 AND 128 AND char_length("placement") BETWEEN 1 AND 80 AND char_length("visitorHash") = 64)
);
CREATE INDEX "AdvertisingEvent_occurredAt_idx" ON "AdvertisingEvent"("occurredAt");
CREATE INDEX "AdvertisingEvent_placement_kind_occurredAt_idx" ON "AdvertisingEvent"("placement", "kind", "occurredAt");
CREATE INDEX "AdvertisingEvent_creativeId_kind_occurredAt_idx" ON "AdvertisingEvent"("creativeId", "kind", "occurredAt");
CREATE INDEX "AdvertisingEvent_visitorHash_occurredAt_idx" ON "AdvertisingEvent"("visitorHash", "occurredAt");
COMMIT;
