'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, BookOpen, LampDesk, ShoppingBag } from 'lucide-react';
import type {
  AdSelection,
  AdvertisingConfig,
  AdvertisingSlot,
} from '@/features/advertising/types';

export const formatMoney = (amount: number) =>
  `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`;
export function AdCreative({
  selection,
  config,
  slot,
  onAction,
  preview = false,
}: {
  selection: AdSelection;
  config: AdvertisingConfig;
  slot: AdvertisingSlot;
  onAction?: (id: string) => void;
  preview?: boolean;
}) {
  const [notice, setNotice] = useState('');
  function activate(id: string, targetUrl?: string) {
    onAction?.(id);
    if (!preview && targetUrl) window.open(targetUrl, '_blank', 'noopener,noreferrer');
    setNotice(
      preview
        ? 'Bản xem trước, không ghi nhận lượt nhấn.'
        : targetUrl ? 'Đã mở trang sản phẩm. Website có thể nhận hoa hồng nếu đơn đủ điều kiện.' : 'Sản phẩm chưa được gắn liên kết cửa hàng.',
    );
  }
  return (
    <div
      className={`ad-creative ad-format-${slot.format} ad-placement-${slot.placement}`}
    >
      <div className="ad-disclosure">
        <span>
          {selection.source === 'affiliate'
            ? 'Gợi ý mua sắm · Affiliate'
            : 'Quảng cáo · Minh họa'}
        </span>
        <small>{preview ? 'Xem trước' : 'Bản thử nghiệm FE'}</small>
      </div>
      {selection.source === 'affiliate' ? (
        <>
          <div className="ad-product-grid">
            {selection.products.map((product) => (
              <article className="ad-product" key={product.id}>
                <div className="ad-product-art">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={320}
                      height={240}
                      unoptimized
                    />
                  ) : (
                    <ShoppingBag size={38} aria-hidden="true" />
                  )}
                  <span>{product.program}</span>
                </div>
                <div className="ad-product-body">
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <strong>{formatMoney(product.price)}</strong>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => activate(product.id, product.targetUrl)}
                  >
                    Xem sản phẩm <ArrowUpRight size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <p className="ad-fineprint">
            Giá có thể thay đổi tại gian hàng. Website có thể nhận hoa hồng từ
            đơn hàng affiliate đủ điều kiện.
          </p>
        </>
      ) : (
        <div className="ad-banner" style={{ minHeight: slot.minHeight }}>
          <div className="ad-banner-copy">
            <span className="ad-overline">
              {selection.source === 'direct'
                ? selection.campaign.advertiser
                : `${config.network.provider} · mẫu ${config.network.pricing}`}
            </span>
            <h3>
              {selection.source === 'direct'
                ? selection.campaign.title
                : config.network.label}
            </h3>
            <p>
              {selection.source === 'direct'
                ? selection.campaign.description
                : 'Vị trí quảng cáo thử nghiệm. Không tải mã mạng quảng cáo, không mở liên kết ngoài.'}
            </p>
            <button
              type="button"
              className="btn"
              onClick={() =>
                activate(
                  selection.source === 'direct'
                    ? selection.campaign.id
                    : 'network-demo',
                )
              }
            >
              {selection.source === 'direct'
                ? selection.campaign.cta
                : 'Thử tương tác'}{' '}
              <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="ad-banner-art" aria-hidden="true">
            {selection.source === 'direct' && selection.campaign.image ? (
              <Image
                src={selection.campaign.image}
                alt=""
                width={360}
                height={280}
                unoptimized
              />
            ) : (
              <>
                <BookOpen size={64} />
                <LampDesk size={42} />
              </>
            )}
          </div>
        </div>
      )}
      {notice && (
        <p className="ad-notice" role="status">
          {notice}
        </p>
      )}
      {!preview && (
        <div className="ad-premium-link">
          <Link href="/premium">Thử đọc không quảng cáo →</Link>
        </div>
      )}
    </div>
  );
}
