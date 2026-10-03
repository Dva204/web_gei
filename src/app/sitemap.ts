import type { MetadataRoute } from 'next';
import { listStories } from '@/lib/data';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const d = await listStories({ pageSize: 100 });
  return [
    { url: 'https://vuonngontinh.example', lastModified: new Date() },
    {
      url: 'https://vuonngontinh.example/bang-xep-hang',
      lastModified: new Date(),
    },
    ...d.items.map((s) => ({
      url: `https://vuonngontinh.example/truyen/${s.slug}`,
      lastModified: new Date(s.updatedAt),
    })),
  ];
}
