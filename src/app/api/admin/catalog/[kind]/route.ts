import { apiRoute, apiSuccess } from '@/server/http/response';
import { requireUser } from '@/server/auth/session';
import { grant, writeContext } from '@/server/catalog/common';
import {
  listTaxonomy,
  saveTaxonomy,
  type TaxonomyKind,
} from '@/server/catalog/taxonomy';
import { ApiError } from '@/server/http/errors';
export const runtime = 'nodejs';
type Context = { params: Promise<{ kind: string }> };
function kindValue(kind: string): TaxonomyKind {
  if (kind !== 'authors' && kind !== 'genres')
    throw new ApiError('NOT_FOUND', 'Không tìm thấy danh mục.');
  return kind;
}
export async function GET(request: Request, route: Context) {
  return apiRoute(async (request, context) => {
    const user = await requireUser(request);
    // Authors need available taxonomy to edit their assigned draft.
    if (!['admin', 'editor', 'author'].includes(user.role))
      grant(user, 'taxonomy.manage');
    return apiSuccess(
      await listTaxonomy(
        kindValue((await route.params).kind),
        new URL(request.url).searchParams,
      ),
      context,
    );
  })(request);
}
export async function POST(request: Request, route: Context) {
  return apiRoute(async (request, context) => {
    const { user, input } = await writeContext(request);
    return apiSuccess(
      await saveTaxonomy(user, kindValue((await route.params).kind), input),
      context,
      201,
    );
  })(request);
}
