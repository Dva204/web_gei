import { apiRoute, apiSuccess } from '@/server/http/response';
import { requireUser } from '@/server/auth/session';
import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { consumeAuthLimit } from '@/server/auth/rateLimit';
import { updateProfile } from '@/server/auth/account';
export const runtime = 'nodejs';
export const PATCH = apiRoute(async (request, context) => {
  assertTrustedOrigin(request);
  const user = await requireUser(request);
  await consumeAuthLimit('profile-update', user.id, 30);
  return apiSuccess(
    { user: await updateProfile(user, await readAuthJson(request)) },
    context,
  );
});
