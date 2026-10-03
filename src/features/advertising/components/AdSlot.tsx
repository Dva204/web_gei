'use client';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useAdvertising } from '@/features/advertising/hooks/useAdvertising';
import { localDate, resolveAdvertisement } from '@/features/advertising/lib/rules';
import { recordAdEvent } from '@/features/advertising/lib/store';
import type { AdPlacement } from '@/features/advertising/types';
import { AdCreative } from './AdCreative';

const subscribeDevice = (callback: () => void) => {
  const media = window.matchMedia('(max-width: 767px)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
};
const deviceSnapshot = () =>
  window.matchMedia('(max-width: 767px)').matches
    ? ('mobile' as const)
    : ('desktop' as const);
const serverDevice = () => 'desktop' as const;
const subscribeDate = (callback: () => void) => {
  const interval = window.setInterval(callback, 60000);
  return () => window.clearInterval(interval);
};

export function AdSlot({
  placement,
  pageCount,
  inFeed = false,
}: {
  placement: AdPlacement;
  pageCount?: number;
  inFeed?: boolean;
}) {
  const config = useAdvertising();
  const device = useSyncExternalStore(
    subscribeDevice,
    deviceSnapshot,
    serverDevice,
  );
  const today = useSyncExternalStore(subscribeDate, localDate, () => '');
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(new Set<string>());
  const selection =
    config && process.env.NEXT_PUBLIC_ADS_ENABLED !== 'false'
      ? resolveAdvertisement(config, placement, device, today, pageCount)
      : null;
  const creativeIds =
    selection?.source === 'direct'
      ? [selection.campaign.id]
      : selection?.source === 'affiliate'
        ? selection.products.map((p) => p.id)
        : selection
          ? ['network-demo']
          : [];
  const creativeKey = creativeIds.join('|');
  useEffect(() => {
    const element = ref.current;
    if (!element || !creativeKey || !('IntersectionObserver' in window)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancel = () => {
      clearTimeout(timer);
      timer = undefined;
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          !entries[0].isIntersecting ||
          entries[0].intersectionRatio < 0.5 ||
          document.hidden
        ) {
          cancel();
          return;
        }
        if (timer) return;
        timer = setTimeout(() => {
          for (const id of creativeKey.split('|')) {
            const key = `${placement}:${id}`;
            if (!seen.current.has(key)) {
              seen.current.add(key);
              recordAdEvent(id, placement, 'impression');
            }
          }
        }, 1000);
      },
      { threshold: [0, 0.5] },
    );
    const onVisibility = () => {
      if (document.hidden) cancel();
      else {
        observer.unobserve(element);
        observer.observe(element);
      }
    };
    observer.observe(element);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancel();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [creativeKey, placement]);
  if (!selection || !config) return null;
  const slot = config.slots.find((item) => item.placement === placement)!;
  return (
    <aside
      ref={ref}
      className={`ad-slot ${inFeed ? 'ad-in-feed' : ''} ${placement.startsWith('chapter') ? 'ad-slot-reader' : ''}`}
      aria-label={
        selection.source === 'affiliate'
          ? 'Gợi ý sản phẩm affiliate'
          : 'Quảng cáo minh họa'
      }
    >
      <AdCreative
        selection={selection}
        config={config}
        slot={slot}
        onAction={(id) => recordAdEvent(id, placement, 'click')}
      />
    </aside>
  );
}
