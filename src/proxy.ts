import type { NextFetchEvent, NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';

type RedirectRule = { id: string; targetPath: string; statusCode: number };
type RedirectCache = { expiresAt: number; rules: Map<string, RedirectRule> };

let cache: RedirectCache = { expiresAt: 0, rules: new Map() };
let refresh: Promise<RedirectCache> | null = null;

async function redirectRules() {
  if (cache.expiresAt > Date.now()) return cache.rules;
  if (!refresh) {
    refresh = prisma.seoRedirect.findMany({ where: { enabled: true }, select: { id: true, sourcePath: true, targetPath: true, statusCode: true } })
      .then((rows) => ({ expiresAt: Date.now() + 60_000, rules: new Map(rows.map((row) => [row.sourcePath, { id: row.id, targetPath: row.targetPath, statusCode: row.statusCode }])) }))
      .then((next) => (cache = next))
      .catch(() => ({ ...cache, expiresAt: Date.now() + 5_000 }))
      .finally(() => { refresh = null; });
  }
  return (await refresh).rules;
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const rule = (await redirectRules()).get(request.nextUrl.pathname);
  if (!rule) return NextResponse.next();
  const destination = request.nextUrl.clone();
  destination.pathname = rule.targetPath;
  event.waitUntil(prisma.seoRedirect.updateMany({ where: { id: rule.id, enabled: true }, data: { hitCount: { increment: 1 } } }).catch(() => undefined));
  return NextResponse.redirect(destination, rule.statusCode);
}

export const config = {
  matcher: ['/((?!api|admin|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*$).*)'],
};
