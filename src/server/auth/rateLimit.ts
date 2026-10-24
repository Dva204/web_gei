import 'server-only';
import { createHash } from 'node:crypto';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';

export async function consumeAuthLimit(scope: string, identity: string, limit: number, windowMs = 15 * 60 * 1000) {
  const key = createHash('sha256').update(`auth:v1:${scope}:${identity}`).digest('hex');
  // Atomic across instances. Do not trust spoofable forwarding headers; use global + email caps.
  const rows = await prisma.$queryRaw<{ hits: number }[]>`
    INSERT INTO "AuthRateLimit" ("key", "hits", "windowStart", "expiresAt")
    VALUES (${key}, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ${windowMs}::integer * interval '1 millisecond')
    ON CONFLICT ("key") DO UPDATE SET
      "hits" = CASE WHEN "AuthRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN 1
        ELSE LEAST("AuthRateLimit"."hits" + 1, ${limit + 1}) END,
      "windowStart" = CASE WHEN "AuthRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN EXCLUDED."windowStart" ELSE "AuthRateLimit"."windowStart" END,
      "expiresAt" = CASE WHEN "AuthRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN EXCLUDED."expiresAt" ELSE "AuthRateLimit"."expiresAt" END
    RETURNING "hits"
  `;
  if (rows[0].hits > limit) throw new ApiError('RATE_LIMITED', 'Có quá nhiều lần thử. Vui lòng thử lại sau 15 phút.');
}
