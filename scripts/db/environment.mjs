import nextEnv from '@next/env';

export function loadDatabaseEnvironment() {
  nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production', {
    info() {}, error() {},
  });
}

export function databaseUrl(variable = 'DATABASE_URL') {
  const value = process.env[variable];
  if (!value) throw new Error(`${variable} chưa được cấu hình.`);
  let parsed;
  try { parsed = new URL(value); } catch {
    throw new Error(`${variable} không hợp lệ. Không in URL để tránh lộ credentials.`);
  }
  if (!['postgresql:', 'postgres:'].includes(parsed.protocol)) {
    throw new Error(`${variable} phải dùng PostgreSQL.`);
  }
  if (!parsed.hostname || parsed.pathname.length < 2) {
    throw new Error(`${variable} cần host và tên database.`);
  }
  return parsed;
}

export function integrationDatabaseUrl() {
  const url = databaseUrl('TEST_DATABASE_URL');
  if (!decodeURIComponent(url.pathname).endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL phải dùng database riêng kết thúc _test.');
  }
  if (process.env.DATABASE_URL) {
    const app = databaseUrl();
    const hostname = value => ['localhost', '127.0.0.1', '[::1]'].includes(value.hostname.toLowerCase())
      ? 'loopback' : value.hostname.toLowerCase();
    if (hostname(url) === hostname(app) && (url.port || '5432') === (app.port || '5432')
      && decodeURIComponent(url.pathname) === decodeURIComponent(app.pathname)) {
      throw new Error('Database test không được trùng database ứng dụng.');
    }
  }
  return url;
}

export function allowDevelopmentSeed(url) {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEVELOPMENT_SEED !== 'true') {
    throw new Error('Seed chỉ chạy ở development khi ALLOW_DEVELOPMENT_SEED=true.');
  }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Seed mẫu chỉ được chạy với PostgreSQL local.');
  }
}
