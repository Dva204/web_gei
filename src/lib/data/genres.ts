import type { Genre } from '@/types/genre';
export const genres: Genre[] = [
  'Hiện đại',
  'Cổ đại',
  'Xuyên không',
  'Trọng sinh',
  'Cung đấu',
  'Hào môn',
  'Học đường',
  'Showbiz',
  'Điền văn',
  'Sủng',
  'Ngược',
  'Chữa lành',
  'Đoản văn',
  'Hài hước',
  'Nhật Bản',
  'Hàn Quốc',
  'Trung Quốc',
].map((name) => ({
  name,
  slug: name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, '-'),
  description: `Truyện ngôn tình ${name.toLowerCase()} nhẹ nhàng, phù hợp mọi lứa tuổi.`,
}));
