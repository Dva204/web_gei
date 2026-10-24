import { PrismaClient } from '@prisma/client';
import { databaseUrl, loadDatabaseEnvironment } from '../db/environment.mjs';
loadDatabaseEnvironment();
let prisma;
try {
  databaseUrl(); prisma = new PrismaClient();
  const now = new Date();
  const [sessions, limits] = await prisma.$transaction([
    prisma.session.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.authRateLimit.deleteMany({ where: { expiresAt: { lte: now } } }),
  ]);
  console.log(`Đã dọn ${sessions.count} session và ${limits.count} bộ đếm hết hạn; không xóa tài khoản/audit hoặc phiên còn hiệu lực.`);
} catch {
  console.error('Không dọn được dữ liệu auth hết hạn. Kiểm tra cấu hình/kết nối DB; không in credentials.'); process.exitCode = 1;
} finally { await prisma?.$disconnect().catch(() => {}); }
