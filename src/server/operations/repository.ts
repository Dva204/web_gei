import 'server-only';

import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { SessionUser } from '@/shared/lib/auth/types';
import { permissionDecision } from '@/shared/lib/auth/permissions';
import type { DashboardOverview, SiteSettings, StatsBundle } from '@/features/admin/types';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';
import { consumeAuthLimit } from '../auth/rateLimit';
import { actorInTransaction, grant, storyScope, transaction } from '../catalog/common';
import { enumValue, exact, idValue, pageQuery, revisionValue, text } from '../catalog/input';

const configurationId = 'primary';
const defaultSettings: SiteSettings = {
  siteName: 'Vườn Ngôn Tình',
  defaultTheme: 'light',
  chatEnabled: true,
  commentsEnabled: true,
  commentPremoderation: true,
  adsEnabled: true,
  contactEmail: 'contact@vuonngontinh.vn',
  backupReminderDays: 7,
};

function settingsInput(value: unknown): SiteSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('INVALID_REQUEST', 'Cài đặt không hợp lệ.');
  const input = value as Record<string, unknown>;
  exact(input, Object.keys(defaultSettings));
  for (const key of ['chatEnabled', 'commentsEnabled', 'commentPremoderation', 'adsEnabled'] as const) {
    if (typeof input[key] !== 'boolean') throw new ApiError('INVALID_REQUEST', `${key} không hợp lệ.`);
  }
  const reminder = Number(input.backupReminderDays);
  if (!Number.isInteger(reminder) || reminder < 1 || reminder > 365) throw new ApiError('INVALID_REQUEST', 'Chu kỳ nhắc sao lưu phải từ 1 đến 365 ngày.');
  const contactEmail = text(input.contactEmail, 'Email liên hệ', 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw new ApiError('INVALID_REQUEST', 'Email liên hệ không hợp lệ.');
  return {
    siteName: text(input.siteName, 'Tên website', 100, true),
    defaultTheme: enumValue(input.defaultTheme, ['light', 'dark'] as const, 'Giao diện'),
    chatEnabled: input.chatEnabled as boolean,
    commentsEnabled: input.commentsEnabled as boolean,
    commentPremoderation: input.commentPremoderation as boolean,
    adsEnabled: input.adsEnabled as boolean,
    contactEmail,
    backupReminderDays: reminder,
  };
}

