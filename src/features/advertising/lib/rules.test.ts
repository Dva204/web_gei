import { describe, expect, it } from 'vitest';
import { defaultAdvertising } from './defaults';
import {
  campaignConflicts,
  isCampaignLive,
  resolveAdvertisement,
} from './rules';
const date = '2026-10-03';
describe('frontend advertisement rules', () => {
  it('prioritizes a live booking over fallback network ads', () => {
    expect(
      resolveAdvertisement(defaultAdvertising(), 'home-between', 'mobile', date)
        ?.source,
    ).toBe('direct');
  });
  it('falls back when bookings are paused or expired', () => {
    const config = defaultAdvertising();
    config.campaigns[0].status = 'paused';
    expect(
      resolveAdvertisement(config, 'home-between', 'desktop', date)?.source,
    ).toBe('network');
    config.campaigns[0].status = 'active';
    config.campaigns[0].endDate = '2026-10-02';
    expect(
      resolveAdvertisement(config, 'home-between', 'desktop', date)?.source,
    ).toBe('network');
  });
  it('respects global, placement, device and empty source switches', () => {
    const config = defaultAdvertising();
    const slot = config.slots[0];
    config.enabled = false;
    expect(
      resolveAdvertisement(config, slot.placement, 'mobile', date),
    ).toBeNull();
    config.enabled = true;
    slot.enabled = false;
    expect(
      resolveAdvertisement(config, slot.placement, 'mobile', date),
    ).toBeNull();
    slot.enabled = true;
    slot.mobile = false;
    expect(
      resolveAdvertisement(config, slot.placement, 'mobile', date),
    ).toBeNull();
    slot.mobile = true;
    slot.source = 'none';
    expect(
      resolveAdvertisement(config, slot.placement, 'desktop', date),
    ).toBeNull();
  });
  it('hides sidebar on mobile', () => {
    expect(
      resolveAdvertisement(
        defaultAdvertising(),
        'story-sidebar',
        'mobile',
        date,
      ),
    ).toBeNull();
  });
  it('never inserts a mid-chap advertisement in a short or unknown chap', () => {
    const config = defaultAdvertising();
    expect(
      resolveAdvertisement(config, 'chapter-mid', 'mobile', date, 7),
    ).toBeNull();
    expect(
      resolveAdvertisement(config, 'chapter-mid', 'mobile', date),
    ).toBeNull();
    expect(
      resolveAdvertisement(config, 'chapter-mid', 'mobile', date, 8)?.source,
    ).toBe('network');
  });
  it('hides advertisements in Premium, including affiliate by default', () => {
    const config = defaultAdvertising();
    config.premiumDemo = true;
    expect(
      resolveAdvertisement(config, 'home-between', 'desktop', date),
    ).toBeNull();
    expect(
      resolveAdvertisement(config, 'home-affiliate', 'mobile', date),
    ).toBeNull();
    config.premiumHidesAffiliate = false;
    config.campaigns[0].placements = ['home-affiliate'];
    expect(
      resolveAdvertisement(config, 'home-affiliate', 'mobile', date)?.source,
    ).toBe('affiliate');
  });
  it('does not leave an empty affiliate block or missing booking block', () => {
    const config = defaultAdvertising();
    config.products = [];
    expect(
      resolveAdvertisement(config, 'home-affiliate', 'desktop', date),
    ).toBeNull();
    config.campaigns = [];
    config.slots[0].source = 'direct';
    expect(
      resolveAdvertisement(config, 'home-between', 'desktop', date),
    ).toBeNull();
  });
  it('caps products at three and ignores disabled products', () => {
    const config = defaultAdvertising();
    config.products[0].enabled = false;
    const selected = resolveAdvertisement(
      config,
      'home-affiliate',
      'desktop',
      date,
    );
    expect(selected?.source === 'affiliate' && selected.products.length).toBe(
      2,
    );
  });
  it('includes both boundaries of a booking schedule', () => {
    const campaign = defaultAdvertising().campaigns[0];
    campaign.startDate = date;
    campaign.endDate = date;
    expect(isCampaignLive(campaign, date)).toBe(true);
    expect(isCampaignLive(campaign, '2026-10-04')).toBe(false);
  });
  it('detects overlapping active bookings only with equal priority and shared devices/placements', () => {
    const campaigns = defaultAdvertising().campaigns;
    const candidate = { ...campaigns[0], id: 'other' };
    expect(campaignConflicts(candidate, campaigns)).toHaveLength(1);
    expect(
      campaignConflicts({ ...candidate, priority: 20 }, campaigns),
    ).toHaveLength(0);
    expect(
      campaignConflicts({ ...candidate, status: 'draft' }, campaigns),
    ).toHaveLength(0);
    expect(
      campaignConflicts(
        { ...candidate, startDate: '2100-01-01', endDate: '2100-12-31' },
        campaigns,
      ),
    ).toHaveLength(0);
  });
});
