import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';
import { enumValue, exact, idValue, pageQuery, text } from '../catalog/input';
import { actorInTransaction, grant, transaction } from '../catalog/common';
import { consumeAuthLimit } from '../auth/rateLimit';
import type { SessionUser, UserRole } from '@/shared/lib/auth/types';

const authorSelect = { id: true, name: true, role: true } as const;
type MessageRow = Prisma.ChatMessageGetPayload<{ include: { author: { select: typeof authorSelect } } }>;

function messageDto(row: MessageRow) {
  return {
    id: row.id,
    roomId: row.roomId,
    user: row.author ?? { id: 'deleted', name: 'Tài khoản đã xóa', role: 'member' as UserRole },
    content: row.status === 'deleted' ? 'Tin nhắn đã được gỡ.' : row.content,
    replyToId: row.replyToId ?? undefined,
    isPinned: row.pinned,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

function canEnterAdminRoom(user: SessionUser | null) {
  return Boolean(user && user.role !== 'member');
}

export async function listRooms(user: SessionUser | null) {
  const rooms = await prisma.chatRoom.findMany({
    where: { enabled: true, ...(canEnterAdminRoom(user) ? {} : { adminOnly: false }) },
    orderBy: { createdAt: 'asc' },
  });
  return rooms.map((room) => ({ id: room.id, slug: room.slug, name: room.name, adminOnly: room.adminOnly, slowModeSec: room.slowModeSec }));
}

async function availableRoom(roomId: unknown, user: SessionUser | null) {
  const room = await prisma.chatRoom.findFirst({ where: { id: idValue(roomId), enabled: true } });
  if (!room || (room.adminOnly && !canEnterAdminRoom(user))) throw new ApiError('NOT_FOUND', 'Phòng chat không tồn tại.');
  return room;
}

export async function listMessages(roomId: unknown, url: URL, user: SessionUser | null) {
  const room = await availableRoom(roomId, user);
  const limitRaw = url.searchParams.get('limit') || '40';
  if (!/^\d+$/.test(limitRaw) || Number(limitRaw) < 1 || Number(limitRaw) > 100) throw new ApiError('INVALID_REQUEST', 'Số tin nhắn không hợp lệ.');
  const limit = Number(limitRaw);
  const afterRaw = url.searchParams.get('after');
  const beforeId = url.searchParams.get('before');
  let timeWhere: Prisma.DateTimeFilter | undefined;
  if (afterRaw) {
    const after = new Date(afterRaw);
    if (!Number.isFinite(+after)) throw new ApiError('INVALID_REQUEST', 'Mốc đồng bộ không hợp lệ.');
    timeWhere = { gt: after };
  } else if (beforeId) {
    const before = await prisma.chatMessage.findFirst({ where: { id: idValue(beforeId), roomId: room.id }, select: { createdAt: true } });
    if (before) timeWhere = { lt: before.createdAt };
  }
  const rows = await prisma.chatMessage.findMany({
    where: { roomId: room.id, status: { in: ['visible', 'deleted'] }, ...(timeWhere ? { createdAt: timeWhere } : {}) },
    include: { author: { select: authorSelect } },
    orderBy: { createdAt: afterRaw ? 'asc' : 'desc' },
    take: limit + 1,
  });
  const more = rows.length > limit;
  const items = rows.slice(0, limit);
  if (!afterRaw) items.reverse();
  const active = await prisma.chatMessage.findMany({ where: { roomId: room.id, userId: { not: null }, createdAt: { gt: new Date(Date.now() - 5 * 60000) } }, distinct: ['userId'], select: { userId: true }, take: 1000 });
  return { items: items.map(messageDto), hasMore: more, online: active.length };
}

export async function pinnedMessage(roomId: unknown, user: SessionUser | null) {
  const room = await availableRoom(roomId, user);
  const row = await prisma.chatMessage.findFirst({ where: { roomId: room.id, pinned: true, status: 'visible' }, include: { author: { select: authorSelect } }, orderBy: { createdAt: 'desc' } });
  return row ? messageDto(row) : null;
}

export async function sendMessage(user: SessionUser, roomId: unknown, input: Record<string, unknown>) {
  exact(input, ['content', 'replyToId']);
  await consumeAuthLimit('chat-send', user.id, 100);
  const room = await availableRoom(roomId, user);
  const content = text(input.content, 'Tin nhắn', 300, true);
  let replyToId: string | null = null;
  if (input.replyToId) {
    replyToId = idValue(input.replyToId);
    const reply = await prisma.chatMessage.findFirst({ where: { id: replyToId, roomId: room.id, status: 'visible' }, select: { id: true } });
    if (!reply) throw new ApiError('INVALID_REQUEST', 'Tin nhắn trả lời không hợp lệ.');
  }
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
    const fresh = await tx.user.findUnique({ where: { id: user.id }, select: { status: true } });
    if (!fresh || fresh.status !== 'active') throw new ApiError('UNAUTHENTICATED', 'Tài khoản không còn hoạt động.');
    const last = await tx.chatMessage.findFirst({ where: { roomId: room.id, userId: user.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
    if (last && +last.createdAt + room.slowModeSec * 1000 > Date.now()) throw new ApiError('RATE_LIMITED', `Phòng đang bật chế độ chậm ${room.slowModeSec} giây.`);
    const row = await tx.chatMessage.create({ data: { roomId: room.id, userId: user.id, content, replyToId }, include: { author: { select: authorSelect } } });
    return messageDto(row);
  });
}

export async function reportMessage(user: SessionUser, messageId: unknown, input: Record<string, unknown>) {
  exact(input, ['reason']);
  await consumeAuthLimit('chat-report', user.id, 20);
  const id = idValue(messageId);
  const message = await prisma.chatMessage.findFirst({ where: { id, status: 'visible', room: { enabled: true } }, select: { userId: true } });
  if (!message) throw new ApiError('NOT_FOUND', 'Tin nhắn không còn hiển thị.');
  if (message.userId === user.id) throw new ApiError('INVALID_REQUEST', 'Bạn không thể báo cáo tin nhắn của mình.');
  const reason = text(input.reason, 'Lý do', 500, true);
  if (reason.length < 5) throw new ApiError('INVALID_REQUEST', 'Lý do cần ít nhất 5 ký tự.');
  try { await prisma.chatReport.create({ data: { messageId: id, reporterId: user.id, reason } }); }
  catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ApiError('CONFLICT', 'Bạn đã báo cáo tin nhắn này.'); throw error; }
  return { reported: true };
}

export async function listChatReports(user: SessionUser, url: URL) {
  grant(user, 'chat.manage');
  const { page, pageSize } = pageQuery(url.searchParams);
  const status = url.searchParams.get('status') || undefined;
  if (status) enumValue(status, ['open', 'resolved'] as const, 'Trạng thái');
  const where = status ? { status } : {};
  const [items, total] = await Promise.all([
    prisma.chatReport.findMany({ where, include: { message: { include: { author: { select: authorSelect }, room: { select: { name: true } } } }, reporter: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.chatReport.count({ where }),
  ]);
  return { items: items.map((row) => ({ id: row.id, messageId: row.messageId, roomId: row.message.roomId, roomName: row.message.room.name, reason: row.reason, reportedBy: row.reporter.name, message: { user: row.message.author?.name ?? 'Tài khoản đã xóa', content: row.message.content, createdAt: row.message.createdAt.toISOString() }, status: row.status, resolutionNote: row.resolutionNote ?? undefined })), page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function resolveChatReport(user: SessionUser, reportId: unknown, input: Record<string, unknown>) {
  exact(input, ['action', 'note']);
  const id = idValue(reportId), note = text(input.note, 'Lý do xử lý', 2000, true);
  if (note.length < 3) throw new ApiError('INVALID_REQUEST', 'Lý do xử lý cần ít nhất 3 ký tự.');
  const action = enumValue(input.action, ['resolve', 'delete_message', 'pin_message'] as const, 'Thao tác');
  return transaction(async (tx) => {
    const actor = await actorInTransaction(tx, user); grant(actor, 'chat.manage');
    const report = await tx.chatReport.findUnique({ where: { id }, select: { messageId: true } });
    if (!report) throw new ApiError('NOT_FOUND', 'Không tìm thấy báo cáo chat.');
    if (action === 'delete_message') await tx.chatMessage.update({ where: { id: report.messageId }, data: { status: 'deleted', pinned: false } });
    if (action === 'pin_message') await tx.chatMessage.update({ where: { id: report.messageId }, data: { status: 'visible', pinned: true } });
    const row = await tx.chatReport.update({ where: { id }, data: { status: 'resolved', resolutionNote: note, resolvedById: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: `chat.${action}`, objectType: 'chat_report', objectId: id, summary: note } });
    return { id, status: row.status };
  });
}
