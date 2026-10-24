export const USER_ROLES = ['member', 'admin', 'mod', 'editor', 'author', 'beta'] as const;
export type UserRole = typeof USER_ROLES[number];
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}
