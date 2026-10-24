import 'server-only';

import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';
import { publicWhere } from '../catalog/public';
import { enumValue, exact, idValue, pageQuery, text } from '../catalog/input';
import { actorInTransaction, grant, transaction } from '../catalog/common';
import { consumeAuthLimit } from '../auth/rateLimit';
import type { SessionUser } from '@/shared/lib/auth/types';
import type { UserRole } from '@/shared/lib/auth/types';
import { removeStoryDelivery } from '../media/lifecycle';

const commentStatuses = ['pending', 'visible', 'hidden', 'deleted'] as const;
const reportStatuses = ['new', 'in_progress', 'fixed', 'ignored'] as const;
const takedownStatuses = ['new', 'content_hidden', 'investigating', 'resolved_removed', 'resolved_rejected'] as const;
const reportTypes = ['missing', 'typo', 'display', 'takedown', 'other'] as const;

function positiveInteger(value: unknown, label: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 1)
    throw new ApiError('INVALID_REQUEST', `${label} không hợp lệ.`);
  return Number(value);
}
function boundedText(value: unknown, label: string, min: number, max: number) {
  const result = text(value, label, max, true);
  if (result.length < min) throw new ApiError('INVALID_REQUEST', `${label} cần ít nhất ${min} ký tự.`);
  return result;
}

async function publicStory(storyId: unknown) {
  const id = idValue(storyId);
  const story = await prisma.story.findFirst({
    where: { id, ...publicWhere() },
    select: { id: true, slug: true },
  });
  if (!story) throw new ApiError('NOT_FOUND', 'Truyện không còn công khai.');
  return story;
}

const commentInclude = (userId?: string) => ({
  author: { select: { id: true, name: true, role: true } },
  _count: { select: { likes: true } },
  ...(userId ? { likes: { where: { userId }, select: { userId: true } } } : {}),
}) satisfies Prisma.CommentInclude;

