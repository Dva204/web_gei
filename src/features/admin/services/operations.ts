import type {
  AdCampaign,
  AdSlotConfig,
  AdminUser,
  AffiliateLink,
  AuditLog,
  ManualRevenue,
  Paginated,
  Role,
  SiteSettings,
  StatsBundle,
  DashboardOverview,
} from '@/features/admin/types';
import {
  adSlots,
  adminStories,
  affiliateLinks,
  campaigns,
  delay,
  manualRevenue,
  writeAudit,
} from '../mocks/store';
import { adminApi, queryString } from './http';
export async function listUsers(q: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<AdminUser>> {
  return adminApi<Paginated<AdminUser>>('/api/admin/users' + queryString(q));
}
export async function sanctionUser(
  id: string,
  action: 'warn' | 'mute' | 'ban' | 'restore',
  opts?: { reason?: string },
) {
  const reason = opts?.reason?.trim();
  if (!reason || reason.length < 8) throw new Error('Cần nhập lý do ít nhất 8 ký tự.');
  if (action === 'warn') throw new Error('Cảnh báo qua email chưa được triển khai.');
  const status = action === 'restore' ? 'active' : action === 'mute' ? 'suspended' : 'disabled';
  return adminApi<AdminUser>(`/api/admin/users/${encodeURIComponent(id)}/status`, 'PATCH', { status, reason });
}
export async function changeRole(id: string, role: Role, reason: string) {
  if (reason.trim().length < 8) throw new Error('Cần nhập lý do ít nhất 8 ký tự.');
  return adminApi<AdminUser>(`/api/admin/users/${encodeURIComponent(id)}/role`, 'PATCH', { role, reason: reason.trim() });
}
export async function listSlots() {
  await delay();
  return adSlots;
}
export async function saveSlot(input: AdSlotConfig) {
  const i = adSlots.findIndex((x) => x.placement === input.placement);
  if (i >= 0) adSlots[i] = input;
  writeAudit('save', 'ad_slot', input.placement, 'Lưu vị trí quảng cáo');
  return input;
}
export async function listCampaigns() {
  await delay();
  return campaigns;
}
export async function saveCampaign(input: AdCampaign) {
  const i = campaigns.findIndex((x) => x.id === input.id);
  if (i >= 0) campaigns[i] = input;
  else campaigns.push(input);
  writeAudit('save', 'campaign', input.id, 'Lưu chiến dịch');
  return input;
}
export async function listAffiliateLinks() {
  await delay();
  return affiliateLinks;
}
export async function saveAffiliateLink(input: AffiliateLink) {
  if (affiliateLinks.some((x) => x.slug === input.slug && x.id !== input.id))
    throw new Error('Slug đã tồn tại.');
  const i = affiliateLinks.findIndex((x) => x.id === input.id);
  if (i >= 0) affiliateLinks[i] = input;
  else affiliateLinks.push(input);
  writeAudit('save', 'affiliate', input.id, 'Lưu liên kết');
  return input;
}
export async function listManualRevenue() {
  await delay();
  return manualRevenue;
}
export async function saveManualRevenue(input: ManualRevenue) {
  manualRevenue.push(input);
  writeAudit('save', 'revenue', input.id, 'Lưu doanh thu nhập tay');
  return input;
}
export async function getStats(
  range: string,
  _scope?: string,
): Promise<StatsBundle> {
  return adminApi<StatsBundle>('/api/admin/operations/stats' + queryString({ range }));
}
export const getDashboardOverview = () => adminApi<DashboardOverview>('/api/admin/operations/dashboard');
export async function getSettings() {
  return adminApi<SiteSettings>('/api/admin/operations/settings');
}
export async function saveSettings(input: SiteSettings) {
  const { revision, ...settingsInput } = input;
  return adminApi<SiteSettings>('/api/admin/operations/settings', 'PUT', { settings: settingsInput, revision });
}
export async function listAudit(q: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<AuditLog>> {
  return adminApi<Paginated<AuditLog>>('/api/admin/operations/audit' + queryString(q));
}
export async function exportStory(id: string, format: 'txt' | 'md' | 'json') {
  const story = adminStories.find((s) => s.id === id);
  return new Blob(
    [
      format === 'json'
        ? JSON.stringify(story, null, 2)
        : `${story?.title}\n\n${story?.synopsis}`,
    ],
    { type: 'text/plain;charset=utf-8' },
  );
}
export async function exportAll() {
  const data = await adminApi<unknown>('/api/admin/operations/export');
  return new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
}

export type ManagedContent = { id: string; key: string; title: string; content: string; enabled: boolean; revision: number; updatedAt: string };
export type ManagedRedirect = { id: string; sourcePath: string; targetPath: string; statusCode: 301 | 302; enabled: boolean; hitCount: number; revision: number; updatedAt: string };
export const listManagedContent = () => adminApi<ManagedContent[]>('/api/admin/operations/content');
export const saveManagedContent = (input: Partial<ManagedContent>) => adminApi<ManagedContent>('/api/admin/operations/content', input.id ? 'PUT' : 'POST', input);
export const listManagedRedirects = () => adminApi<ManagedRedirect[]>('/api/admin/operations/redirects');
export const saveManagedRedirect = (input: Partial<ManagedRedirect>) => adminApi<ManagedRedirect>('/api/admin/operations/redirects', input.id ? 'PUT' : 'POST', input);
