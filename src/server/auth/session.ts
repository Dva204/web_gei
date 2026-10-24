import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';
import type { SessionUser } from '@/shared/lib/auth/types';

export const sessionCookieName = () => process.env.NODE_ENV === 'production' ? '__Host-vuon-session' : 'vuon-session';
export const tokenDigest = (token: string) => createHash('sha256').update(token).digest('hex');
export const newSessionToken = () => randomBytes(32).toString('base64url');
export const safeUserSelect = { id: true, email: true, name: true, role: true, createdAt: true } as const;
type UserRow = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;
export const userDto = (row: UserRow): SessionUser => ({ ...row, createdAt: row.createdAt.toISOString() });

export function requestToken(request: Request) {
  const pairs = (request.headers.get('cookie') || '').split(';').map(value => value.trim());
  const prefix = sessionCookieName() + '=';
  const matches = pairs.filter(value => value.startsWith(prefix));
  return matches.length === 1 ? matches[0].slice(prefix.length) : undefined;
}
export async function sessionUser(token: string | undefined): Promise<SessionUser | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenDigest(token) },
    select: { expiresAt: true, user: { select: { ...safeUserSelect, status: true } } },
  });
  if (!session || session.expiresAt <= new Date() || session.user.status !== 'active') return null;
  const user = session.user;
  return userDto({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
}
export async function currentPageUser() {
  const values = (await cookies()).getAll(sessionCookieName());
  return sessionUser(values.length === 1 ? values[0].value : undefined);
}
export async function requireUser(request: Request) {
  const user = await sessionUser(requestToken(request));
  if (!user) throw new ApiError('UNAUTHENTICATED', 'Vui lòng đăng nhập.');
  return user;
}
export async function issueSession(tx: Prisma.TransactionClient, userId: string, previousToken?: string) {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  if (previousToken && /^[A-Za-z0-9_-]{43}$/.test(previousToken)) {
    await tx.session.deleteMany({ where: { tokenHash: tokenDigest(previousToken) } });
  }
  await tx.session.deleteMany({ where: { userId, expiresAt: { lte: new Date() } } });
  const older = await tx.session.findMany({ where: { userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: 9, select: { id: true } });
  if (older.length) await tx.session.deleteMany({ where: { userId, id: { in: older.map(row => row.id) } } });
  await tx.session.create({ data: { tokenHash: tokenDigest(token), userId, expiresAt } });
  return { token, expiresAt };
}
function secureCookie(request: Request) {
  return process.env.NODE_ENV === 'production' || request.headers.get('origin')?.startsWith('https://') === true;
}
export function setSessionCookie(response: NextResponse, request: Request, token: string, expiresAt: Date) {
  response.cookies.set(sessionCookieName(), token, { httpOnly: true, secure: secureCookie(request), sameSite: 'lax', path: '/', expires: expiresAt });
}
export function clearSessionCookie(response: NextResponse, request: Request) {
  response.cookies.set(sessionCookieName(), '', { httpOnly: true, secure: secureCookie(request), sameSite: 'lax', path: '/', maxAge: 0 });
}
