import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Prisma, PrismaClient } from '@prisma/client';
import { integrationDatabaseUrl, loadDatabaseEnvironment } from './environment.mjs';

loadDatabaseEnvironment();
let control;
let prisma;
let schema;
let schemaCreated = false;
let checks = 0;
let stage = 'configuration';

async function check(label, operation) {
  await operation();
  checks += 1;
  console.log(`PASS ${label}`);
}

try {
  const url = integrationDatabaseUrl();
  schema = `backend_test_${randomBytes(12).toString('hex')}`;
  assert.match(schema, /^backend_test_[a-f0-9]{24}$/);
  // Only use a fresh randomly named schema. No existing tables/schema are reset or dropped.
  stage = 'connection';
  control = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  await control.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  url.searchParams.set('schema', schema);
  stage = 'migration';
  execFileSync(process.execPath, [
    'node_modules/prisma/build/index.js', 'migrate', 'deploy',
  ], {
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: 'pipe', timeout: 60000,
  });
  prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  stage = 'invariants';
  await check('all versioned migrations apply', async () => {
    const rows = await prisma.$queryRaw`SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL`;
    assert.equal(rows[0].count, 5);
  });
  await check('development seed is idempotent and preserves edited taxonomy', async () => {
    const seed = () => execFileSync(process.execPath, ['scripts/db/seed.mjs'], {
      env: { ...process.env, DATABASE_URL: url.toString(), ALLOW_DEVELOPMENT_SEED: 'true', NODE_ENV: 'development' },
      stdio: 'pipe', timeout: 30000,
    });
    seed();
    assert.equal(await prisma.genre.count(), 3);
    await prisma.genre.update({ where: { slug: 'ngon-tinh' }, data: { name: 'Tên đã chỉnh sửa' } });
    seed();
    assert.equal(await prisma.genre.count(), 3);
    assert.equal((await prisma.genre.findUniqueOrThrow({ where: { slug: 'ngon-tinh' } })).name, 'Tên đã chỉnh sửa');
    assert.equal(await prisma.user.count(), 0);
  });

  const user = await prisma.user.create({ data: { email: 'reader@backend.test', name: 'Test reader' } });
  const story = await prisma.story.create({ data: { slug: 'backend-test', title: 'Truyện test', synopsis: '' } });
  const chapter = await prisma.chapter.create({ data: { storyId: story.id, number: 1 } });
  await check('safe defaults, no chap title required', async () => {
    assert.equal(user.role, 'member');
    assert.equal(story.visibility, 'draft');
    assert.equal(chapter.title, '');
    assert.equal(chapter.status, 'draft');
    assert.equal(chapter.revision, 1);
  });
  await check('unique chapter number', () => assert.rejects(
    prisma.chapter.create({ data: { storyId: story.id, number: 1 } }), { code: 'P2002' },
  ));
  await check('positive chap number enforced by PostgreSQL', () => assert.rejects(
    prisma.chapter.create({ data: { storyId: story.id, number: -1 } }),
  ));
  await check('normalized email enforced', () => assert.rejects(
    prisma.user.create({ data: { email: 'UPPER@backend.test', name: 'Invalid' } }),
  ));
  const page = await prisma.chapterPage.create({ data: {
    chapterId: chapter.id, pageNumber: 1, storageKey: 'comic/original.webp', width: 640, height: 960,
  } });
  await check('positive image dimensions enforced', () => assert.rejects(
    prisma.chapterPage.create({ data: { chapterId: chapter.id, pageNumber: 2, storageKey: 'bad.webp', width: 0, height: 1 } }),
  ));
  await check('unique page order', () => assert.rejects(
    prisma.chapterPage.create({ data: { chapterId: chapter.id, pageNumber: 1, storageKey: 'duplicate.webp', width: 640, height: 960 } }),
    { code: 'P2002' },
  ));
  await check('history foreign keys prevent orphan rows', () => assert.rejects(
    prisma.readingHistory.create({ data: { userId: 'nonexistent', storyId: story.id, chapter: 1 } }), { code: 'P2003' },
  ));
  await check('progress limited to 0..1', () => assert.rejects(
    prisma.readingHistory.create({ data: { userId: user.id, storyId: story.id, chapter: 1, scrollRatio: 1.2 } }),
  ));
  await prisma.bookmark.create({ data: { userId: user.id, storyId: story.id } });
  await prisma.readingHistory.create({ data: { userId: user.id, storyId: story.id, chapter: 1, scrollRatio: 0.5 } });
  await check('unique user bookmark', () => assert.rejects(
    prisma.bookmark.create({ data: { userId: user.id, storyId: story.id } }), { code: 'P2002' },
  ));
  await check('failed writes roll back the whole transaction', async () => {
    await assert.rejects(prisma.$transaction([
      prisma.genre.create({ data: { slug: 'rollback', name: 'Rollback' } }),
      prisma.chapter.create({ data: { storyId: story.id, number: 0 } }),
    ]));
    assert.equal(await prisma.genre.findUnique({ where: { slug: 'rollback' } }), null);
  });
  await check('empty or non-array public snapshots rejected', async () => {
    for (const pageManifest of [[], {}, null]) {
      await assert.rejects(prisma.chapterPublication.create({ data: {
        chapterId: chapter.id, revision: 1, pageManifest: pageManifest === null ? Prisma.JsonNull : pageManifest,
      } }));
    }
  });
  const manifest = [{ pageNumber: 1, storageKey: page.storageKey, width: page.width, height: page.height }];
  await prisma.chapterPublication.create({ data: { chapterId: chapter.id, revision: 1, pageManifest: manifest, publishedBy: user.id } });
  await check('draft page edits leave published snapshot untouched', async () => {
    await prisma.chapterPage.update({ where: { id: page.id }, data: { storageKey: 'comic/draft.webp' } });
    const publication = await prisma.chapterPublication.findUniqueOrThrow({ where: { chapterId: chapter.id } });
    assert.deepEqual(publication.pageManifest, manifest);
  });
  await prisma.session.create({ data: { userId: user.id, tokenHash: 'a'.repeat(64), expiresAt: new Date(Date.now() + 86400000) } });
  await prisma.storyAssignment.create({ data: { userId: user.id, storyId: story.id, kind: 'author' } });
  const audit = await prisma.auditLog.create({ data: { userId: user.id, action: 'test', objectType: 'story', objectId: story.id, summary: 'Integration test' } });
  await check('account deletion removes private data, retains audit and publication', async () => {
    await prisma.user.delete({ where: { id: user.id } });
    assert.equal(await prisma.session.count(), 0);
    assert.equal(await prisma.bookmark.count(), 0);
    assert.equal(await prisma.readingHistory.count(), 0);
    assert.equal(await prisma.storyAssignment.count(), 0);
    assert.equal((await prisma.auditLog.findUniqueOrThrow({ where: { id: audit.id } })).userId, null);
    assert.equal((await prisma.chapterPublication.findUniqueOrThrow({ where: { chapterId: chapter.id } })).publishedBy, null);
  });
  await check('story deletion cascades comic rows only', async () => {
    await prisma.story.delete({ where: { id: story.id } });
    assert.equal(await prisma.chapter.count(), 0);
    assert.equal(await prisma.chapterPage.count(), 0);
    assert.equal(await prisma.chapterPublication.count(), 0);
    assert.equal(await prisma.auditLog.count(), 1);
  });
  console.log(`Database integration: ${checks} checks passed.`);
} catch (error) {
  // Even CLI errors may include DATABASE_URL: never print raw errors or child output.
  console.error(`Database integration chưa hoàn tất tại ${stage} (${checks} checks passed). Kiểm tra TEST_DATABASE_URL riêng, engine PostgreSQL và migration.`);
  if (error instanceof assert.AssertionError) console.error('Một assertion nghiệp vụ không đạt.');
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect().catch(() => {});
  try {
    if (schemaCreated && control && /^backend_test_[a-f0-9]{24}$/.test(schema)) {
      // Destructive cleanup is confined to the exact fresh schema this run created.
      await control.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
      console.log('Đã dọn schema test riêng của lần chạy này; không thay đổi dữ liệu ứng dụng.');
    }
  } catch {
    console.error('Không dọn được schema test của lần chạy này; cần kiểm tra thủ công.');
    process.exitCode = 1;
  }
  await control?.$disconnect().catch(() => {});
}
