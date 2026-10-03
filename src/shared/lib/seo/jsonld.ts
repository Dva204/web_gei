import type { Story } from '@/features/catalog/types/story';
export function storyJsonLd(story: Story) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: story.title,
    author: { '@type': 'Person', name: story.author },
    description: story.synopsis,
    inLanguage: 'vi',
  };
}
export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((x, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: x.url,
      name: x.name,
    })),
  };
}
