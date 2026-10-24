import { apiRoute, apiSuccess } from '@/server/http/response';
import { requireUser } from '@/server/auth/session';
import { writeContext } from '@/server/catalog/common';
import {
  getAdminStory,
  saveAdminStory,
  trashAdminStory,
} from '@/server/catalog/stories';
type Context = { params: Promise<{ id: string }> };
export const runtime = 'nodejs';
export async function GET(request: Request, route: Context) {
  return apiRoute(async (request, context) =>
    apiSuccess(
      await getAdminStory(await requireUser(request), (await route.params).id),
      context,
    ),
  )(request);
}
export async function PUT(request: Request, route: Context) {
  return apiRoute(async (request, context) => {
    const { user, input } = await writeContext(request);
    return apiSuccess(
      await saveAdminStory(user, input, (await route.params).id),
      context,
    );
  })(request);
}
export async function DELETE(request: Request, route: Context) {
  return apiRoute(async (request, context) => {
    const { user, input } = await writeContext(request);
    return apiSuccess(
      await trashAdminStory(user, (await route.params).id, input),
      context,
    );
  })(request);
}
export async function PATCH(request: Request, route: Context) {
  return apiRoute(async (request, context) => {
    const { user, input } = await writeContext(request);
    return apiSuccess(
      await trashAdminStory(user, (await route.params).id, input, true),
      context,
    );
  })(request);
}
