import { apiRoute, apiSuccess } from '@/server/http/response';
import { requestToken, requireUser } from '@/server/auth/session';
import {
  assertTrustedOrigin,
  readAuthJson,
  withPasswordCapacity,
} from '@/server/auth/security';
import { changePassword } from '@/server/auth/account';
export const runtime = 'nodejs';
export const POST = apiRoute(async (request, context) => {
  assertTrustedOrigin(request);
  const user = await requireUser(request);
  const input = await readAuthJson(request);
  return apiSuccess(
    await withPasswordCapacity(() =>
      changePassword(user, requestToken(request), input),
    ),
    context,
  );
});
