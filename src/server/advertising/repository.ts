import 'server-only';

import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';
import { actorInTransaction, grant, transaction } from '../catalog/common';
import { enumValue, exact, idValue, text } from '../catalog/input';
import { consumeAuthLimit } from '../auth/rateLimit';
import { defaultAdvertising, PLACEMENT_IDS } from '@/features/advertising/lib/defaults';
import type { AdPlacement, AdvertisingConfig } from '@/features/advertising/types';
import type { SessionUser } from '@/shared/lib/auth/types';

const singletonId = 'primary';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function image(value: unknown) {
  return typeof value === 'string' && (value === '' || /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) && value.length <= 350_000;
}
function url(value: unknown, program: string) {
  if (value === '' || value == null) return '';
  if (typeof value !== 'string' || value.length > 1000) throw new ApiError('INVALID_REQUEST', 'Liên kết affiliate không hợp lệ.');
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new ApiError('INVALID_REQUEST', 'Liên kết affiliate không hợp lệ.'); }
  if (parsed.protocol !== 'https:') throw new ApiError('INVALID_REQUEST', 'Liên kết affiliate phải dùng HTTPS.');
  const host = parsed.hostname.toLowerCase();
  const allowed = program === 'Shopee'
    ? ['shopee.vn', 's.shopee.vn', 'shope.ee']
    : ['shop.tiktok.com', 'vt.tiktok.com', 'www.tiktok.com', 'tiktok.com'];
  if (!allowed.some((domain) => host === domain || host.endsWith(`.${domain}`)))
    throw new ApiError('INVALID_REQUEST', `Liên kết không thuộc ${program}.`);
  return parsed.toString();
}
function placements(value: unknown) {
  if (!Array.isArray(value) || !value.length || value.length > PLACEMENT_IDS.length || value.some((item) => !PLACEMENT_IDS.includes(item as AdPlacement)))
    throw new ApiError('INVALID_REQUEST', 'Vị trí quảng cáo không hợp lệ.');
  return [...new Set(value)] as AdPlacement[];
}
function cleanConfig(value: unknown): AdvertisingConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('INVALID_REQUEST', 'Cấu hình quảng cáo không hợp lệ.');
  const input = value as AdvertisingConfig;
  if (input.version !== 1 || typeof input.enabled !== 'boolean' || typeof input.premiumHidesAffiliate !== 'boolean' || !Number.isInteger(input.minimumChapterPages) || input.minimumChapterPages < 4 || input.minimumChapterPages > 200)
    throw new ApiError('INVALID_REQUEST', 'Cấu hình chung không hợp lệ.');
  if (!input.network || !['AdSense', 'CPC / CPM', 'Native Ads'].includes(input.network.provider) || !['CPM', 'CPC'].includes(input.network.pricing)) throw new ApiError('INVALID_REQUEST', 'Cấu hình mạng quảng cáo không hợp lệ.');
  const network = { provider: input.network.provider, pricing: input.network.pricing, label: text(input.network.label, 'Nhãn quảng cáo', 100, true), publisherId: text(input.network.publisherId, 'Publisher ID', 100) };
  if (!Array.isArray(input.slots) || input.slots.length !== PLACEMENT_IDS.length) throw new ApiError('INVALID_REQUEST', 'Cần cấu hình đủ các vị trí quảng cáo.');
  const slots = input.slots.map((slot) => {
    if (!slot || !PLACEMENT_IDS.includes(slot.placement) || typeof slot.enabled !== 'boolean' || typeof slot.mobile !== 'boolean' || typeof slot.desktop !== 'boolean' || !['network', 'direct', 'affiliate', 'none'].includes(slot.source) || !['banner', 'native'].includes(slot.format) || !Number.isInteger(slot.minHeight) || slot.minHeight < 120 || slot.minHeight > 360) throw new ApiError('INVALID_REQUEST', 'Một vị trí quảng cáo không hợp lệ.');
    return { ...slot };
  });
  if (new Set(slots.map((slot) => slot.placement)).size !== PLACEMENT_IDS.length) throw new ApiError('INVALID_REQUEST', 'Vị trí quảng cáo bị trùng.');
  if (!Array.isArray(input.campaigns) || input.campaigns.length > 100) throw new ApiError('INVALID_REQUEST', 'Tối đa 100 chiến dịch.');
  const campaigns = input.campaigns.map((campaign) => {
    if (!campaign || !image(campaign.image) || !datePattern.test(campaign.startDate) || !datePattern.test(campaign.endDate) || campaign.endDate < campaign.startDate || typeof campaign.mobile !== 'boolean' || typeof campaign.desktop !== 'boolean' || (!campaign.mobile && !campaign.desktop) || !Number.isInteger(campaign.priority) || campaign.priority < 0 || campaign.priority > 100 || !Number.isFinite(campaign.bookingAmount) || campaign.bookingAmount < 0 || campaign.bookingAmount > 1_000_000_000 || !['draft', 'active', 'paused'].includes(campaign.status)) throw new ApiError('INVALID_REQUEST', 'Chiến dịch quảng cáo không hợp lệ.');
    return { id: idValue(campaign.id), name: text(campaign.name, 'Tên chiến dịch', 80, true), advertiser: text(campaign.advertiser, 'Đối tác', 80, true), title: text(campaign.title, 'Tiêu đề', 100, true), description: text(campaign.description, 'Mô tả', 250), cta: text(campaign.cta, 'Nhãn nút', 35, true), image: campaign.image, placements: placements(campaign.placements), mobile: campaign.mobile, desktop: campaign.desktop, startDate: campaign.startDate, endDate: campaign.endDate, priority: campaign.priority, status: campaign.status, bookingAmount: campaign.bookingAmount, note: text(campaign.note, 'Ghi chú', 400) };
  });
  if (!Array.isArray(input.products) || input.products.length > 200) throw new ApiError('INVALID_REQUEST', 'Tối đa 200 sản phẩm affiliate.');
  const products = input.products.map((product) => {
    if (!product || !['Shopee', 'TikTok Shop'].includes(product.program) || !image(product.image) || typeof product.enabled !== 'boolean' || !Number.isFinite(product.price) || product.price < 0 || product.price > 1_000_000_000) throw new ApiError('INVALID_REQUEST', 'Sản phẩm affiliate không hợp lệ.');
    return { id: idValue(product.id), name: text(product.name, 'Tên sản phẩm', 80, true), program: product.program, description: text(product.description, 'Mô tả', 160), price: product.price, image: product.image, enabled: product.enabled, placements: placements(product.placements), targetUrl: url(product.targetUrl, product.program) };
  });
  if (!Array.isArray(input.revenue) || input.revenue.length > 500) throw new ApiError('INVALID_REQUEST', 'Tối đa 500 khoản doanh thu nhập tay.');
  const revenue = input.revenue.map((row) => {
    if (!row || !datePattern.test(row.date) || !['network', 'direct', 'Shopee', 'TikTok Shop'].includes(row.source) || !Number.isFinite(row.amount) || row.amount < 0 || row.amount > 1_000_000_000 || !['estimated', 'confirmed', 'paid'].includes(row.status)) throw new ApiError('INVALID_REQUEST', 'Khoản doanh thu không hợp lệ.');
    return { id: idValue(row.id), date: row.date, source: row.source, amount: row.amount, status: row.status, note: text(row.note, 'Ghi chú doanh thu', 200, true) };
  });
  return { version: 1, enabled: input.enabled, premiumDemo: false, premiumHidesAffiliate: input.premiumHidesAffiliate, minimumChapterPages: input.minimumChapterPages, network, slots, campaigns, products, revenue, events: [], audit: [] } as AdvertisingConfig;
}