async function configuration() {
  const existing = await prisma.siteConfiguration.findUnique({ where: { id: configurationId } });
  if (existing) return existing;
  try {
    return await prisma.siteConfiguration.create({ data: { id: configurationId, payload: defaultSettings as unknown as Prisma.InputJsonValue } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    const concurrent = await prisma.siteConfiguration.findUnique({ where: { id: configurationId } });
    if (!concurrent) throw error;
    return concurrent;
  }
}

export async function getSiteSettings(user: SessionUser) {
  grant(user, 'settings.manage');
  const row = await configuration();
  return { ...settingsInput(row.payload), revision: row.revision };
}

export async function saveSiteSettings(user: SessionUser, input: Record<string, unknown>) {
  exact(input, ['settings', 'revision']);
  const settings = settingsInput(input.settings);
  const expected = revisionValue(input.revision);
  return transaction(async (tx) => {
    const actor = await actorInTransaction(tx, user);
    grant(actor, 'settings.manage');
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('site-configuration:primary'))`;
    const current = await tx.siteConfiguration.findUnique({ where: { id: configurationId }, select: { revision: true } });
    if (!current || current.revision !== expected) throw new ApiError('CONFLICT', 'Cài đặt đã thay đổi ở thiết bị khác. Hãy tải lại.');
    const revision = current.revision + 1;
    await tx.siteConfiguration.update({ where: { id: configurationId }, data: { payload: settings as unknown as Prisma.InputJsonValue, revision, updatedById: actor.id } });

    const ads = await tx.advertisingConfig.findUnique({ where: { id: 'primary' }, select: { payload: true } });
    if (ads?.payload && typeof ads.payload === 'object' && !Array.isArray(ads.payload)) {
      await tx.advertisingConfig.update({ where: { id: 'primary' }, data: { payload: { ...(ads.payload as Prisma.JsonObject), enabled: settings.adsEnabled } as Prisma.InputJsonValue, revision: { increment: 1 }, updatedById: actor.id } });
    }
    await tx.auditLog.create({ data: { userId: actor.id, action: 'settings.save', objectType: 'settings', objectId: configurationId, summary: 'Lưu cài đặt website' } });
    return { ...settings, revision };
  });
}

function contentDto(row: { id: string; key: string; title: string; content: string; enabled: boolean; revision: number; updatedAt: Date }) {
  return { ...row, updatedAt: row.updatedAt.toISOString() };
}
export async function listContent(user: SessionUser) {
  grant(user, 'content.manage');
  return (await prisma.contentEntry.findMany({ orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }] })).map(contentDto);
}
export async function getPublicContent(key: string) {
  const normalized = text(key, 'Khóa nội dung', 80, true);
  const row = await prisma.contentEntry.findFirst({ where: { key: normalized, enabled: true }, select: { key: true, title: true, content: true, updatedAt: true } });
  if (!row) throw new ApiError('NOT_FOUND', 'Không tìm thấy nội dung.');
  return { ...row, updatedAt: row.updatedAt.toISOString() };
}
export async function saveContent(user: SessionUser, raw: Record<string, unknown>) {
  exact(raw, ['id', 'key', 'title', 'content', 'enabled', 'revision']);
  const id = raw.id ? idValue(raw.id) : undefined;
  const key = text(raw.key, 'Khóa nội dung', 80, true);
  if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(key)) throw new ApiError('INVALID_REQUEST', 'Khóa nội dung chỉ dùng chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới.');
  const data = { key, title: text(raw.title, 'Tiêu đề', 160, true), content: text(raw.content, 'Nội dung', 20_000), enabled: raw.enabled === true };
  return transaction(async (tx) => {
    const actor = await actorInTransaction(tx, user); grant(actor, 'content.manage');
    let row;
    if (id) {
      const revision = revisionValue(raw.revision);
      const updated = await tx.contentEntry.updateMany({ where: { id, revision }, data: { ...data, revision: { increment: 1 } } });
      if (!updated.count) throw new ApiError('CONFLICT', 'Nội dung đã thay đổi hoặc không còn tồn tại.');
      row = await tx.contentEntry.findUniqueOrThrow({ where: { id } });
    } else row = await tx.contentEntry.create({ data });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'content.save', objectType: 'content', objectId: row.id, summary: `Lưu nội dung: ${row.title}` } });
    return contentDto(row);
  });
}

function redirectDto(row: { id: string; sourcePath: string; targetPath: string; statusCode: number; enabled: boolean; hitCount: bigint; revision: number; updatedAt: Date }) {
  return { ...row, hitCount: Number(row.hitCount), updatedAt: row.updatedAt.toISOString() };
}
export async function listRedirects(user: SessionUser) {
  grant(user, 'seo.manage');
  return (await prisma.seoRedirect.findMany({ orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }] })).map(redirectDto);
}
function safePath(value: unknown, label: string) {
  const path = text(value, label, 500, true);
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) throw new ApiError('INVALID_REQUEST', `${label} phải là đường dẫn nội bộ bắt đầu bằng /.`);
  return path;
}
function redirectPath(value: unknown, label: string) {
  const path = safePath(value, label);
  if (/[?#]/.test(path) || ['/api', '/admin', '/_next'].some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    throw new ApiError('INVALID_REQUEST', `${label} không được chứa query/hash hoặc trỏ vào khu vực hệ thống.`);
  }
  return path;
}
export async function saveRedirect(user: SessionUser, raw: Record<string, unknown>) {
  exact(raw, ['id', 'sourcePath', 'targetPath', 'statusCode', 'enabled', 'revision']);
  const id = raw.id ? idValue(raw.id) : undefined;
  const statusCode = Number(raw.statusCode);
  if (statusCode !== 301 && statusCode !== 302) throw new ApiError('INVALID_REQUEST', 'Mã chuyển hướng không hợp lệ.');
  const data = { sourcePath: redirectPath(raw.sourcePath, 'Đường dẫn cũ'), targetPath: redirectPath(raw.targetPath, 'Đường dẫn mới'), statusCode, enabled: raw.enabled === true };
  if (data.sourcePath === data.targetPath) throw new ApiError('INVALID_REQUEST', 'Đường dẫn cũ và mới không được trùng nhau.');
  return transaction(async (tx) => {
    const actor = await actorInTransaction(tx, user); grant(actor, 'seo.manage');
    if (data.enabled) {
      const existing = await tx.seoRedirect.findMany({ where: { enabled: true, ...(id ? { id: { not: id } } : {}) }, select: { sourcePath: true, targetPath: true } });
      const graph = new Map(existing.map((item) => [item.sourcePath, item.targetPath]));
      graph.set(data.sourcePath, data.targetPath);
      const visited = new Set<string>();
      let cursor: string | undefined = data.sourcePath;
      while (cursor && graph.has(cursor)) {
        if (visited.has(cursor)) throw new ApiError('CONFLICT', 'Các chuyển hướng tạo thành vòng lặp.');
        visited.add(cursor);
        cursor = graph.get(cursor);
      }
    }
    let row;
    if (id) {
      const revision = revisionValue(raw.revision);
      const updated = await tx.seoRedirect.updateMany({ where: { id, revision }, data: { ...data, revision: { increment: 1 } } });
      if (!updated.count) throw new ApiError('CONFLICT', 'Chuyển hướng đã thay đổi hoặc không còn tồn tại.');
      row = await tx.seoRedirect.findUniqueOrThrow({ where: { id } });
    } else row = await tx.seoRedirect.create({ data });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'seo.redirect.save', objectType: 'seo_redirect', objectId: row.id, summary: `${row.sourcePath} → ${row.targetPath}` } });
    return redirectDto(row);
  });
}

export async function recordPageView(user: SessionUser | null, raw: Record<string, unknown>) {
  exact(raw, ['storyId', 'path', 'clientId']);
  const storyId = raw.storyId ? idValue(raw.storyId) : undefined;
  const path = safePath(raw.path, 'Đường dẫn');
  const clientId = text(raw.clientId, 'Mã trình duyệt', 80, true);
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(clientId)) throw new ApiError('INVALID_REQUEST', 'Mã trình duyệt không hợp lệ.');
  const visitorHash = createHash('sha256').update(`view:v1:${clientId}`).digest('hex');
  await consumeAuthLimit('page-view', visitorHash, 400, 24 * 60 * 60 * 1000);
  const now = new Date();
  const bucket = new Date(now); bucket.setUTCMinutes(0, 0, 0);
  try {
    await prisma.$transaction(async (tx) => {
      if (storyId) {
        const story = await tx.story.findFirst({ where: { id: storyId, deletedAt: null, visibility: 'public' }, select: { id: true } });
        if (!story) throw new ApiError('NOT_FOUND', 'Không tìm thấy truyện.');
      }
      await tx.pageView.create({ data: { storyId, userId: user?.id, visitorHash, path, bucket } });
      if (storyId) await tx.story.update({ where: { id: storyId }, data: { views: { increment: 1 } } });
    });
    return { recorded: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { recorded: false };
    throw error;
  }
}

function rangeDays(value: string | null) {
  return value === '90d' ? 90 : value === '30d' ? 30 : 7;
}
export async function getOperationalStats(user: SessionUser, range: string | null): Promise<StatsBundle> {
  const decision = permissionDecision(user.role, 'stats.content');
  if (decision === 'deny' || decision === 'beta') throw new ApiError('FORBIDDEN', 'Bạn không có quyền xem thống kê.');
  const days = rangeDays(range), since = new Date(Date.now() - days * 86400000), previous = new Date(since.getTime() - days * 86400000);
  const scope = storyScope(user, 'stats.content');
  const storyWhere = Object.keys(scope).length ? { story: scope } : {};
  const [views, priorViews, readers, topStories, rawSeries] = await Promise.all([
    prisma.pageView.count({ where: { ...storyWhere, occurredAt: { gte: since } } }),
    prisma.pageView.count({ where: { ...storyWhere, occurredAt: { gte: previous, lt: since } } }),
    prisma.pageView.groupBy({ by: ['visitorHash'], where: { ...storyWhere, occurredAt: { gte: since } } }),
    prisma.story.findMany({ where: { ...scope, deletedAt: null }, orderBy: { views: 'desc' }, take: 5, select: { title: true, views: true } }),
    prisma.pageView.findMany({ where: { ...storyWhere, occurredAt: { gte: since } }, select: { occurredAt: true } }),
  ]);
  const bins = Array.from({ length: days }, (_, index) => ({ at: new Date(since.getTime() + index * 86400000), value: 0 }));
  for (const row of rawSeries) {
    const index = Math.min(days - 1, Math.max(0, Math.floor((row.occurredAt.getTime() - since.getTime()) / 86400000)));
    bins[index].value += 1;
  }
  return {
    views,
    readers: readers.length,
    avgReadMinutes: 0,
    previousDelta: priorViews ? Math.round(((views - priorViews) / priorViews) * 1000) / 10 : views ? 100 : 0,
    series: bins.map((row) => ({ label: `${row.at.getUTCDate()}/${row.at.getUTCMonth() + 1}`, value: row.value })),
    topStories: topStories.map((row) => ({ name: row.title, views: Number(row.views) })),
    dropOff: [],
  };
}

const emptyStats = (): StatsBundle => ({ views: 0, readers: 0, avgReadMinutes: 0, previousDelta: 0, series: [], topStories: [], dropOff: [] });
export async function getDashboardOverview(user: SessionUser): Promise<DashboardOverview> {
  grant(user, 'dashboard.view');
  const storyDecision = permissionDecision(user.role, 'stories.view');
  const scope: Prisma.StoryWhereInput | null = storyDecision === 'grant' ? {} : storyDecision === 'author' || storyDecision === 'beta' ? { assignments: { some: { userId: user.id, kind: storyDecision } } } : null;
  const base: Prisma.StoryWhereInput = { ...(scope || {}), deletedAt: null };
  const rightsProblem: Prisma.StoryWhereInput = { OR: [
    { rightsType: null },
    { rightsType: { not: 'own' }, rightsNote: null },
    { rightsExpiresAt: { lte: new Date() } },
  ] };
  const inThirtyDays = new Date(Date.now() + 30 * 86400000);
  const canStats = permissionDecision(user.role, 'stats.content');
  const [stats, comments, takedowns, total, publicStories, editing, missingRights, expiringRights] = await Promise.all([
    canStats !== 'deny' && canStats !== 'beta' ? getOperationalStats(user, '7d') : Promise.resolve(emptyStats()),
    permissionDecision(user.role, 'comments.moderate') === 'grant' ? prisma.comment.count({ where: { status: 'pending' } }) : 0,
    permissionDecision(user.role, 'takedowns.view') === 'grant' ? prisma.takedownRequest.count({ where: { status: 'new' } }) : 0,
    scope ? prisma.story.count({ where: base }) : 0,
    scope ? prisma.story.count({ where: { ...base, visibility: 'public' } }) : 0,
    scope ? prisma.story.count({ where: { ...base, visibility: { in: ['draft', 'hidden'] } } }) : 0,
    scope ? prisma.story.count({ where: { ...base, ...rightsProblem } }) : 0,
    scope ? prisma.story.findMany({ where: { ...base, rightsExpiresAt: { gt: new Date(), lte: inThirtyDays } }, select: { id: true, title: true, rightsExpiresAt: true }, orderBy: { rightsExpiresAt: 'asc' }, take: 8 }) : [],
  ]);
  return {
    stats,
    queues: { comments, takedowns },
    stories: { total, public: publicStories, editing, missingRights },
    expiringRights: expiringRights.map((row) => ({ id: row.id, title: row.title, rightsExpiresAt: row.rightsExpiresAt!.toISOString() })),
  };
}

export async function listOperationalAudit(user: SessionUser, url: URL) {
  const decision = permissionDecision(user.role, 'audit.all');
  const own = decision !== 'grant' && permissionDecision(user.role, 'audit.own') === 'grant';
  if (decision !== 'grant' && !own) throw new ApiError('FORBIDDEN', 'Bạn không có quyền xem nhật ký.');
  const { page, pageSize } = pageQuery(url.searchParams, 100);
  const search = (url.searchParams.get('search') || '').trim().slice(0, 100);
  const where: Prisma.AuditLogWhereInput = { ...(own ? { userId: user.id } : {}), ...(search ? { OR: [{ summary: { contains: search, mode: 'insensitive' } }, { action: { contains: search, mode: 'insensitive' } }, { objectType: { contains: search, mode: 'insensitive' } }] } : {}) };
  const [items, total] = await Promise.all([prisma.auditLog.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }), prisma.auditLog.count({ where })]);
  return { items: items.map((row) => ({ id: row.id, at: row.createdAt.toISOString(), userId: row.userId ?? 'system', action: row.action, objectType: row.objectType, objectId: row.objectId, summary: row.summary })), page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function exportSafeCatalog(user: SessionUser) {
  grant(user, 'backup.manage');
  const [configurationRow, content, redirects, authors, genres, stories, chapters] = await Promise.all([
    configuration(),
    prisma.contentEntry.findMany(), prisma.seoRedirect.findMany(), prisma.author.findMany({ where: { deletedAt: null } }), prisma.genre.findMany({ where: { deletedAt: null } }),
    prisma.story.findMany({ where: { deletedAt: null }, include: { genres: true } }),
    prisma.chapter.findMany({ where: { deletedAt: null }, select: { id: true, storyId: true, number: true, title: true, status: true, publishedAt: true, revision: true } }),
  ]);
  return {
    format: 'vuon-ngon-tinh-content-export', version: 1, exportedAt: new Date().toISOString(),
    notice: 'Bản xuất nội dung; không thay thế backup PostgreSQL và kho media.',
    settings: settingsInput(configurationRow.payload), content: content.map(contentDto), redirects: redirects.map(redirectDto),
    authors, genres, stories: stories.map(({ views, ...row }) => ({ ...row, views: Number(views) })), chapters,
  };
}
