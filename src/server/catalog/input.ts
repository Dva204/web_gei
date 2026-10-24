import 'server-only';
import { ApiError } from '../http/errors';
import { normalizeVi } from '@/shared/lib/utils/normalizeVi';

export const invalid = (message: string): never => {
  throw new ApiError('INVALID_REQUEST', message);
};
export function exact(input: Record<string, unknown>, keys: string[]) {
  if (Object.keys(input).some((key) => !keys.includes(key)))
    invalid('Yêu cầu chứa trường không được phép.');
}
export function text(
  value: unknown,
  label: string,
  max: number,
  required = false,
) {
  if (value == null && !required) return '';
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (required && !value.trim())
  )
    invalid(`${label} không hợp lệ (tối đa ${max} ký tự).`);
  return (value as string).trim();
}
export function idValue(value: unknown) {
  return text(value, 'ID', 128, true);
}
export function slugValue(value: unknown) {
  const slug = text(value, 'Slug', 120, true);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    invalid('Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang.');
  return slug;
}
export function revisionValue(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 1)
    invalid('Thiếu phiên bản dữ liệu. Hãy tải lại trang.');
  return Number(value);
}
export function enumValue<T extends string>(
  value: unknown,
  values: readonly T[],
  label: string,
): T {
  if (!values.includes(value as T)) invalid(`${label} không hợp lệ.`);
  return value as T;
}
export function pageQuery(query: URLSearchParams, maxSize = 100) {
  const integer = (key: string, fallback: number, max: number) => {
    const raw = query.get(key);
    if (!raw) return fallback;
    if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > max)
      invalid(`${key} không hợp lệ.`);
    return Number(raw);
  };
  return {
    page: integer('page', 1, 1_000_000),
    pageSize: integer('pageSize', 20, maxSize),
  };
}
export function storyInput(input: Record<string, unknown>, update: boolean) {
  exact(input, [
    'title',
    'slug',
    'synopsis',
    'authorId',
    'genreIds',
    'status',
    'visibility',
    'ending',
    'featured',
    'coverStorageKey',
    'rightsType',
    'rightsNote',
    'rightsExpiresAt',
    'seoTitle',
    'seoDescription',
    ...(update ? ['revision'] : []),
  ]);
  const genreIds = input.genreIds;
  if (!Array.isArray(genreIds) || genreIds.length > 12)
    invalid('Chọn tối đa 12 thể loại.');
  const ids = [...new Set((genreIds as unknown[]).map(idValue))];
  const coverStorageKey =
    text(input.coverStorageKey, 'Khóa ảnh bìa', 240) || null;
  if (
    coverStorageKey &&
    !/^covers\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/.test(
      coverStorageKey,
    )
  )
    invalid('Khóa ảnh bìa không hợp lệ. Upload ảnh sẽ được bổ sung ở B4.');
  let rightsExpiresAt: Date | null = null;
  if (input.rightsExpiresAt) {
    const date = text(input.rightsExpiresAt, 'Ngày hết hạn', 40);
    rightsExpiresAt = new Date(date);
    if (!/^\d{4}-\d{2}-\d{2}T/.test(date) || !Number.isFinite(+rightsExpiresAt))
      invalid('Ngày hết hạn quyền không hợp lệ.');
  }
  if (typeof input.featured !== 'boolean')
    invalid('Trạng thái nổi bật không hợp lệ.');
  return {
    title: text(input.title, 'Tên truyện', 180, true),
    slug: slugValue(input.slug),
    searchTitle: normalizeVi(text(input.title, 'Tên truyện', 180, true)),
    synopsis: text(input.synopsis, 'Tóm tắt', 8000),
    authorId: input.authorId ? idValue(input.authorId) : null,
    genreIds: ids,
    status: enumValue(
      input.status,
      ['ongoing', 'full', 'paused'] as const,
      'Trạng thái',
    ),
    visibility: enumValue(
      input.visibility,
      ['draft', 'hidden', 'public'] as const,
      'Hiển thị',
    ),
    ending: input.ending
      ? enumValue(input.ending, ['HE', 'SE', 'OE'] as const, 'Kết thúc')
      : null,
    featured: input.featured as boolean,
    coverStorageKey,
    rightsType: input.rightsType
      ? enumValue(
          input.rightsType,
          [
            'own',
            'agreement',
            'public_domain',
            'open_license',
            'other',
          ] as const,
          'Loại quyền',
        )
      : null,
    rightsNote: text(input.rightsNote, 'Minh chứng quyền', 4000) || null,
    rightsExpiresAt,
    seoTitle: text(input.seoTitle, 'Tiêu đề SEO', 60) || null,
    seoDescription: text(input.seoDescription, 'Mô tả SEO', 160) || null,
    revision: update ? revisionValue(input.revision) : 1,
  };
}
export function assertRights(input: {
  rightsType: string | null;
  rightsNote: string | null;
  rightsExpiresAt: Date | null;
}) {
  if (
    !input.rightsType ||
    (input.rightsType !== 'own' && !input.rightsNote?.trim()) ||
    (input.rightsExpiresAt && input.rightsExpiresAt <= new Date())
  ) {
    invalid(
      'Cần khai báo quyền hợp lệ, minh chứng và thời hạn trước khi công khai.',
    );
  }
}
