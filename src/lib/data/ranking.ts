import { listStories } from './stories';
export async function getRanking(period: 'day' | 'week' | 'month') {
  const data = await listStories({
    sort: period === 'month' ? 'rating' : 'views',
    pageSize: 24,
  });
  return data.items;
}
