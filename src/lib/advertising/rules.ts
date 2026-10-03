import type {
  AdDevice,
  AdPlacement,
  AdSelection,
  AdvertisingCampaign,
  AdvertisingConfig,
} from '@/types/advertising';

// ISO dates sort chronologically; the caller supplies today's local date.
export function isCampaignLive(campaign: AdvertisingCampaign, date: string) {
  return (
    campaign.status === 'active' &&
    campaign.startDate <= date &&
    campaign.endDate >= date
  );
}
export function resolveAdvertisement(
  config: AdvertisingConfig,
  placement: AdPlacement,
  device: AdDevice,
  date: string,
  pageCount?: number,
): AdSelection | null {
  const slot = config.slots.find((item) => item.placement === placement);
  if (
    !config.enabled ||
    !slot?.enabled ||
    !slot[device] ||
    slot.source === 'none'
  )
    return null;
  if (
    placement === 'chapter-mid' &&
    (pageCount === undefined || pageCount < config.minimumChapterPages)
  )
    return null;
  if (
    config.premiumDemo &&
    (slot.source !== 'affiliate' || config.premiumHidesAffiliate)
  )
    return null;
  // Premium never receives a booking banner, even in an affiliate slot.
  const campaign =
    !config.premiumDemo &&
    config.campaigns
      .filter(
        (item) =>
          item.placements.includes(placement) &&
          item[device] &&
          isCampaignLive(item, date),
      )
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))[0];
  if (campaign) return { source: 'direct', campaign };
  if (slot.source === 'direct') return null;
  if (slot.source === 'network') return { source: 'network' };
  const products = config.products
    .filter((item) => item.enabled && item.placements.includes(placement))
    .slice(0, 3);
  return products.length ? { source: 'affiliate', products } : null;
}
export function campaignConflicts(
  candidate: AdvertisingCampaign,
  campaigns: AdvertisingCampaign[],
) {
  if (candidate.status !== 'active') return [];
  return campaigns.filter(
    (item) =>
      item.id !== candidate.id &&
      item.status === 'active' &&
      item.priority === candidate.priority &&
      item.startDate <= candidate.endDate &&
      candidate.startDate <= item.endDate &&
      ((item.mobile && candidate.mobile) ||
        (item.desktop && candidate.desktop)) &&
      item.placements.some((placement) =>
        candidate.placements.includes(placement),
      ),
  );
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
