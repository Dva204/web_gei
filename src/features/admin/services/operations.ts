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
} from '@/features/admin/types';
import {
  adSlots,
  adminStories,
  adminUsers,
  affiliateLinks,
  auditLogs,
  campaigns,
  delay,
  manualRevenue,
  settings,
  setSettings,
  writeAudit,
} from '../mocks/store';
import {
  getAdvertisingSnapshot,
  updateAdvertising,
} from '@/features/advertising/lib/store';
import { getAdminSession } from './auth';
export async function listUsers(q: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<AdminUser>> {
  await delay();
  const all = adminUsers.filter(
    (u) =>
      (!q.search || u.name.toLowerCase().includes(q.search.toLowerCase())) &&
      (!q.role || u.role === q.role) &&
      (!q.status || u.status === q.status),
  );
  return {
    items: all,
    page: 1,
    pageSize: 20,
    total: all.length,
    totalPages: 1,
  };
}
export async function sanctionUser(
  id: string,
  action: 'warn' | 'mute' | 'ban' | 'restore',
  opts?: { reason?: string },
) {
  if (!opts?.reason?.trim()) throw new Error('Cần nhập lý do.');
  await delay();
  const u = adminUsers.find((x) => x.id === id);
  if (u)
    u.status =
      action === 'restore'
        ? 'active'
        : action === 'ban'
          ? 'banned'
          : action === 'mute'
            ? 'muted'
            : u.status;
  writeAudit(action, 'user', id, opts.reason);
}
export async function changeRole(id: string, role: Role) {
  await delay();
  const u = adminUsers.find((x) => x.id === id);
  if (u) u.role = role;
  writeAudit('change_role', 'user', id, `Đổi vai trò thành ${role}`);
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
  _range: string,
  _scope?: string,
): Promise<StatsBundle> {
  await delay();
  return {
    views: 128450,
    readers: 34920,
    avgReadMinutes: 18.4,
    previousDelta: 12.6,
    series: Array.from({ length: 7 }, (_, i) => ({
      label: `T${i + 2}`,
      value: 12000 + i * 1700 + (i % 2) * 2300,
    })),
    topStories: adminStories
      .slice(0, 5)
      .map((s) => ({ name: s.title, views: s.views })),
    dropOff: adminStories
      .slice(4, 9)
      .map((s, i) => ({ story: s.title, chapter: i + 3, rate: 18 + i * 4.2 })),
  };
}
export async function getSettings() {
  await delay();
  return {
    ...settings,
    adsEnabled: getAdvertisingSnapshot()?.enabled ?? settings.adsEnabled,
  };
}
export async function saveSettings(input: SiteSettings) {
  await delay();
  updateAdvertising((current) => ({ ...current, enabled: input.adsEnabled }), {
    userId: getAdminSession()?.id ?? 'demo',
    summary: 'Lưu công tắc quảng cáo từ cài đặt chung',
  });
  setSettings(input);
  writeAudit('save', 'settings', 'site', 'Lưu cài đặt');
  return input;
}
export async function listAudit(q: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<AuditLog>> {
  await delay();
  const ads: AuditLog[] = (getAdvertisingSnapshot()?.audit ?? []).map((x) => ({
    ...x,
    action: 'save',
    objectType: 'advertising',
    objectId: 'frontend',
  }));
  const all = [...ads, ...auditLogs]
    .sort((a, b) => b.at.localeCompare(a.at))
    .filter(
      (x) =>
        !q.search || x.summary.toLowerCase().includes(q.search.toLowerCase()),
    );
  return {
    items: all,
    page: 1,
    pageSize: 30,
    total: all.length,
    totalPages: 1,
  };
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
  return new Blob([JSON.stringify({ stories: adminStories }, null, 2)], {
    type: 'application/json',
  });
}
