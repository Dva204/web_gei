import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@/server/db/prisma';
import {
  clearLibrary,
  importLibrary,
  library,
  setBookmark,
  setProgress,
} from '@/server/library/repository';
import {
  changePassword,
  revokeSession,
  sessions,
  updateProfile,
} from '@/server/auth/account';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { issueSession, userDto } from '@/server/auth/session';

describe.skipIf(process.env.RUN_LIBRARY_DB_SMOKE !== '1')(
  'B5 isolated DB smoke',
  () => {
    afterAll(async () => {
      await prisma.$disconnect();
    });
    it('isolates libraries and manages profile/password/sessions', async () => {
      expect(
        new URL(process.env.DATABASE_URL!).searchParams.get('schema'),
      ).toMatch(/^backend_test_[a-f0-9]{24}$/);
      const oldPassword = 'Old-isolated-password!99',
        passwordHash = await hashPassword(oldPassword);
      const [first, second] = await Promise.all([
        prisma.user.create({
          data: {
            email: 'reader1@backend.test',
            name: 'Reader One',
            passwordHash,
          },
        }),
        prisma.user.create({
          data: {
            email: 'reader2@backend.test',
            name: 'Reader Two',
            passwordHash,
          },
        }),
      ]);
      const user = userDto(first),
        other = userDto(second);
      const story = await prisma.story.create({
        data: {
          title: 'Public B5',
          slug: 'public-b5',
          synopsis: '',
          visibility: 'public',
          rightsType: 'own',
          chapters: {
            create: {
              number: 1,
              publication: {
                create: {
                  revision: 1,
                  pageManifest: [
                    {
                      pageNumber: 1,
                      storageKey:
                        'comic/00000000-0000-0000-0000-000000000001.webp',
                      width: 64,
                      height: 96,
                    },
                  ],
                },
              },
            },
          },
        },
      });
      await setBookmark(user, story.id, true);
      await setProgress(user, story.id, { chapter: 1, scrollRatio: 0.6 });
      expect((await library(user)).bookmarks).toHaveLength(1);
      expect((await library(user)).history[0].scrollRatio).toBe(0.6);
      expect((await library(other)).bookmarks).toHaveLength(0);
      await expect(
        setProgress(other, story.id, { chapter: 2, scrollRatio: 0 }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await importLibrary(user, {
        bookmarks: [story.id],
        history: [
          {
            storyId: story.id,
            slug: story.slug,
            chapter: 1,
            scrollRatio: 0.2,
            updatedAt: new Date().toISOString(),
          },
        ],
      });
      expect((await library(user)).history[0].scrollRatio).toBe(0.6);
      expect((await clearLibrary(other, { kind: 'history' })).removed).toBe(0);
      expect((await library(user)).history).toHaveLength(1);

      const one = await prisma.$transaction((tx) => issueSession(tx, user.id));
      const two = await prisma.$transaction((tx) => issueSession(tx, user.id));
      const foreign = await prisma.$transaction((tx) =>
        issueSession(tx, other.id),
      );
      expect(
        (await sessions(user, one.token)).filter((row) => row.current),
      ).toHaveLength(1);
      await expect(
        revokeSession(
          user,
          one.token,
          (await sessions(other, foreign.token))[0].id,
        ),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      const profile = await updateProfile(user, { name: 'Tên mới' });
      expect(profile.name).toBe('Tên mới');
      await changePassword(user, one.token, {
        currentPassword: oldPassword,
        newPassword: 'New-isolated-password!88',
        revokeOtherSessions: true,
      });
      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(
        await verifyPassword('New-isolated-password!88', stored.passwordHash),
      ).toBe(true);
      const remaining = await sessions(user, one.token);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].current).toBe(true);
      expect(two.token).not.toBe(one.token);
    }, 30000);
  },
);
