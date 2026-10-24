export type { Paginated } from '@/shared/types/pagination';

export type Status = 'ongoing' | 'full' | 'paused';
export type Story = {
  id: string;
  slug: string;
  title: string;
  cover?: string;
  author: string;
  genres: string[];
  ending?: 'HE' | 'SE' | 'OE';
  status: Status;
  synopsis: string;
  rating: number;
  ratingCount: number;
  views: number;
  totalChapters: number;
  latestChapter: number;
  firstChapter?: number;
  recentChapters?: { number: number; updatedAt: string }[];
  genreLabels?: Record<string, string>;
  seoTitle?: string;
  seoDescription?: string;
  updatedAt: string;
  createdAt: string;
};
