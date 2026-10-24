import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@/server/db/prisma';
import {
  issueSession,
  sessionCookieName,
  userDto,
} from '@/server/auth/session';
import { POST as upload } from '@/app/api/admin/stories/[id]/media/route';
import { POST as createChapter } from '@/app/api/admin/stories/[id]/chapters/route';
import { PUT as editChapter } from '@/app/api/admin/stories/[id]/chapters/[number]/route';
import { POST as publish } from '@/app/api/admin/stories/[id]/chapters/[number]/publication/route';
import { GET as media } from '@/app/api/media/[...key]/route';
import { getPublicChapter } from '@/server/catalog/public';
import { previewImport, commitImport } from '@/server/chapters/imports';

describe.skipIf(process.env.RUN_CHAPTER_DB_SMOKE !== '1')(
  'B4 basic route/DB smoke (not production acceptance)',
  () => {
    afterAll(async () => {
      await prisma.$disconnect();
    });
    it('uploads, publishes immutable snapshots, imports once and runs the due worker', async () => {
      expect(
        new URL(process.env.DATABASE_URL!).searchParams.get('schema'),
      ).toMatch(/^backend_test_[a-f0-9]{24}$/);
      expect(process.env.MEDIA_TEST_VAULT).toMatch(/^media_test_[a-f0-9]{24}$/);
      // Fixtures exist only in the runner's fresh test schema; never a bootstrap/default account.
      const admin = await prisma.user.create({
        data: {
          email: 'chapters@backend.test',
          name: 'B4 fixture',
          role: 'admin',
        },
      });
      const session = await prisma.$transaction((tx) =>
        issueSession(tx, admin.id),
      );
      const cookie = sessionCookieName() + '=' + session.token,
        actor = userDto(admin);
      const story = await prisma.story.create({
        data: {
          title: 'B4 fixture',
          slug: 'b4-fixture',
          synopsis: 'Isolated fixture only.',
          visibility: 'public',
          rightsType: 'own',
        },
      });
      const route = { params: Promise.resolve({ id: story.id }) };
      const chapterRoute = {
        params: Promise.resolve({ id: story.id, number: '1' }),
      };
      const req = (body: unknown) =>
        new Request('https://backend.test/api/test', {
          method: 'POST',
          headers: {
            origin: 'https://backend.test',
            cookie,
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
        });
      async function image(color: string) {
        const png = await sharp({
          create: { width: 64, height: 96, channels: 3, background: color },
        })
          .png()
          .toBuffer();
        const form = new FormData();
        form.append('kind', 'comic');
        form.append(
          'files',
          new File([new Uint8Array(png)], '1.png', { type: 'image/png' }),
        );
        const response = await upload(
          new Request('https://backend.test/api/test', {
            method: 'POST',
            headers: { origin: 'https://backend.test', cookie },
            body: form,
          }),
          route,
        );
        expect(response.status).toBe(201);
        return (await response.json()).data[0];
      }
      const first = await image('#8FD9C4'),
        second = await image('#3C7363');
      const read = (key: string) =>
        media(new Request('https://backend.test/api/media/' + key), {
          params: Promise.resolve({ key: key.split('/') }),
        });
      expect((await read(first.storageKey)).status).toBe(404);
      const created = await createChapter(
        req({
          number: 1,
          title: '',
          status: 'draft',
          pageKeys: [first.storageKey],
        }),
        route,
      );
      expect(created.status).toBe(201);
      let chapter = (await created.json()).data;
      const published = await publish(
        req({ action: 'publish', revision: chapter.revision }),
        chapterRoute,
      );
      expect(published.status).toBe(200);
      chapter = (await published.json()).data;
      const visible = await read(first.storageKey);
      expect(visible.status).toBe(200);
      expect(visible.headers.get('content-type')).toBe('image/webp');
      expect(
        (await getPublicChapter(story.slug, 1))?.chapter.pages[0].image,
      ).toBe(first.image);
      const edited = await editChapter(
        req({
          title: '',
          status: 'draft',
          pageKeys: [second.storageKey],
          revision: chapter.revision,
        }),
        chapterRoute,
      );
      expect(edited.status).toBe(200);
      expect(
        (await getPublicChapter(story.slug, 1))?.chapter.pages[0].image,
      ).toBe(first.image);
      expect((await read(second.storageKey)).status).toBe(404);
      expect(
        (
          await editChapter(
            req({
              title: '',
              status: 'draft',
              pageKeys: [first.storageKey],
              revision: chapter.revision,
            }),
            chapterRoute,
          )
        ).status,
      ).toBe(409);
      const preview = await previewImport(actor, story.id, {
        chapters: [{ number: 2, pageKeys: [second.storageKey] }],
      });
      const selection = {
        jobId: preview.id,
        numbers: [2],
        targetStatus: 'ready',
      };
      expect((await commitImport(actor, story.id, selection)).created).toBe(1);
      expect(
        (await commitImport(actor, story.id, selection)).alreadyCommitted,
      ).toBe(true);
      expect(await getPublicChapter(story.slug, 2)).toBeNull();
      const imported = await prisma.chapter.findUniqueOrThrow({
        where: { storyId_number: { storyId: story.id, number: 2 } },
      });
      const scheduled = await publish(
        req({
          action: 'schedule',
          revision: imported.revision,
          publishAt: new Date(Date.now() + 3600000).toISOString(),
        }),
        { params: Promise.resolve({ id: story.id, number: '2' }) },
      );
      expect(scheduled.status).toBe(200);
      // Simulate time only in this test schema; no changes to application schedules.
      await prisma.chapter.update({
        where: { id: imported.id },
        data: { publishAt: new Date(Date.now() - 1000) },
      });
      execFileSync(process.execPath, ['scripts/chapters/publish-due.mjs'], {
        env: { ...process.env },
        stdio: 'pipe',
        timeout: 20000,
      });
      expect(
        (await getPublicChapter(story.slug, 2))?.chapter.pages[0].image,
      ).toBe(second.image);
      expect((await read(second.storageKey)).status).toBe(200);
    }, 30000);
  },
);
