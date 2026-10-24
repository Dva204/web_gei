import type {
  ChapterReport,
  ModerationComment,
  Paginated,
  TakedownRequest,
} from '@/features/admin/types';
import { adminApi, queryString } from './http';
import {
  delay,
  writeAudit,
} from '../mocks/store';
export async function listModerationComments(q: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  return adminApi<Paginated<ModerationComment>>('/api/admin/moderation/comments' + queryString(q));
}
export async function moderateComment(
  id: string,
  action: 'approve' | 'hide' | 'delete' | 'pin',
  note = '',
) {
  return adminApi<{ id: string; status: string }>(`/api/admin/moderation/comments/${encodeURIComponent(id)}`, 'PATCH', { action, note });
}
export async function listChapterReports(q: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  return adminApi<Paginated<ChapterReport>>('/api/admin/moderation/reports' + queryString(q));
}
export async function updateChapterReport(
  id: string,
  patch: Partial<ChapterReport>,
) {
  return adminApi<{ id: string; status: string }>(`/api/admin/moderation/reports/${encodeURIComponent(id)}`, 'PATCH', { action: patch.status, note: patch.resolutionNote || 'Đã kiểm tra báo lỗi' });
}
export async function listTakedowns(q: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  return adminApi<Paginated<TakedownRequest>>('/api/admin/moderation/takedowns' + queryString(q));
}
export async function updateTakedown(
  id: string,
  patch: Partial<TakedownRequest> & { logNote: string },
) {
  return adminApi<{ id: string; status: string }>(`/api/admin/moderation/takedowns/${encodeURIComponent(id)}`, 'PATCH', { action: patch.status, note: patch.logNote });
}
export async function hideStoryTemporarily(storyId: string) {
  await delay();
  writeAudit('temporary_hide', 'story', storyId, 'Gỡ tạm thời theo yêu cầu');
}
export async function listChatReports(q: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  return adminApi<Paginated<import('@/features/admin/types').ChatReport>>('/api/admin/chat/reports' + queryString(q));
}
export async function resolveChatReport(id: string, note: string, action: 'resolve' | 'delete_message' | 'pin_message' = 'resolve') {
  return adminApi<{ id: string; status: string }>(`/api/admin/chat/reports/${encodeURIComponent(id)}`, 'PATCH', { action, note });
}
export async function moderateChat(
  action: 'delete' | 'mute' | 'ban' | 'purge_user',
  target: string,
  opts?: { note?: string },
) {
  await delay();
  writeAudit(action, 'chat', target, opts?.note ?? `Xử lý chat: ${action}`);
}
export async function setRoomConfig(
  roomId: string,
  patch: Record<string, unknown>,
) {
  await delay();
  writeAudit('room_config', 'chat_room', roomId, JSON.stringify(patch));
}
