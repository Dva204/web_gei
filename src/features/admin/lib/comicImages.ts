import type { ComicPage } from '@/features/catalog/types/chapter';
export const IMAGE_LIMIT = 10 * 1024 * 1024;
export const BATCH_LIMIT = 100 * 1024 * 1024;
export function imageFileError(
  file: Pick<File, 'name' | 'type' | 'size'>,
): string | null {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    return `${file.name}: chỉ nhận PNG, JPG hoặc WebP.`;
  if (!file.size || file.size > IMAGE_LIMIT)
    return `${file.name}: ảnh phải từ 1 byte đến 10 MB.`;
  return null;
}
export function naturalFiles(files: File[]): File[] {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, 'vi', { numeric: true }),
  );
}
export async function readComicImages(files: File[]): Promise<ComicPage[]> {
  if (files.reduce((total, file) => total + file.size, 0) > BATCH_LIMIT)
    throw new Error('Mỗi lần chọn tối đa 100 MB ảnh.');
  for (const file of files) {
    const error = imageFileError(file);
    if (error) throw new Error(error);
  }
  const pages: ComicPage[] = [];
  for (const file of naturalFiles(files)) {
    const image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error(`Không đọc được ${file.name}.`));
      reader.readAsDataURL(file);
    });
    const size = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const picture = new window.Image();
        picture.onload = () =>
          resolve({
            width: picture.naturalWidth,
            height: picture.naturalHeight,
          });
        picture.onerror = () =>
          reject(new Error(`${file.name}: ảnh hỏng hoặc không hợp lệ.`));
        picture.src = image;
      },
    );
    pages.push({ id: crypto.randomUUID(), image, ...size, alt: file.name });
  }
  return pages;
}
export function movePage<T>(pages: T[], from: number, to: number): T[] {
  if (
    from < 0 ||
    from >= pages.length ||
    to < 0 ||
    to >= pages.length ||
    from === to
  )
    return pages;
  const next = [...pages],
    [page] = next.splice(from, 1);
  next.splice(to, 0, page);
  return next;
}
