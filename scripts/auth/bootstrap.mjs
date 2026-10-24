import { PrismaClient } from '@prisma/client';
import { loadDatabaseEnvironment, databaseUrl } from '../db/environment.mjs';
import { hashPassword, validPassword } from '../../src/server/auth/password.ts';

loadDatabaseEnvironment();
let prisma;
try {
  databaseUrl();
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = (process.env.BOOTSTRAP_ADMIN_NAME || 'Quản trị viên').trim();
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email)
    || !validPassword(password) || name.length < 2 || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new Error('Missing/invalid bootstrap credentials');
  }
  const passwordHash = await hashPassword(password);
  prisma = new PrismaClient();
  await prisma.$transaction(async tx => {
    // PostgreSQL's void return is not deserializable by Prisma; preserve the lock, return text.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(70421004)::text`;
    if (await tx.user.count({ where: { role: 'admin' } })) throw new Error('Admin already exists');
    if (await tx.user.findUnique({ where: { email }, select: { id: true } })) throw new Error('Existing account cannot be promoted by bootstrap');
    const user = await tx.user.create({ data: { email, name, passwordHash, role: 'admin', status: 'active' } });
    await tx.auditLog.create({ data: { userId: user.id, action: 'auth.bootstrap', objectType: 'user', objectId: user.id, summary: 'Tạo quản trị viên đầu tiên bằng CLI' } });
  });
  console.log('Đã tạo admin đầu tiên; không in password hoặc session. Xóa biến BOOTSTRAP_ADMIN_PASSWORD sau khi chạy.');
} catch {
  console.error('Bootstrap chưa hoàn tất. Cần email/password riêng hợp lệ, DB đã migrate, chưa có admin và email chưa thuộc tài khoản khác. Không thay đổi tài khoản đã có.');
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect().catch(() => {});
}
