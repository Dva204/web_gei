import type {
  AdPlacement,
  AdvertisingConfig,
  AdvertisingSlot,
} from '@/features/advertising/types';

export const PLACEMENTS: Record<AdPlacement, { name: string; detail: string }> =
  {
    'home-between': {
      name: 'Trang chủ · giữa các kệ truyện',
      detail: 'Sau bảng xếp hạng, trước mục mới cập nhật.',
    },
    'home-affiliate': {
      name: 'Trang chủ · gợi ý sản phẩm',
      detail: 'Một hàng sản phẩm tách biệt với danh sách truyện.',
    },
    'list-in-feed': {
      name: 'Danh sách / thể loại · trong lưới',
      detail: 'Sau 8 truyện; không chen vào từng thẻ truyện.',
    },
    'story-sidebar': {
      name: 'Chi tiết truyện · cột bên',
      detail: 'Chỉ dành cho PC, không chiếm chỗ trên mobile.',
    },
    'story-below-synopsis': {
      name: 'Chi tiết truyện · dưới giới thiệu',
      detail: 'Trước danh sách chap, không che nút đọc.',
    },
    'chapter-mid': {
      name: 'Đọc chap · giữa các ảnh',
      detail: 'Tối đa một khối; không hiện với chap ngắn.',
    },
    'chapter-end': {
      name: 'Đọc chap · cuối chap',
      detail: 'Sau toàn bộ ảnh truyện, nằm trong luồng cuộn.',
    },
  };
export const PLACEMENT_IDS = Object.keys(PLACEMENTS) as AdPlacement[];
export const SOURCE_NAMES = {
  network: 'Mạng quảng cáo (mẫu)',
  direct: 'Booking trực tiếp',
  affiliate: 'Sản phẩm affiliate',
  none: 'Không hiển thị',
};
const slots: AdvertisingSlot[] = PLACEMENT_IDS.map((placement) => ({
  placement,
  enabled: true,
  mobile: placement !== 'story-sidebar',
  desktop: true,
  source:
    placement === 'home-affiliate' || placement === 'chapter-end'
      ? 'affiliate'
      : 'network',
  format: placement === 'list-in-feed' ? 'native' : 'banner',
  minHeight: placement === 'story-sidebar' ? 250 : 160,
}));
export function defaultAdvertising(): AdvertisingConfig {
  return {
    version: 1,
    enabled: true,
    premiumDemo: false,
    premiumHidesAffiliate: true,
    minimumChapterPages: 8,
    network: {
      provider: 'AdSense',
      pricing: 'CPM',
      label: 'Không gian dành cho đối tác',
      publisherId: '',
    },
    slots: slots.map((slot) => ({ ...slot })),
    campaigns: [
      {
        id: 'booking-reading',
        name: 'Góc đọc thư thái',
        advertiser: 'Đối tác minh họa',
        title: 'Một góc nhỏ, một câu chuyện hay',
        description:
          'Khám phá những món đồ cho góc đọc của bạn. Đây là banner mẫu để thử bố cục.',
        cta: 'Khám phá mẫu',
        image: '',
        placements: ['home-between', 'story-sidebar'],
        mobile: true,
        desktop: true,
        startDate: '2020-01-01',
        endDate: '2099-12-31',
        priority: 10,
        status: 'active',
        bookingAmount: 0,
        note: 'Dữ liệu mẫu, không phải hợp đồng quảng cáo thật.',
      },
    ],
    products: [
      {
        id: 'product-lamp',
        name: 'Đèn đọc sách nhỏ gọn',
        program: 'Shopee',
        description: 'Ánh sáng dịu cho một buổi tối đọc truyện.',
        price: 159000,
        image: '',
        enabled: true,
        placements: ['home-affiliate', 'chapter-end'],
      },
      {
        id: 'product-bookmark',
        name: 'Bộ bookmark bạc hà',
        program: 'TikTok Shop',
        description: 'Một chút xanh cho góc đọc yêu thích.',
        price: 39000,
        image: '',
        enabled: true,
        placements: ['home-affiliate', 'chapter-end'],
      },
      {
        id: 'product-cup',
        name: 'Cốc sứ cho góc đọc',
        program: 'Shopee',
        description: 'Gợi ý mẫu, chưa kết nối gian hàng.',
        price: 89000,
        image: '',
        enabled: true,
        placements: ['home-affiliate'],
      },
    ],
    revenue: [],
    events: [],
    audit: [],
  };
}
