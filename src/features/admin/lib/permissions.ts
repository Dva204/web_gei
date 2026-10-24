import type { AdminUser } from '@/features/admin/types';
import { permissionDecision } from '@/shared/lib/auth/permissions';
type Resource = { type: string; assigneeIds?: string[] };
export function can(user: AdminUser | null | undefined, action: string, resource?: Resource) {
  if (!user) return false;
  const decision = permissionDecision(user.role, action);
  return decision === 'grant' || ((decision === 'author' || decision === 'beta') && Boolean(resource?.assigneeIds?.includes(user.id)));
}
