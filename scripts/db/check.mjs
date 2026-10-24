import { PrismaClient } from '@prisma/client';
import { databaseUrl, loadDatabaseEnvironment } from './environment.mjs';

loadDatabaseEnvironment();
let prisma;
try {
  databaseUrl();
  prisma = new PrismaClient();
  await prisma.$queryRaw`SELECT 1`;
  console.log('PostgreSQL: kết nối thành công.');
  await prisma.user.findFirst({ select: { id: true } });
  await prisma.chapterPublication.findFirst({ select: { chapterId: true } });
  console.log('Schema nền tảng: sẵn sàng. Dùng db:status để kiểm tra migration.');
} catch {
  console.error('Database chưa sẵn sàng: kiểm tra Docker/PostgreSQL, DATABASE_URL và db:status.');
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect().catch(() => {});
}
