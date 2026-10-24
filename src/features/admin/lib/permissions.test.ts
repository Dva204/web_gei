import { describe, expect, it } from 'vitest';
import { can } from './permissions';
import type { AdminUser, Role } from '../types';
const user = (role: Role) => ({ id: 'u4', role }) as AdminUser;
describe('FE role gates', () => {
  it('rejects absent or malformed sessions', () => {
    expect(can(null, 'chapters.manage')).toBe(false);
    expect(can(user('unknown' as Role), 'chapters.manage')).toBe(false);
  });
  it('allows assigned authors to edit only their stories', () => {
    expect(
      can(user('author'), 'chapters.manage', {
        type: 'story',
        assigneeIds: ['u4'],
      }),
    ).toBe(true);
    expect(
      can(user('author'), 'chapters.manage', {
        type: 'story',
        assigneeIds: ['u1'],
      }),
    ).toBe(false);
    expect(can(user('author'), 'chapters.manage')).toBe(false);
  });
  it('does not grant publication through an assignment', () => {
    expect(
      can(user('author'), 'chapters.publish', {
        type: 'story',
        assigneeIds: ['u4'],
      }),
    ).toBe(false);
    expect(can(user('editor'), 'chapters.publish')).toBe(true);
    expect(can(user('mod'), 'chapters.publish')).toBe(false);
  });
});
