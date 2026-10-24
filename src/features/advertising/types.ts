export type AdPlacement =
  | 'home-between'
  | 'home-affiliate'
  | 'list-in-feed'
  | 'story-sidebar'
  | 'story-below-synopsis'
  | 'chapter-mid'
  | 'chapter-end';
export type AdSource = 'network' | 'direct' | 'affiliate' | 'none';
export type AdDevice = 'mobile' | 'desktop';
export type CampaignStatus = 'draft' | 'active' | 'paused';
export interface AdvertisingSlot {
  placement: AdPlacement;
  enabled: boolean;
  mobile: boolean;
  desktop: boolean;
  source: AdSource;
  format: 'banner' | 'native';
  minHeight: number;
}
export interface AdvertisingCampaign {
  id: string;
  name: string;
  advertiser: string;
  title: string;
  description: string;
  cta: string;
  image: string;
  placements: AdPlacement[];
  mobile: boolean;
  desktop: boolean;
  startDate: string;
  endDate: string;
  priority: number;
  status: CampaignStatus;
  bookingAmount: number;
  note: string;
}
export interface AffiliateProduct {
  id: string;
  name: string;
  program: 'Shopee' | 'TikTok Shop';
  description: string;
  price: number;
  image: string;
  enabled: boolean;
  placements: AdPlacement[];
  targetUrl?: string;
}
export interface AdvertisingRevenue {
  id: string;
  date: string;
  source: 'network' | 'direct' | 'Shopee' | 'TikTok Shop';
  amount: number;
  status: 'estimated' | 'confirmed' | 'paid';
  note: string;
}
export interface AdvertisingEvent {
  id: string;
  creativeId: string;
  placement: AdPlacement;
  kind: 'impression' | 'click';
  at: string;
}
export interface AdvertisingAudit {
  id: string;
  at: string;
  userId: string;
  summary: string;
}
export interface AdvertisingConfig {
  version: 1;
  enabled: boolean;
  premiumDemo: boolean;
  premiumHidesAffiliate: boolean;
  minimumChapterPages: number;
  network: {
    provider: 'AdSense' | 'CPC / CPM' | 'Native Ads';
    pricing: 'CPM' | 'CPC';
    label: string;
    publisherId: string;
  };
  slots: AdvertisingSlot[];
  campaigns: AdvertisingCampaign[];
  products: AffiliateProduct[];
  revenue: AdvertisingRevenue[];
  events: AdvertisingEvent[];
  audit: AdvertisingAudit[];
  serverRevision?: number;
}
export type AdSelection =
  | { source: 'direct'; campaign: AdvertisingCampaign }
  | { source: 'network' }
  | { source: 'affiliate'; products: AffiliateProduct[] };
