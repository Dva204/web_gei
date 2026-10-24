import { afterEach, describe, expect, it, vi } from 'vitest';
import { allowDevelopmentSeed, databaseUrl, integrationDatabaseUrl } from '../../scripts/db/environment.mjs';

afterEach(() => vi.unstubAllEnvs());

describe('database CLI safety', () => {
  it('requires a database URL without printing credentials', () => {
    vi.stubEnv('DATABASE_URL', '');
    expect(() => databaseUrl()).toThrow('DATABASE_URL chưa được cấu hình');
    vi.stubEnv('DATABASE_URL', 'not a URL private');
    expect(() => databaseUrl()).toThrow('DATABASE_URL không hợp lệ');
  });
  it('accepts only PostgreSQL URLs', () => {
    vi.stubEnv('DATABASE_URL', 'mysql://user:private@localhost/db');
    expect(() => databaseUrl()).toThrow('phải dùng PostgreSQL');
    vi.stubEnv('DATABASE_URL', 'postgresql://user:private@localhost/db');
    expect(databaseUrl().hostname).toBe('localhost');
  });
  it('refuses seeds without explicit opt-in', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOW_DEVELOPMENT_SEED', 'false');
    expect(() => allowDevelopmentSeed(new URL('postgresql://localhost/db'))).toThrow();
  });
  it('refuses production even with opt-in', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_DEVELOPMENT_SEED', 'true');
    expect(() => allowDevelopmentSeed(new URL('postgresql://localhost/db'))).toThrow();
  });
  it('refuses remote database seeds', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOW_DEVELOPMENT_SEED', 'true');
    expect(() => allowDevelopmentSeed(new URL('postgresql://user:private@remote.example/db'))).toThrow('local');
  });
  it.each(['localhost', '127.0.0.1', '[::1]'])('allows opted-in local dev on %s', hostname => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOW_DEVELOPMENT_SEED', 'true');
    expect(() => allowDevelopmentSeed(new URL(`postgresql://${hostname}/db`))).not.toThrow();
  });
});

describe('integration target guard', () => {
  it('requires TEST_DATABASE_URL rather than falling back to the app DB', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/app');
    vi.stubEnv('TEST_DATABASE_URL', '');
    expect(() => integrationDatabaseUrl()).toThrow('TEST_DATABASE_URL');
  });
  it('rejects a non-test database', () => {
    vi.stubEnv('TEST_DATABASE_URL', 'postgresql://localhost/app');
    expect(() => integrationDatabaseUrl()).toThrow('kết thúc _test');
  });
  it.each(['localhost', '127.0.0.1', '[::1]'])('rejects the same app DB via local alias %s', hostname => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/app_test');
    vi.stubEnv('TEST_DATABASE_URL', `postgresql://${hostname}:5432/app_test?schema=different`);
    expect(() => integrationDatabaseUrl()).toThrow('trùng database');
  });
  it('accepts a separate test database', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/app');
    vi.stubEnv('TEST_DATABASE_URL', 'postgresql://localhost/app_test');
    expect(integrationDatabaseUrl().pathname).toBe('/app_test');
  });
});