type CommentRow = {
  id: string; storyId: string; chapterNumber: number | null; parentId: string | null;
  content: string; isSpoiler: boolean; status: string; pinned: boolean; createdAt: Date;
  author: { id: string; name: string; role: UserRole } | null;
  _count: { likes: number };
  likes?: { userId: string }[];
};
function commentDto(row: CommentRow, userId?: string) {
  return {
    id: row.id,
    storyId: row.storyId,
    chapterNumber: row.chapterNumber ?? undefined,
    parentId: row.parentId ?? undefined,
    user: row.author ?? { id: 'deleted', name: 'Tài khoản đã xóa', role: 'member' },
    content: row.content,
    isSpoiler: row.isSpoiler,
    likes: row._count.likes,
    likedByMe: Boolean(userId && row.likes?.length),
    status: row.status,
    pinned: row.pinned,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listPublicComments(url: URL, user: SessionUser | null) {
  const storyId = idValue(url.searchParams.get('storyId'));
  await publicStory(storyId);
  const chapterRaw = url.searchParams.get('chapterNumber');
  const chapterNumber = chapterRaw ? positiveInteger(Number(chapterRaw), 'Chap') : undefined;
  const sort = url.searchParams.get('sort') === 'top' ? 'top' : 'new';
  const cursor = url.searchParams.get('cursor') || undefined;
  const rows = await prisma.comment.findMany({
    where: {
      storyId,
      ...(chapterNumber ? { chapterNumber } : {}),
      OR: [{ status: 'visible' }, ...(user ? [{ status: 'pending', userId: user.id }] : [])],
    },
    include: commentInclude(user?.id),
    orderBy: sort === 'top'
      ? [{ pinned: 'desc' }, { likes: { _count: 'desc' } }, { createdAt: 'desc' }]
      : [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 11,
    ...(cursor ? { cursor: { id: idValue(cursor) }, skip: 1 } : {}),
  });
  const more = rows.length > 10;
  const items = rows.slice(0, 10);
  return { items: items.map((row) => commentDto(row, user?.id)), nextCursor: more ? items.at(-1)?.id : undefined };
}

export async function createComment(user: SessionUser, input: Record<string, unknown>) {
  exact(input, ['storyId', 'chapterNumber', 'parentId', 'content', 'isSpoiler']);
  await consumeAuthLimit('comment-create', user.id, 20);
  const story = await publicStory(input.storyId);
  const chapterNumber = input.chapterNumber == null ? null : positiveInteger(input.chapterNumber, 'Chap');
  if (chapterNumber) {
    const chapter = await prisma.chapter.findFirst({ where: { storyId: story.id, number: chapterNumber, deletedAt: null, publication: { isNot: null } }, select: { id: true } });
    if (!chapter) throw new ApiError('NOT_FOUND', 'Chap không còn được xuất bản.');
  }
  let parentId: string | null = null;
  if (input.parentId) {
    parentId = idValue(input.parentId);
    const parent = await prisma.comment.findFirst({ where: { id: parentId, storyId: story.id, parentId: null, status: 'visible' }, select: { id: true } });
    if (!parent) throw new ApiError('INVALID_REQUEST', 'Bình luận trả lời không hợp lệ.');
  }
  if (typeof input.isSpoiler !== 'boolean') throw new ApiError('INVALID_REQUEST', 'Nhãn spoiler không hợp lệ.');
  const row = await prisma.comment.create({
    data: { storyId: story.id, chapterNumber, parentId, userId: user.id, content: text(input.content, 'Bình luận', 2000, true), isSpoiler: input.isSpoiler },
    include: commentInclude(user.id),
  });
  return commentDto(row, user.id);
}

export async function toggleCommentLike(user: SessionUser, commentId: unknown) {
  await consumeAuthLimit('comment-like', user.id, 120);
  const id = idValue(commentId);
  const comment = await prisma.comment.findFirst({ where: { id, status: 'visible', story: publicWhere() }, select: { id: true } });
  if (!comment) throw new ApiError('NOT_FOUND', 'Bình luận không còn hiển thị.');
  const key = { commentId_userId: { commentId: id, userId: user.id } };
  const current = await prisma.commentLike.findUnique({ where: key });
  if (current) await prisma.commentLike.delete({ where: key });
  else await prisma.commentLike.create({ data: { commentId: id, userId: user.id } });
  const likes = await prisma.commentLike.count({ where: { commentId: id } });
  return { id, liked: !current, likes };
}

export async function reportComment(user: SessionUser, commentId: unknown, input: Record<string, unknown>) {
  exact(input, ['reason']);
  await consumeAuthLimit('comment-report', user.id, 20);
  const id = idValue(commentId);
  const comment = await prisma.comment.findFirst({ where: { id, status: 'visible', story: publicWhere() }, select: { userId: true } });
  if (!comment) throw new ApiError('NOT_FOUND', 'Bình luận không còn hiển thị.');
  if (comment.userId === user.id) throw new ApiError('INVALID_REQUEST', 'Bạn không thể báo cáo bình luận của mình.');
  try {
    await prisma.$transaction(async (tx) => {
      await tx.commentReport.create({ data: { commentId: id, userId: user.id, reason: boundedText(input.reason, 'Lý do', 5, 500) } });
      const updated = await tx.comment.update({ where: { id }, data: { reportCount: { increment: 1 } }, select: { reportCount: true } });
      if (updated.reportCount >= 3) await tx.comment.update({ where: { id }, data: { status: 'pending' } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ApiError('CONFLICT', 'Bạn đã báo cáo bình luận này.');
    throw error;
  }
  return { reported: true };
}

export async function createChapterReport(user: SessionUser, input: Record<string, unknown>) {
  exact(input, ['storyId', 'chapterNumber', 'type', 'message']);
  await consumeAuthLimit('chapter-report', user.id, 15);
  const story = await publicStory(input.storyId);
  const chapterNumber = positiveInteger(input.chapterNumber, 'Chap');
  const chapter = await prisma.chapter.findFirst({ where: { storyId: story.id, number: chapterNumber, deletedAt: null, publication: { isNot: null } }, select: { id: true } });
  if (!chapter) throw new ApiError('NOT_FOUND', 'Chap không còn được xuất bản.');
  const row = await prisma.chapterReport.create({ data: { storyId: story.id, chapterNumber, reporterId: user.id, type: enumValue(input.type, reportTypes, 'Loại báo lỗi'), message: boundedText(input.message, 'Mô tả lỗi', 5, 1000) } });
  return { id: row.id, status: row.status, createdAt: row.createdAt.toISOString() };
}

function safeUrl(value: unknown) {
  const raw = text(value, 'Đường dẫn', 1000, true);
  try { const url = new URL(raw); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); return url.toString(); }
  catch { throw new ApiError('INVALID_REQUEST', 'Đường dẫn nội dung không hợp lệ.'); }
}

export async function createTakedown(input: Record<string, unknown>) {
  exact(input, ['requesterName', 'requesterEmail', 'organization', 'targetUrls', 'description', 'evidence']);
  const email = text(input.requesterEmail, 'Email', 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError('INVALID_REQUEST', 'Email không hợp lệ.');
  await consumeAuthLimit('takedown-global', '*', 50);
  await consumeAuthLimit('takedown-email', createHash('sha256').update(email).digest('hex'), 3, 24 * 60 * 60 * 1000);
  if (!Array.isArray(input.targetUrls) || input.targetUrls.length < 1 || input.targetUrls.length > 5) throw new ApiError('INVALID_REQUEST', 'Cần từ 1 đến 5 đường dẫn nội dung.');
  const targetUrls = [...new Set(input.targetUrls.map(safeUrl))];
  let storyId: string | null = null;
  for (const raw of targetUrls) {
    const match = new URL(raw).pathname.match(/^\/truyen\/([^/]+)/);
    if (match) { let slug = match[1]; try { slug = decodeURIComponent(slug); } catch { continue; } const story = await prisma.story.findUnique({ where: { slug }, select: { id: true } }); if (story) { storyId = story.id; break; } }
  }
  const row = await prisma.takedownRequest.create({ data: {
    storyId,
    requesterName: boundedText(input.requesterName, 'Họ tên', 2, 120), requesterEmail: email,
    organization: text(input.organization, 'Tổ chức', 200) || null, targetUrls,
    description: boundedText(input.description, 'Mô tả yêu cầu', 20, 5000), evidence: text(input.evidence, 'Minh chứng', 5000) || null,
    dueAt: new Date(Date.now() + 7 * 86400000),
  } });
  return { id: row.id, status: row.status, dueAt: row.dueAt.toISOString() };
}

export async function listModeration(kind: string, user: SessionUser, url: URL) {
  grant(user, kind === 'comments' ? 'comments.moderate' : kind === 'reports' ? 'reports.view' : 'takedowns.view');
  const { page, pageSize } = pageQuery(url.searchParams);
  const status = url.searchParams.get('status') || undefined;
  const skip = (page - 1) * pageSize;
  if (kind === 'comments') {
    if (status) enumValue(status, commentStatuses, 'Trạng thái');
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      prisma.comment.findMany({ where, include: { author: { select: { id: true, name: true, role: true } }, story: { select: { title: true } } }, orderBy: [{ reportCount: 'desc' }, { createdAt: 'desc' }], skip, take: pageSize }),
      prisma.comment.count({ where }),
    ]);
    return { items: items.map((row) => ({ id: row.id, storyId: row.storyId, storyTitle: row.story.title, chapterNumber: row.chapterNumber ?? undefined, user: row.author ?? { id: 'deleted', name: 'Tài khoản đã xóa', role: 'member' }, content: row.content, flags: row.reportCount ? ['reported'] : [], reportCount: row.reportCount, status: row.status, createdAt: row.createdAt.toISOString() })), page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }
  if (kind === 'reports') {
    if (status) enumValue(status, reportStatuses, 'Trạng thái');
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      prisma.chapterReport.findMany({ where, include: { story: { select: { title: true } } }, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      prisma.chapterReport.count({ where }),
    ]);
    return { items: items.map((row) => ({ ...row, storyTitle: row.story.title, assigneeId: row.assigneeId ?? undefined, resolutionNote: row.resolutionNote ?? undefined, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), story: undefined })), page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }
  if (kind !== 'takedowns') throw new ApiError('NOT_FOUND', 'Hàng đợi không tồn tại.');
  if (status) enumValue(status, takedownStatuses, 'Trạng thái');
  const where = status ? { status } : {};
  const [items, total] = await Promise.all([
    prisma.takedownRequest.findMany({ where, include: { events: { orderBy: { createdAt: 'asc' } } }, orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }], skip, take: pageSize }),
    prisma.takedownRequest.count({ where }),
  ]);
  return { items: items.map((row) => ({ ...row, storyId: row.storyId ?? undefined, organization: row.organization ?? undefined, evidence: row.evidence ?? undefined, resolutionNote: row.resolutionNote ?? undefined, targetUrls: row.targetUrls, log: row.events.map((event) => ({ at: event.createdAt.toISOString(), by: event.actorId ?? 'system', action: event.note })), events: undefined, dueAt: row.dueAt.toISOString(), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })), page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function moderate(kind: string, idInput: unknown, user: SessionUser, input: Record<string, unknown>) {
  exact(input, ['action', 'note']);
  const id = idValue(idInput);
  const note = text(input.note, 'Lý do xử lý', 2000, true);
  if (note.length < 3) throw new ApiError('INVALID_REQUEST', 'Lý do xử lý cần ít nhất 3 ký tự.');
  let purgeStoryId: string | null = null;
  const result = await transaction(async (tx) => {
    const actor = await actorInTransaction(tx, user);
    if (kind === 'comments') {
      grant(actor, 'comments.moderate');
      const action = enumValue(input.action, ['approve', 'hide', 'delete', 'pin'] as const, 'Thao tác');
      const current = await tx.comment.findUnique({ where: { id }, select: { id: true, pinned: true } });
      if (!current) throw new ApiError('NOT_FOUND', 'Không tìm thấy bình luận.');
      const row = await tx.comment.update({ where: { id }, data: action === 'pin' ? { pinned: !current.pinned, status: 'visible' } : { status: action === 'approve' ? 'visible' : action === 'delete' ? 'deleted' : 'hidden' } });
      await tx.auditLog.create({ data: { userId: actor.id, action: `comments.${action}`, objectType: 'comment', objectId: id, summary: note } });
      return { id, status: row.status, pinned: row.pinned };
    }
    if (kind === 'reports') {
      grant(actor, 'reports.manage');
      const action = enumValue(input.action, reportStatuses.slice(1), 'Trạng thái');
      const row = await tx.chapterReport.update({ where: { id }, data: { status: action, assigneeId: actor.id, resolutionNote: note } });
      await tx.auditLog.create({ data: { userId: actor.id, action: `reports.${action}`, objectType: 'chapter_report', objectId: id, summary: note } });
      return { id, status: row.status };
    }
    if (kind !== 'takedowns') throw new ApiError('NOT_FOUND', 'Hàng đợi không tồn tại.');
    grant(actor, 'takedowns.hide');
    const action = enumValue(input.action, takedownStatuses.slice(1), 'Trạng thái');
    const request = await tx.takedownRequest.findUnique({ where: { id }, select: { storyId: true } });
    if (!request) throw new ApiError('NOT_FOUND', 'Không tìm thấy yêu cầu gỡ.');
    if ((action === 'content_hidden' || action === 'resolved_removed') && request.storyId) {
      await tx.story.update({ where: { id: request.storyId }, data: { visibility: 'hidden', revision: { increment: 1 } } });
      purgeStoryId = request.storyId;
    }
    const row = await tx.takedownRequest.update({ where: { id }, data: { status: action, resolutionNote: note } });
    await tx.takedownEvent.create({ data: { requestId: id, actorId: actor.id, action, note } });
    await tx.auditLog.create({ data: { userId: actor.id, action: `takedowns.${action}`, objectType: 'takedown', objectId: id, summary: note } });
    return { id, status: row.status };
  });
  if (purgeStoryId) await removeStoryDelivery(purgeStoryId);
  return result;
}
