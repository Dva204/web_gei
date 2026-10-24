import 'server-only';
import { Prisma } from '@prisma/client';
import { ApiError } from '../http/errors';
import { actorInTransaction, audit, transaction } from '../catalog/common';
import { enumValue, exact, idValue } from '../catalog/input';
import { requireStory, chapNumber } from './access';
import { assetPages, manifestOf } from './repository';
import { mediaUrl } from '@/shared/lib/storage/media';
import type { SessionUser } from '@/shared/lib/auth/types';

type ImportRow = { number: number; pageKeys: string[] };
function rowsValue(value: unknown): ImportRow[] {
  if (!Array.isArray(value) || !value.length || value.length > 20)
    throw new ApiError('INVALID_REQUEST', 'Mỗi lần nhập 1–20 chap.');
  let total = 0;
  const rows = value.map((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row))
      throw new ApiError('INVALID_REQUEST', 'Chap nhập không hợp lệ.');
    exact(row, ['number', 'pageKeys']);
    if (
      !Array.isArray(row.pageKeys) ||
      !row.pageKeys.length ||
      row.pageKeys.length > 300 ||
      row.pageKeys.some((key: unknown) => typeof key !== 'string')
    )
      throw new ApiError('INVALID_REQUEST', 'Mỗi chap cần 1–300 ảnh.');
    total += row.pageKeys.length;
    return {
      number: chapNumber(row.number),
      pageKeys: row.pageKeys as string[],
    };
  });
  if (total > 600)
    throw new ApiError('INVALID_REQUEST', 'Mỗi lần nhập tối đa 600 ảnh.');
  return rows;
}
export async function previewImport(
  user: SessionUser,
  storyId: string,
  input: Record<string, unknown>,
) {
  exact(input, ['chapters']);
  const rows = rowsValue(input.chapters);
  return transaction(async (tx) => {
    const actor = await actorInTransaction(tx, user);
    await requireStory(actor, storyId, 'import.manage', tx, true);
    const existing = await tx.chapter.findMany({
      where: { storyId, number: { in: rows.map((row) => row.number) } },
      select: { number: true },
    });
    const numbers = [...rows].map((row) => row.number).sort((a, b) => a - b),
      gaps = numbers.some(
        (number, index) => index > 0 && number > numbers[index - 1] + 1,
      );
    const result = [];
    for (const row of rows) {
      const pages = await assetPages(tx, storyId, row.pageKeys);
      result.push({
        number: row.number,
        selected: true,
        warnings: [
          ...(rows.filter((other) => other.number === row.number).length > 1
            ? ['Số chap trùng trong bản nhập.']
            : []),
          ...(existing.some((other) => other.number === row.number)
            ? ['Chap đã tồn tại (kể cả đã xóa); không nhập đè.']
            : []),
        ],
        pages: pages.map((page) => ({
          id: page.storageKey,
          storageKey: page.storageKey,
          image: mediaUrl(page.storageKey)!,
          width: page.width,
          height: page.height,
          alt: page.alt,
        })),
      });
    }
    const job = await tx.importJob.create({
      data: {
        storyId,
        userId: actor.id,
        payload: rows as unknown as Prisma.InputJsonArray,
        expiresAt: new Date(Date.now() + 2 * 3600000),
      },
    });
    return {
      id: job.id,
      expiresAt: job.expiresAt.toISOString(),
      chapters: result,
      warnings: gaps
        ? ['Các số chap không liên tục. Hãy kiểm tra trước khi nhập.']
        : [],
    };
  });
}
export async function commitImport(
  user: SessionUser,
  storyId: string,
  input: Record<string, unknown>,
) {
  exact(input, ['jobId', 'numbers', 'targetStatus']);
  const jobId = idValue(input.jobId),
    targetStatus = enumValue(
      input.targetStatus,
      ['draft', 'ready'] as const,
      'Trạng thái nhập',
    );
  if (
    !Array.isArray(input.numbers) ||
    !input.numbers.length ||
    input.numbers.length > 20
  )
    throw new ApiError('INVALID_REQUEST', 'Chọn 1–20 chap.');
  const numbers = input.numbers.map(chapNumber);
  if (new Set(numbers).size !== numbers.length)
    throw new ApiError('INVALID_REQUEST', 'Số chap bị trùng.');
  return transaction(async (tx) => {
    const actor = await actorInTransaction(tx, user);
    await requireStory(actor, storyId, 'import.manage', tx, true);
    await tx.$queryRaw`SELECT "id" FROM "ImportJob" WHERE "id" = ${jobId} FOR UPDATE`;
    const job = await tx.importJob.findFirst({
      where: { id: jobId, storyId, userId: actor.id },
    });
    if (!job) throw new ApiError('NOT_FOUND', 'Không tìm thấy bản xem trước.');
    if (job.status === 'committed')
      return { created: job.created, alreadyCommitted: true };
    if (job.expiresAt <= new Date())
      throw new ApiError(
        'CONFLICT',
        'Bản xem trước đã hết hạn. Hãy phân tích lại.',
      );
    const rows = rowsValue(job.payload),
      chosen = rows.filter((row) => numbers.includes(row.number));
    if (
      chosen.length !== numbers.length ||
      numbers.some(
        (number) => rows.filter((row) => row.number === number).length !== 1,
      )
    )
      throw new ApiError(
        'INVALID_REQUEST',
        'Chap chọn không khớp bản xem trước.',
      );
    if (await tx.chapter.count({ where: { storyId, number: { in: numbers } } }))
      throw new ApiError(
        'CONFLICT',
        'Có chap vừa được tạo ở phiên khác. Không nhập đè; hãy phân tích lại.',
      );
    for (const row of chosen) {
      const pages = await assetPages(tx, storyId, row.pageKeys);
      const chapter = await tx.chapter.create({
        data: {
          storyId,
          number: row.number,
          status: targetStatus,
          pages: { create: pages },
        },
      });
      await tx.chapterVersion.create({
        data: {
          chapterId: chapter.id,
          pageManifest: manifestOf(pages),
          note: 'Nhập hàng loạt',
          savedBy: actor.id,
        },
      });
    }
    await tx.importJob.update({
      where: { id: job.id },
      data: {
        status: 'committed',
        committedAt: new Date(),
        created: chosen.length,
      },
    });
    await audit(tx, actor, 'chapter.import', 'story', storyId);
    return { created: chosen.length, alreadyCommitted: false };
  });
}
