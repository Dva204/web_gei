import { apiRoute, apiSuccess } from '@/server/http/response';
import { requireUser } from '@/server/auth/session';
import { writeContext } from '@/server/catalog/common';
import { listAdminStories, saveAdminStory } from '@/server/catalog/stories';
export const runtime = 'nodejs';
export const GET = apiRoute(async (request, context) =>
  apiSuccess(
    await listAdminStories(
      await requireUser(request),
      new URL(request.url).searchParams,
    ),
    context,
  ),
);
export const POST = apiRoute(async (request, context) => {
  const { user, input } = await writeContext(request);
  return apiSuccess(await saveAdminStory(user, input), context, 201);
});
