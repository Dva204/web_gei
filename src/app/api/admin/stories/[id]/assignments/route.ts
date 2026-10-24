import { apiRoute, apiSuccess } from '@/server/http/response';
import { writeContext } from '@/server/catalog/common';
import { assignAdminStory } from '@/server/catalog/stories';
export const runtime = 'nodejs';
export async function PUT(
  request: Request,
  route: { params: Promise<{ id: string }> },
) {
  return apiRoute(async (request, context) => {
    const { user, input } = await writeContext(request);
    return apiSuccess(
      await assignAdminStory(user, (await route.params).id, input),
      context,
    );
  })(request);
}
