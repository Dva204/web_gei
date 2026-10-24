import { apiRoute, apiSuccess } from '@/server/http/response';
import { writeContext } from '@/server/catalog/common';
import {
  saveTaxonomy,
  trashTaxonomy,
  type TaxonomyKind,
} from '@/server/catalog/taxonomy';
import { ApiError } from '@/server/http/errors';
export const runtime = 'nodejs';
type Context = { params: Promise<{ kind: string; id: string }> };
function kindValue(kind: string): TaxonomyKind {
  if (kind !== 'authors' && kind !== 'genres')
    throw new ApiError('NOT_FOUND', 'Không tìm thấy danh mục.');
  return kind;
}
export async function PUT(request: Request, route: Context) {
  return apiRoute(async (request, context) => {
    const { user, input } = await writeContext(request),
      { kind, id } = await route.params;
    return apiSuccess(
      await saveTaxonomy(user, kindValue(kind), input, id),
      context,
    );
  })(request);
}
export async function DELETE(request: Request, route: Context) {
  return apiRoute(async (request, context) => {
    const { user, input } = await writeContext(request),
      { kind, id } = await route.params;
    return apiSuccess(
      await trashTaxonomy(user, kindValue(kind), id, input),
      context,
    );
  })(request);
}
export async function PATCH(request: Request, route: Context) {
  return apiRoute(async (request, context) => {
    const { user, input } = await writeContext(request),
      { kind, id } = await route.params;
    return apiSuccess(
      await trashTaxonomy(user, kindValue(kind), id, input, true),
      context,
    );
  })(request);
}
