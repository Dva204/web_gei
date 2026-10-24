import 'server-only';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';
import { actorInTransaction, audit, grant, transaction } from './common';
import {
  exact,
  idValue,
  pageQuery,
  revisionValue,
  slugValue,
  text,
} from './input';
import { normalizeVi } from '@/shared/lib/utils/normalizeVi';
import type { SessionUser } from '@/shared/lib/auth/types';

export type TaxonomyKind = 'authors' | 'genres';
export async function listTaxonomy(kind: TaxonomyKind, query: URLSearchParams) {
  const { page: requestedPage, pageSize } = pageQuery(query);
  const search = text(query.get('search'), 'Tìm kiếm', 200);
  const deletedAt = query.get('deleted') === 'true' ? { not: null } : null;
  const where = {
    deletedAt,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: normalizeVi(search).replace(/\s+/g, '-') } },
          ],
        }
      : {}),
  };
  const total =
    kind === 'authors'
      ? await prisma.author.count({ where })
      : await prisma.genre.count({ where });
  const totalPages = Math.ceil(total / pageSize),
    page = Math.min(requestedPage, Math.max(1, totalPages));
  const options = {
    where,
    orderBy: { name: 'asc' as const },
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
  const rows =
    kind === 'authors'
      ? await prisma.author.findMany(options)
      : await prisma.genre.findMany(options);
  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: 'bio' in row ? row.bio || '' : row.description || '',
      revision: row.revision,
      deletedAt: row.deletedAt?.toISOString(),
    })),
    total,
    totalPages,
    page,
    pageSize,
  };
}
export async function saveTaxonomy(
  user: SessionUser,
  kind: TaxonomyKind,
  input: Record<string, unknown>,
  id?: string,
) {
  exact(input, ['name', 'slug', 'description', ...(id ? ['revision'] : [])]);
  const name = text(input.name, 'Tên', 120, true),
    slug = slugValue(input.slug),
    description = text(input.description, 'Mô tả', 4000);
  const revision = id ? revisionValue(input.revision) : 1;
  return transaction(async (tx) => {
    const actor = await actorInTransaction(tx, user);
    grant(actor, 'taxonomy.manage');
    if (id) {
      idValue(id);
      if (kind === 'authors')
        await tx.$queryRaw`SELECT "id" FROM "Author" WHERE "id" = ${id} FOR UPDATE`;
      else
        await tx.$queryRaw`SELECT "id" FROM "Genre" WHERE "id" = ${id} FOR UPDATE`;
      const row =
        kind === 'authors'
          ? await tx.author.findUnique({ where: { id } })
          : await tx.genre.findUnique({ where: { id } });
      if (!row || row.deletedAt)
        throw new ApiError('NOT_FOUND', 'Không tìm thấy dữ liệu.');
      if (row.revision !== revision)
        throw new ApiError('CONFLICT', 'Dữ liệu đã thay đổi. Hãy tải lại.');
    }
    const row =
      kind === 'authors'
        ? id
          ? await tx.author.update({
              where: { id },
              data: {
                name,
                slug,
                bio: description,
                searchName: normalizeVi(name),
                revision: { increment: 1 },
              },
            })
          : await tx.author.create({
              data: {
                name,
                slug,
                bio: description,
                searchName: normalizeVi(name),
              },
            })
        : id
          ? await tx.genre.update({
              where: { id },
              data: { name, slug, description, revision: { increment: 1 } },
            })
          : await tx.genre.create({ data: { name, slug, description } });
    await audit(
      tx,
      actor,
      id ? 'taxonomy.update' : 'taxonomy.create',
      kind,
      row.id,
    );
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description,
      revision: row.revision,
    };
  });
}
export async function trashTaxonomy(
  user: SessionUser,
  kind: TaxonomyKind,
  id: string,
  input: Record<string, unknown>,
  restore = false,
) {
  exact(input, ['revision']);
  const revision = revisionValue(input.revision);
  return transaction(async (tx) => {
    const actor = await actorInTransaction(tx, user);
    grant(actor, 'taxonomy.manage');
    idValue(id);
    if (kind === 'authors')
      await tx.$queryRaw`SELECT "id" FROM "Author" WHERE "id" = ${id} FOR UPDATE`;
    else
      await tx.$queryRaw`SELECT "id" FROM "Genre" WHERE "id" = ${id} FOR UPDATE`;
    const row =
      kind === 'authors'
        ? await tx.author.findUnique({ where: { id } })
        : await tx.genre.findUnique({ where: { id } });
    if (!row) throw new ApiError('NOT_FOUND', 'Không tìm thấy dữ liệu.');
    if (row.revision !== revision || Boolean(row.deletedAt) !== restore)
      throw new ApiError('CONFLICT', 'Dữ liệu đã thay đổi. Hãy tải lại.');
    if (!restore) {
      const used = await tx.story.count({
        where: {
          deletedAt: null,
          ...(kind === 'authors'
            ? { authorId: id }
            : { genres: { some: { genreId: id } } }),
        },
      });
      if (used)
        throw new ApiError(
          'CONFLICT',
          'Đang được dùng bởi truyện. Hãy chuyển truyện sang tác giả/thể loại khác trước khi xóa.',
        );
    }
    const data = {
      deletedAt: restore ? null : new Date(),
      revision: { increment: 1 },
    };
    if (kind === 'authors') await tx.author.update({ where: { id }, data });
    else await tx.genre.update({ where: { id }, data });
    await audit(
      tx,
      actor,
      restore ? 'taxonomy.restore' : 'taxonomy.trash',
      kind,
      id,
    );
    return { id, restored: restore };
  });
}
