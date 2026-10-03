import type { AdPlacement, AdvertisingConfig } from '@/types/advertising';
import { defaultAdvertising, PLACEMENT_IDS } from './defaults';

export const ADVERTISING_KEY = 'vuon-advertising-v1';
const CHANGE_EVENT = 'vuon-advertising-change';
let cachedRaw: string | null | undefined;
let cached: AdvertisingConfig | null = null;
const knownPlacements = (value: unknown): value is AdPlacement[] =>
  Array.isArray(value) && value.every((p) => PLACEMENT_IDS.includes(p));
const imageValue = (value: unknown) =>
  typeof value === 'string' &&
  (value === '' || /^data:image\/(png|jpeg|webp);base64,/.test(value));
function validConfig(value: unknown): value is AdvertisingConfig {
  if (!value || typeof value !== 'object') return false;
  const v = value as AdvertisingConfig;
  return (
    v.version === 1 &&
    typeof v.enabled === 'boolean' &&
    typeof v.premiumDemo === 'boolean' &&
    typeof v.premiumHidesAffiliate === 'boolean' &&
    Number.isFinite(v.minimumChapterPages) &&
    !!v.network &&
    typeof v.network.label === 'string' &&
    v.network.label.trim().length > 0 &&
    Number.isInteger(v.minimumChapterPages) &&
    v.minimumChapterPages >= 4 &&
    v.minimumChapterPages <= 200 &&
    ['AdSense', 'CPC / CPM', 'Native Ads'].includes(v.network.provider) &&
    ['CPM', 'CPC'].includes(v.network.pricing) &&
    Array.isArray(v.slots) &&
    Array.isArray(v.campaigns) &&
    Array.isArray(v.products) &&
    Array.isArray(v.events) &&
    Array.isArray(v.revenue) &&
    Array.isArray(v.audit) &&
    v.slots.length === PLACEMENT_IDS.length &&
    PLACEMENT_IDS.every(
      (id) => v.slots.filter((s) => s?.placement === id).length === 1,
    ) &&
    v.slots.every(
      (s) =>
        !!s &&
        PLACEMENT_IDS.includes(s.placement) &&
        typeof s.enabled === 'boolean' &&
        typeof s.mobile === 'boolean' &&
        typeof s.desktop === 'boolean' &&
        ['network', 'direct', 'affiliate', 'none'].includes(s.source) &&
        ['banner', 'native'].includes(s.format) &&
        Number.isFinite(s.minHeight) &&
        s.minHeight >= 120 &&
        s.minHeight <= 360,
    ) &&
    v.campaigns.every(
      (c) =>
        !!c &&
        knownPlacements(c.placements) &&
        typeof c.id === 'string' &&
        typeof c.name === 'string' &&
        typeof c.advertiser === 'string' &&
        typeof c.title === 'string' &&
        typeof c.description === 'string' &&
        typeof c.cta === 'string' &&
        imageValue(c.image) &&
        typeof c.startDate === 'string' &&
        typeof c.endDate === 'string' &&
        ['draft', 'active', 'paused'].includes(c.status) &&
        Number.isFinite(c.priority) &&
        Number.isFinite(c.bookingAmount),
    ) &&
    v.products.every(
      (p) =>
        !!p &&
        knownPlacements(p.placements) &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.description === 'string' &&
        Number.isFinite(p.price) &&
        ['Shopee', 'TikTok Shop'].includes(p.program) &&
        typeof p.enabled === 'boolean' &&
        imageValue(p.image),
    ) &&
    v.events.every(
      (e) =>
        !!e &&
        typeof e.id === 'string' &&
        typeof e.creativeId === 'string' &&
        typeof e.at === 'string' &&
        PLACEMENT_IDS.includes(e.placement) &&
        ['click', 'impression'].includes(e.kind),
    ) &&
    v.revenue.every(
      (r) =>
        !!r &&
        typeof r.id === 'string' &&
        typeof r.date === 'string' &&
        typeof r.note === 'string' &&
        Number.isFinite(r.amount) &&
        ['estimated', 'confirmed', 'paid'].includes(r.status) &&
        ['network', 'direct', 'Shopee', 'TikTok Shop'].includes(r.source),
    ) &&
    v.audit.every(
      (a) =>
        !!a &&
        typeof a.at === 'string' &&
        typeof a.id === 'string' &&
        typeof a.userId === 'string' &&
        typeof a.summary === 'string',
    )
  );
}
export function getAdvertisingSnapshot(): AdvertisingConfig | null {
  if (typeof window === 'undefined') return null;
  let raw: string | null;
  try {
    raw = localStorage.getItem(ADVERTISING_KEY);
  } catch {
    return cached ?? (cached = defaultAdvertising());
  }
  if (raw === cachedRaw && cached) return cached;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    cached = validConfig(parsed) ? parsed : defaultAdvertising();
  } catch {
    cached = defaultAdvertising();
  }
  return cached;
}
export function subscribeAdvertising(callback: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === ADVERTISING_KEY || event.key === null) callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', storage);
  };
}
export function updateAdvertising(
  change: (current: AdvertisingConfig) => AdvertisingConfig,
  audit?: { userId: string; summary: string },
) {
  const current = getAdvertisingSnapshot() ?? defaultAdvertising();
  const next = change(current);
  if (!validConfig(next))
    throw new Error(
      'Cấu hình quảng cáo không hợp lệ. Hãy kiểm tra các trường vừa nhập.',
    );
  if (audit)
    next.audit = [
      { ...audit, id: newId(), at: new Date().toISOString() },
      ...current.audit,
    ].slice(0, 100);
  const raw = JSON.stringify(next);
  if (new TextEncoder().encode(raw).byteLength > 2 * 1024 * 1024)
    throw new Error(
      'Cấu hình quá lớn (tối đa 2 MB). Hãy giảm ảnh hoặc xóa ảnh không dùng.',
    );
  // Commit only after a successful write: a full/blocked storage must not look saved.
  try {
    localStorage.setItem(ADVERTISING_KEY, raw);
  } catch {
    throw new Error(
      'Không thể lưu trên trình duyệt. Hãy kiểm tra quyền lưu dữ liệu hoặc giảm kích thước ảnh.',
    );
  }
  cachedRaw = raw;
  cached = next;
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return next;
}
export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export function recordAdEvent(
  creativeId: string,
  placement: AdPlacement,
  kind: 'impression' | 'click',
) {
  try {
    updateAdvertising((current) => ({
      ...current,
      events: [
        ...current.events,
        {
          id: newId(),
          creativeId,
          placement,
          kind,
          at: new Date().toISOString(),
        },
      ].slice(-3000),
    }));
  } catch {
    /* Optional local telemetry must never interrupt reading. */
  }
}
