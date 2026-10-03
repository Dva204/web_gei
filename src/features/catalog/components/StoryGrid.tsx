'use client';
import { Fragment, useRef } from 'react';
import { AdSlot } from '@/features/advertising/components/AdSlot';
import type { Story } from '@/features/catalog/types/story';
import { StoryCard } from './StoryCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function StoryGrid({
  stories,
  variant = 'grid',
  withAds = false,
}: {
  stories: Story[];
  variant?: 'list' | 'grid' | 'carousel';
  withAds?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo =
        direction === 'left'
          ? scrollLeft - clientWidth
          : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (variant === 'carousel') {
    return (
      <div className="relative group">
        <button
          onClick={() => scroll('left')}
          className="absolute -left-3 sm:-left-4 top-[35%] z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface shadow-md border border-border text-accent opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Cuộn trái"
        >
          <ChevronLeft size={20} />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {stories.map((s) => (
            <div
              key={s.id}
              className="w-[calc(50%-8px)] md:w-[calc(25%-12px)] lg:w-[calc(16.666%-13px)] shrink-0 snap-start"
            >
              <StoryCard story={s} variant="grid" />
            </div>
          ))}
        </div>
        <button
          onClick={() => scroll('right')}
          className="absolute -right-3 sm:-right-4 top-[35%] z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface shadow-md border border-border text-accent opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Cuộn phải"
        >
          <ChevronRight size={20} />
        </button>
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .hide-scrollbar::-webkit-scrollbar { display: none; }
        `,
          }}
        />
      </div>
    );
  }

  return (
    <div className={variant === 'list' ? 'list-stories' : 'grid-stories'}>
      {stories.map((s, index) => (
        <Fragment key={s.id}>
          <StoryCard story={s} variant={variant === 'list' ? 'list' : 'grid'} />
          {withAds && index === 7 && <AdSlot placement="list-in-feed" inFeed />}
        </Fragment>
      ))}
    </div>
  );
}
