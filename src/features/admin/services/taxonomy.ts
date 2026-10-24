import type { Paginated } from '@/shared/types/pagination';
import { adminApi, queryString } from './http';
export type TaxonomyKind = 'authors' | 'genres';
export type TaxonomyItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  revision: number;
  deletedAt?: string;
};
export const listTaxonomy = (
  kind: TaxonomyKind,
  query: {
    page?: number;
    pageSize?: number;
    search?: string;
    deleted?: boolean;
  } = {},
) =>
  adminApi<Paginated<TaxonomyItem>>(
    '/api/admin/catalog/' + kind + queryString(query),
  );
export const saveTaxonomy = (kind: TaxonomyKind, item: TaxonomyItem) =>
  adminApi<TaxonomyItem>(
    '/api/admin/catalog/' +
      kind +
      (item.id ? '/' + encodeURIComponent(item.id) : ''),
    item.id ? 'PUT' : 'POST',
    {
      name: item.name,
      slug: item.slug,
      description: item.description,
      ...(item.id ? { revision: item.revision } : {}),
    },
  );
export const trashTaxonomy = (
  kind: TaxonomyKind,
  item: TaxonomyItem,
  restore = false,
) =>
  adminApi(
    '/api/admin/catalog/' + kind + '/' + encodeURIComponent(item.id),
    restore ? 'PATCH' : 'DELETE',
    { revision: item.revision },
  );
export async function taxonomyOptions(kind: TaxonomyKind) {
  const first = await listTaxonomy(kind, { pageSize: 100 });
  const items = [...first.items];
  // Small taxonomy lists use paginated requests, not an unbounded API response.
  for (let page = 2; page <= first.totalPages; page++)
    items.push(...(await listTaxonomy(kind, { pageSize: 100, page })).items);
  return items;
}
