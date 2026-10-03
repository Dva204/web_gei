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
  updatedAt: string;
  createdAt: string;
};
