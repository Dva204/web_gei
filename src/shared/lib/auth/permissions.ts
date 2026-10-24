import type { UserRole } from './types';

export const PERMISSIONS = [
  'dashboard.view', 'stories.manage', 'stories.view', 'stories.publish', 'stories.assign',
  'chapters.manage', 'chapters.view', 'chapters.publish', 'chapters.beta',
  'import.manage', 'taxonomy.manage', 'comments.moderate', 'reports.manage', 'reports.view',
  'takedowns.view', 'takedowns.hide', 'chat.manage', 'users.sanction', 'users.roles',
  'ads.manage', 'stats.content', 'seo.manage', 'content.manage', 'settings.manage',
  'audit.own', 'audit.all', 'backup.manage',
] as const;
export type Permission = typeof PERMISSIONS[number];
const grants: Partial<Record<UserRole, readonly Permission[]>> = {
  mod: ['dashboard.view', 'comments.moderate', 'reports.manage', 'reports.view', 'takedowns.view', 'takedowns.hide', 'chat.manage', 'users.sanction', 'audit.own'],
  editor: ['dashboard.view', 'stories.manage', 'stories.view', 'stories.publish', 'stories.assign', 'chapters.manage', 'chapters.view', 'chapters.publish', 'import.manage', 'taxonomy.manage', 'reports.view', 'stats.content', 'seo.manage', 'content.manage'],
  author: ['dashboard.view'], beta: ['dashboard.view'],
};
export function permissionDecision(role: UserRole, action: string): 'grant' | 'author' | 'beta' | 'deny' {
  if (!(PERMISSIONS as readonly string[]).includes(action)) return 'deny';
  if (role === 'admin' || grants[role]?.includes(action as Permission)) return 'grant';
  if (role === 'author' && ['stories.manage', 'stories.view', 'chapters.manage', 'chapters.view', 'import.manage', 'stats.content'].includes(action)) return 'author';
  if (role === 'beta' && ['stories.view', 'chapters.view', 'chapters.beta'].includes(action)) return 'beta';
  return 'deny';
}
