import { PrismaClient } from '@prisma/client';
import { allowDevelopmentSeed, databaseUrl, loadDatabaseEnvironment } from './environment.mjs';

loadDatabaseEnvironment();
let prisma;
try {
  allowDevelopmentSeed(databaseUrl());
  prisma = new PrismaClient();
  const genres = [
    { slug: 'ngon-tinh', name: 'Ngôn tình' },
    { slug: 'hoc-duong', name: 'Học đường' },
    { slug: 'doi-thuong', name: 'Đời thường' },
  ];
  // Atomic and idempotent. Do not overwrite edited labels, create users or grant roles.
  await prisma.$transaction(genres.map(genre => prisma.genre.upsert({
    where: { slug: genre.slug }, create: genre, update: {},
  })));
  console.log('Seed hoàn tất: 3 thể loại mẫu; không tạo tài khoản hoặc xuất bản truyện.');
} catch {
  console.error('Seed chưa hoàn tất. Cần DB local đã migrate và ALLOW_DEVELOPMENT_SEED=true ở development. Không thay thế dữ liệu cũ.');
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect().catch(() => {});
}