function storedConfig(payload: Prisma.JsonValue | undefined) {
  if (!payload) return defaultAdvertising();
  try { return cleanConfig(payload); } catch { throw new ApiError('SERVICE_UNAVAILABLE', 'Cấu hình quảng cáo trên máy chủ cần được kiểm tra.'); }
}
async function ensureConfiguration() {
  const existing = await prisma.advertisingConfig.findUnique({ where: { id: singletonId }, select: { payload: true, revision: true } });
  if (existing) return existing;
  try {
    return await prisma.advertisingConfig.create({ data: { id: singletonId, payload: defaultAdvertising() as unknown as Prisma.InputJsonValue, revision: 1 }, select: { payload: true, revision: true } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    const concurrent = await prisma.advertisingConfig.findUnique({ where: { id: singletonId }, select: { payload: true, revision: true } });
    if (!concurrent) throw error;
    return concurrent;
  }
}
function publicConfig(config: AdvertisingConfig, revision: number) {
  const value = clone(config);
  value.network.publisherId = '';
  value.campaigns = value.campaigns.map((row) => ({ ...row, bookingAmount: 0, note: '' }));
  value.revenue = []; value.events = []; value.audit = []; value.serverRevision = revision;
  return value;
}
export async function getPublicAdvertising() {
  const row = await ensureConfiguration();
  return publicConfig(storedConfig(row.payload), row.revision);
}
export async function getAdminAdvertising(user: SessionUser) {
  grant(user, 'ads.manage');
  const [row, events, audits] = await Promise.all([
    ensureConfiguration(),
    prisma.advertisingEvent.findMany({ orderBy: { occurredAt: 'desc' }, take: 3000 }),
    prisma.auditLog.findMany({ where: { objectType: 'advertising' }, orderBy: { createdAt: 'desc' }, take: 100 }),
  ]);
  const config = clone(storedConfig(row?.payload));
  config.serverRevision = row?.revision ?? 0;
  config.events = events.reverse().map((event) => ({ id: event.id, creativeId: event.creativeId, placement: event.placement as AdPlacement, kind: event.kind as 'impression' | 'click', at: event.occurredAt.toISOString() }));
  config.audit = audits.map((audit) => ({ id: audit.id, at: audit.createdAt.toISOString(), userId: audit.userId ?? 'system', summary: audit.summary }));
  return config;
}
export async function saveAdvertising(user: SessionUser, input: Record<string, unknown>) {
  exact(input, ['config', 'revision', 'summary']);
  const config = cleanConfig(input.config);
  if (!Number.isInteger(input.revision) || Number(input.revision) < 0) throw new ApiError('INVALID_REQUEST', 'Revision cấu hình không hợp lệ.');
  const expected = Number(input.revision), summary = text(input.summary, 'Tóm tắt thay đổi', 300, true);
  return transaction(async (tx) => {
    const actor = await actorInTransaction(tx, user); grant(actor, 'ads.manage');
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('advertising:primary'))`;
    const current = await tx.advertisingConfig.findUnique({ where: { id: singletonId }, select: { revision: true } });
    const revision = current?.revision ?? 0;
    if (revision !== expected) throw new ApiError('CONFLICT', 'Cấu hình đã thay đổi ở thiết bị khác. Hãy tải lại.');
    const nextRevision = revision + 1;
    await tx.advertisingConfig.upsert({ where: { id: singletonId }, create: { id: singletonId, payload: config as unknown as Prisma.InputJsonValue, revision: nextRevision, updatedById: actor.id }, update: { payload: config as unknown as Prisma.InputJsonValue, revision: nextRevision, updatedById: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: 'advertising.save', objectType: 'advertising', objectId: singletonId, summary } });
    return { ...config, serverRevision: nextRevision, premiumDemo: Boolean((input.config as AdvertisingConfig).premiumDemo) };
  });
}
export async function recordAdvertisingEvent(user: SessionUser | null, input: Record<string, unknown>) {
  exact(input, ['creativeId', 'placement', 'kind', 'clientId']);
  const creativeId = idValue(input.creativeId), placement = enumValue(input.placement, PLACEMENT_IDS, 'Vị trí'), kind = enumValue(input.kind, ['impression', 'click'] as const, 'Loại sự kiện');
  const clientId = text(input.clientId, 'Mã trình duyệt', 80, true);
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(clientId)) throw new ApiError('INVALID_REQUEST', 'Mã trình duyệt không hợp lệ.');
  const visitorHash = createHash('sha256').update(`ads:v1:${clientId}`).digest('hex');
  await consumeAuthLimit('ads-event', visitorHash, 500, 24 * 60 * 60 * 1000);
  await consumeAuthLimit('ads-event-global', '*', 10_000);
  const row = await ensureConfiguration();
  const config = storedConfig(row.payload);
  const slot = config.slots.find((item) => item.placement === placement && item.enabled && item.source !== 'none');
  const validCreative = creativeId === 'network-demo' ? slot?.source === 'network' : config.campaigns.some((item) => item.id === creativeId && item.placements.includes(placement)) || config.products.some((item) => item.id === creativeId && item.enabled && item.placements.includes(placement));
  if (!slot || !validCreative) throw new ApiError('INVALID_REQUEST', 'Nội dung quảng cáo không còn hoạt động ở vị trí này.');
  await prisma.advertisingEvent.create({ data: { creativeId, placement, kind, visitorHash, userId: user?.id } });
  return { recorded: true };
}
