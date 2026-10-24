import { Eye } from 'lucide-react';
import Link from 'next/link';
import type { Story } from '@/features/catalog/types/story';
import { StoryCover } from './StoryCover';
import { formatNumber } from '@/shared/lib/utils/format';
// Helper function to format dates to relative time or date string
function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 24) {
    return `${diffInHours} hours ago`;
  } else {
    // DD/MM/YYYY format
    return date.toLocaleDateString('en-GB'); 
  }
}

export function StoryCard({ story, variant = 'list' }: { story: Story, variant?: 'list' | 'grid' }) {
  const chap1 = story.latestChapter;
  const chap2 = story.recentChapters?.[1]?.number ?? null;
  
  // Try to determine updated times
  const time1 = formatTimeAgo(story.recentChapters?.[0]?.updatedAt || story.updatedAt);
  const time2 = story.recentChapters?.[1] ? formatTimeAgo(story.recentChapters[1].updatedAt) : '';

  if (variant === 'grid') {
    return (
      <article>
        <Link
          href={`/truyen/${story.slug}`}
          className="group block transition-transform hover:-translate-y-1"
        >
          <div className="relative">
            <StoryCover title={story.title} cover={story.cover} id={story.id} />
            
            <div className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm ${story.status === 'full' ? 'bg-[var(--story-status-full)]' : 'bg-[var(--story-status-updating)]'}`}>
              {story.status === 'full' ? 'FULL' : 'Đang cập nhật'}
            </div>
            
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm">
              <Eye size={12} />
              <span>{formatNumber(story.views)}</span>
            </div>
          </div>
          
          <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug group-hover:text-accent transition-colors">
            {story.title}
          </h3>
        </Link>
        <div className="mt-1 flex items-center text-xs text-text-muted">
          <span>{story.latestChapter > 0 ? `Chap ${story.latestChapter}` : 'Sắp ra mắt'}</span>
        </div>
      </article>
    );
  }

  return (
    <article className="flex gap-4 p-3 hover:bg-surface-2 rounded-lg transition-colors border border-transparent hover:border-border">
      <Link href={`/truyen/${story.slug}`} className="block shrink-0 w-[100px] sm:w-[120px]">
        <StoryCover title={story.title} cover={story.cover} id={story.id} />
      </Link>
      
      <div className="flex-1 flex flex-col justify-start overflow-hidden">
        <Link href={`/truyen/${story.slug}`} className="group block mb-3">
          <div className="mb-1">
            <h3 className="inline align-middle font-bold uppercase text-sm sm:text-base group-hover:text-accent transition-colors leading-snug">
              {story.title}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-sm text-yellow-400">
            <span>{'⭐'.repeat(Math.floor(story.rating))}</span>
            <span className="text-text-muted ml-1 text-xs font-semibold">{story.ratingCount ? story.rating : 'Chưa có đánh giá'}</span>
          </div>
        </Link>
        
        <div className="mt-auto space-y-2">
          {chap1 > 0 && (
            <div className="flex items-center gap-3">
              <Link href={`/truyen/${story.slug}/chap-${chap1}`} className="text-xs px-3 py-1 border border-border rounded-full hover:bg-surface-2 min-w-[75px] text-center font-medium">
                CHAP {chap1}
              </Link>
              <span className="text-xs text-text-muted">{time1}</span>
            </div>
          )}
          {chap2 && (
            <div className="flex items-center gap-3">
              <Link href={`/truyen/${story.slug}/chap-${chap2}`} className="text-xs px-3 py-1 border border-border rounded-full hover:bg-surface-2 min-w-[75px] text-center font-medium">
                CHAP {chap2}
              </Link>
              <span className="text-xs text-text-muted">{time2}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
