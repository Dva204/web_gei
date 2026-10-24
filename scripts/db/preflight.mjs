import { PrismaClient } from '@prisma/client';
import { databaseUrl, loadDatabaseEnvironment } from './environment.mjs';

loadDatabaseEnvironment();
let prisma;
try {
  databaseUrl();
  prisma = new PrismaClient();
  const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  const names = tables.map(row => row.table_name);
  console.log(JSON.stringify({ tables: names, empty: names.length === 0 }));
  if (!names.length) console.log('Schema trống: có thể áp dụng migration mới.');
  else if (!names.includes('_prisma_migrations')) {
    console.log('Có bảng cũ chưa có lịch sử Prisma: dừng, kiểm tra backup/schema/baseline trong docs/backend-setup.md.');
  } else {
    console.log('Đã có lịch sử Prisma: kiểm tra db:status trước deploy; không reset nếu drift.');
  }
} catch {
  console.error('Preflight chưa hoàn tất. Kiểm tra PostgreSQL và DATABASE_URL; không thay đổi database.');
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect().catch(() => {});
}
