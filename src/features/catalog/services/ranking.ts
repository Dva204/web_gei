import { listStories } from './stories';
export async function getRanking(period: 'day' | 'week' | 'month') {
  const data = await listStories({
    sort: 'views',
    pageSize: 24,
  });
  void period; // Period-specific tracking will be implemented with statistics (B9).
  return data.items;
}
